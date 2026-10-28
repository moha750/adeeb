-- طُبّق ٢٠٢٦-١٠-٢٠ بموافقة محمد، بعد نشر الكود الذي يقرأ المحادثةَ من `contact_turns` (f9e40e0):
-- الأعمدةُ الثلاثة صارت أدوارًا، ولا يقرؤها الموقعُ الجديد. والدالّةُ تُعاد بلا كتابتها.
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
  update contact_messages set status = 'replied', updated_at = now() where id = p_id;
  v_mail := enqueue_email(
    'contact.reply', v_row.email, null,
    jsonb_build_object('name', v_row.name, 'reply', v_reply, 'original', v_orig,
                       'subject', v_row.subject, 'sentAt', v_orig_at),
    'contact:' || p_id::text || ':' || md5(v_reply), null, p_reply_to);
  return jsonb_build_object('ok', true, 'email_id', v_mail);
end;
$$;

alter table public.contact_messages
  drop column reply_message,
  drop column replied_by,
  drop column replied_at;
