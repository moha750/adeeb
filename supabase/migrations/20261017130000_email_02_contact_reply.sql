-- نظامُ البريد (٢): ردُّ رسائل التواصل يمرّ بالصادر (٢٠٢٦-١٠-١٧، المرحلة ٣ في v2/EMAIL-SYSTEM.md).
--
-- كان الردُّ يُرسَل من دالّة حافةٍ (`send-contact-reply`) بمفتاحٍ وقالبٍ خاصّين، ثمّ يُسجَّل بعد الإرسال.
-- صار فعلًا واحدًا في القاعدة: يُسجَّل الردُّ وتُكتب رسالتُه في الصادر **في معاملةٍ واحدة**، والمُرسِلُ
-- الواحدُ يرسلها بإعاداته وسجلّه. ودالّةُ الحافة تُحذف في مرحلة الحذف.

-- «ردَّ على هذا البريد» يصل الرادَّ نفسَه لا صندوقَ «لا-ردّ».
alter table public.email_outbox add column if not exists reply_to text;
alter table public.email_outbox drop constraint if exists email_outbox_reply_to_shape;
alter table public.email_outbox add constraint email_outbox_reply_to_shape
  check (reply_to is null or reply_to ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- البابُ نفسُه بمُعاملٍ زائد. يُسقَط القديم أوّلًا: مُعاملٌ جديدٌ بافتراضٍ يصنع دالّةً ثانيةً لا يُبدّل الأولى.
drop function if exists public.enqueue_email(text, text, uuid, jsonb, text, timestamptz);
create or replace function public.enqueue_email(
  p_kind    text,
  p_to      text,
  p_user    uuid  default null,
  p_data    jsonb default '{}'::jsonb,
  p_dedupe  text  default null,
  p_expires timestamptz default null,
  p_reply_to text default null
) returns bigint
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_id bigint;
begin
  insert into email_outbox (kind, to_email, to_user, data, dedupe_key, expires_at, reply_to)
  values (p_kind, lower(btrim(p_to)), p_user, coalesce(p_data, '{}'::jsonb), p_dedupe, p_expires,
          nullif(lower(btrim(coalesce(p_reply_to, ''))), ''))
  on conflict (dedupe_key) do nothing
  returning id into v_id;

  if v_id is null and p_dedupe is not null then
    select id into v_id from email_outbox where dedupe_key = p_dedupe;
  end if;
  return v_id;
end;
$$;

revoke all on function public.enqueue_email(text, text, uuid, jsonb, text, timestamptz, text) from public, anon, authenticated;

-- ══ الردّ ═════════════════════════════════════════════════════════════════════
-- للخادم وحده: سلطةُ الإنسان (`manage_contact`) تُفحص في الإجراء قبل النداء، والعنوانُ يُقرأ من الصفّ
-- فلا يُمرَّر من الخارج. ومفتاحُ التكرار من الرسالة ونصّ الردّ: نقرتان على «أرسل» رسالةٌ واحدة.
create or replace function public.reply_contact_message(
  p_actor uuid,
  p_id uuid,
  p_reply text,
  p_responder_name text default null,
  p_responder_email text default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_row   contact_messages%rowtype;
  v_reply text := btrim(coalesce(p_reply, ''));
  v_mail  bigint;
begin
  if char_length(v_reply) < 2 then
    return jsonb_build_object('ok', false, 'message', 'اكتب نصّ الردّ أوّلًا.');
  end if;

  select * into v_row from contact_messages where id = p_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'message', 'لا وجود لهذه الرسالة.');
  end if;

  update contact_messages
     set status = 'replied', reply_message = v_reply, replied_by = p_actor,
         replied_at = now(), updated_at = now()
   where id = p_id;

  v_mail := enqueue_email(
    'contact.reply',
    v_row.email,
    null,
    jsonb_build_object(
      'name', v_row.name,
      'reply', v_reply,
      'original', v_row.message,
      'subject', v_row.subject,
      'sentAt', v_row.created_at,
      'responder', nullif(btrim(coalesce(p_responder_name, '')), '')),
    'contact:' || p_id::text || ':' || md5(v_reply),
    null,
    p_responder_email);

  return jsonb_build_object('ok', true, 'email_id', v_mail);
end;
$$;
revoke all on function public.reply_contact_message(uuid, uuid, text, text, text) from public, anon, authenticated;
