-- رسائلُ التواصل محادثةً (٢٠٢٦-١٠-١٩): كلُّ ردٍّ منّا وكلُّ ردٍّ من المُرسِل «دورٌ» في `contact_turns`.
-- كان الردُّ عمودًا واحدًا (`reply_message`) يمحو الردُّ الجديدُ سابقَه، ولا مكانَ لردّ المُرسِل علينا.
-- والآن: «ردَّ على هذا البريد» يذهب إلى `r+<معرّف الرسالة>@<نطاق الاستقبال>`، فيستقبله Resend ويطرق
-- `/api/email/inbound`، فيُكتب دورًا داخلًا (`contact_inbound_turn`) وتعود الرسالةُ «جديدة».
--
-- والأعمدةُ القديمة (`reply_message`، `replied_by`، `replied_at`) تبقى حتى يُنشر الكودُ الجديد، لأنّ الموقع
-- المنشور يقرؤها؛ وحذفُها في `supabase/pending/contact_03_drop_reply_columns.sql`.

create table public.contact_turns (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.contact_messages(id) on delete cascade,
  direction text not null check (direction in ('in', 'out')),
  body text not null check (char_length(btrim(body)) between 1 and 20000),
  -- من ردَّ منّا (أثرٌ داخليّ لا يخرج في البريد)
  actor uuid references auth.users(id) on delete set null,
  -- من أيّ عنوانٍ ردَّ المُرسِل (قد يخالف عنوانَ رسالته الأولى)
  from_email text,
  -- معرّفُ الرسالة الواردة في Resend: الطرقةُ تُعاد، والدورُ لا يُكتب مرّتين
  provider_id text unique,
  created_at timestamptz not null default now(),
  check ((direction = 'out') = (provider_id is null))
);

create index contact_turns_message on public.contact_turns (message_id, created_at);

alter table public.contact_turns enable row level security;
revoke all on public.contact_turns from public, anon, authenticated;

-- الردودُ السابقة أدوارًا (آخرُ ردٍّ لكلّ رسالة، فما قبله محاه العمود)
insert into public.contact_turns (message_id, direction, body, actor, created_at)
select id, 'out', reply_message, replied_by, coalesce(replied_at, updated_at, created_at)
  from public.contact_messages
 where reply_message is not null and btrim(reply_message) <> '';

-- الردُّ منّا: دورٌ خارج، ورسالتُه في صادر البريد، في معاملةٍ واحدة. والأعمدةُ القديمة تُكتب معه حتى تُحذف.
create or replace function public.reply_contact_message(p_actor uuid, p_id uuid, p_reply text, p_reply_to text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row   contact_messages%rowtype;
  v_reply text := btrim(coalesce(p_reply, ''));
  v_mail  bigint;
  v_orig    text;
  v_orig_at timestamptz;
begin
  if char_length(v_reply) < 2 then
    return jsonb_build_object('ok', false, 'message', 'اكتب نصّ الردّ أوّلًا.');
  end if;

  select * into v_row from contact_messages where id = p_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'message', 'لا وجود لهذه الرسالة.');
  end if;

  -- الرسالةُ المقتبسة في البريد آخرُ ما كتبه المُرسِل: ردُّه الأخير إن ردَّ، وإلّا رسالتُه الأولى.
  select body, created_at into v_orig, v_orig_at
    from contact_turns where message_id = p_id and direction = 'in'
   order by created_at desc limit 1;
  if v_orig is null then v_orig := v_row.message; v_orig_at := v_row.created_at; end if;

  insert into contact_turns (message_id, direction, body, actor) values (p_id, 'out', v_reply, p_actor);

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
      'original', v_orig,
      'subject', v_row.subject,
      'sentAt', v_orig_at),
    'contact:' || p_id::text || ':' || md5(v_reply),
    null,
    p_reply_to);

  return jsonb_build_object('ok', true, 'email_id', v_mail);
end;
$$;

-- ردُّ المُرسِل علينا: دورٌ داخل، والرسالةُ تعود «جديدة» فتظهر في عدّاد ما لم يُقرأ.
create or replace function public.contact_inbound_turn(p_message_id uuid, p_from text, p_body text, p_provider_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row  contact_messages%rowtype;
  v_body text := btrim(coalesce(p_body, ''));
  v_id   uuid;
begin
  if p_provider_id is null or btrim(p_provider_id) = '' then
    return jsonb_build_object('ok', false, 'reason', 'no_provider_id');
  end if;
  select * into v_row from contact_messages where id = p_message_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'unknown_message');
  end if;
  if v_body = '' then
    return jsonb_build_object('ok', false, 'reason', 'empty');
  end if;

  insert into contact_turns (message_id, direction, body, from_email, provider_id)
  values (p_message_id, 'in', left(v_body, 20000), nullif(lower(btrim(p_from)), ''), p_provider_id)
  on conflict (provider_id) do nothing
  returning id into v_id;

  if v_id is null then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;

  update contact_messages set status = 'new', updated_at = now() where id = p_message_id;

  return jsonb_build_object('ok', true, 'name', v_row.name, 'subject', v_row.subject);
end;
$$;

revoke all on function public.reply_contact_message(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.reply_contact_message(uuid, uuid, text, text) to service_role;
revoke all on function public.contact_inbound_turn(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.contact_inbound_turn(uuid, text, text, text) to service_role;
