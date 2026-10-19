-- حسابُ أدِيب المؤسسيّ على ثلاثة أوجه (قرار المالك ٢٠٢٦-١٠-١٨)
--   المرآة: إشرافٌ وإحصاءٌ للقراءة · الوصيّ: يرعى ما يملكه النادي ويرثه (الاستبيانات والباركود)
--   · العنوان: ما يُوجَّه إلى أدِيب يصله، وما يقوله أدِيب يخرج منه (التواصل والنشرة).
-- والسلطةُ على الأشخاص للمقاعد بالدستور، والمحتوى اليوميّ لأصحاب مقاعده؛ فلا يحملهما الحساب.

-- ١) لا يبقى لـ adeeb_admin إلّا ثماني قدرات
delete from role_permissions rp
 using permissions p
 where p.id = rp.permission_id
   and rp.role_name = 'adeeb_admin'
   and p.permission_key not in (
     'oversee_irfan', 'oversee_qr', 'view_site_stats', 'view_watchtower',   -- المرآة
     'manage_surveys', 'use_qr_generator',                                  -- الوصيّ
     'manage_contact', 'manage_newsletter'                                  -- العنوان
   );

-- ٢) إشرافُ عِرفان في حساب أدِيب وحده
delete from role_permissions rp
 using permissions p
 where p.id = rp.permission_id
   and p.permission_key = 'oversee_irfan'
   and rp.role_name = 'club_president';

-- ٣) يدُ رسائل التواصل: الإدارةُ التنفيذيّة (الرئيس التنفيذيّ وأعضاؤها)، والحسابُ عنوانُها
delete from role_permissions rp
 using permissions p
 where p.id = rp.permission_id
   and p.permission_key = 'manage_contact'
   and rp.role_name not in ('adeeb_admin', 'executive_council_president', 'exec_admin_member');

insert into role_permissions (role_name, permission_id)
select r, p.id
  from permissions p, unnest(array['executive_council_president', 'exec_admin_member']) r
 where p.permission_key = 'manage_contact'
on conflict do nothing;

-- ٤) الردُّ باسم النادي وحده: لا اسمَ للرادّ في البريد، و«ردَّ على هذا البريد» يصل بريدَ النادي.
--    ومن ردَّ يبقى في الصفّ (replied_by) أثرًا داخليًّا.
--    الدالّةُ القديمة (بخمسة معاملات، اسمُ الرادّ وبريدُه) تبقى حتى تُنشر الدفعة، لأنّ الموقع المنشور
--    يناديها؛ وحذفُها في `supabase/pending/drop_old_reply_contact_message.sql` بعد النشر.

create function reply_contact_message(p_actor uuid, p_id uuid, p_reply text, p_reply_to text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
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
      'sentAt', v_row.created_at),
    'contact:' || p_id::text || ':' || md5(v_reply),
    null,
    p_reply_to);

  return jsonb_build_object('ok', true, 'email_id', v_mail);
end;
$$;

revoke all on function reply_contact_message(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function reply_contact_message(uuid, uuid, text, text) to service_role;
