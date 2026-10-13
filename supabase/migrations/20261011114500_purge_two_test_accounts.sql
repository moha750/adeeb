-- محوُ حسابَي تجربةٍ بقيا بعد `20261011112500` (أمر المالك ٢٠٢٦-١٠-١١: «أحذفهم»):
--   • `volunteer.test@test.adeeb.club` («متطوّع تجريبيّ»، ٢٠٢٦-٠٨-١٥)
--   • `marma.apps@gmail.com` («تجربة»، ٢٠٢٦-٠٩-١٤)
-- كلاهما متطوّعٌ سابق بلا مقعدٍ ولا شهادة. بوصفة `20261009112814`: السجلُّ والزيارات والرموز
-- يدويًّا، ثمّ الملفُّ (يجرّ صفةَ التطوّع وطلبَه ورغباتِه بمفاتيح CASCADE)، ثمّ مستخدمُ المصادقة.
-- والحارسُ يوقفه إن لم يطابق المعرّفُ بريدَه، أو صار لأحدهما مقعدٌ أو شهادة.

do $$
declare
  v_ids constant uuid[] := array['a6cdba34-f0a8-48b7-95b7-f4af5839d939', '5cee9862-739f-46a1-8b50-e64cdeb60cf5']::uuid[];
  v_emails constant text[] := array['volunteer.test@test.adeeb.club', 'marma.apps@gmail.com'];
  v_id_texts text[] := array['a6cdba34-f0a8-48b7-95b7-f4af5839d939', '5cee9862-739f-46a1-8b50-e64cdeb60cf5'];
  v_titles text[];
  v_paths text[];
begin
  if exists (select 1 from auth.users u where u.id = any (v_ids) and not (u.email = any (v_emails)))
     or exists (select 1 from public.user_roles where user_id = any (v_ids))
     or exists (select 1 from public.participation_certificates where user_id = any (v_ids))
     or exists (select 1 from public.experience_certificates where user_id = any (v_ids)) then
    raise exception 'الحسابان ليسا كما فُحصا (بريدٌ مختلف، أو مقعد، أو شهادة): لا حذف.';
  end if;

  select coalesce(array_agg(p.full_name || '، أديب'), '{}'),
         coalesce(array_agg('/m/' || (
           select string_agg(case when ch ~ '[A-Za-z0-9-]' then ch
                                  else regexp_replace(upper(encode(convert_to(ch, 'UTF8'), 'hex')), '(..)', '%\1', 'g') end,
                             '' order by i)
           from regexp_split_to_table(p.public_slug, '') with ordinality t(ch, i)
         ) || '($|[?#/])') filter (where p.public_slug is not null), '{}')
  into v_titles, v_paths
  from public.profiles p where p.id = any (v_ids);

  delete from public.activity_log where user_id = any (v_ids) or target_id = any (v_id_texts);
  delete from public.site_pageviews v
  where v.page_title = any (v_titles) or exists (select 1 from unnest(v_paths) r where v.page_url ~ r);
  delete from public.profiles where id = any (v_ids);
  delete from auth.refresh_tokens where user_id = any (v_id_texts);
  delete from auth.users where id = any (v_ids);
end $$;
