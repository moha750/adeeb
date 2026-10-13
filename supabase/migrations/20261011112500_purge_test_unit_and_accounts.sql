-- محوُ «قسم الاختبار» ولجنته وحساباتِ التجربة كلِّها (قرار المالك ٢٠٢٦-١٠-١١: «أحذف بشكلٍ
-- نهائيٍّ وجذريٍّ من كلّ مكان … قسم الاختبار بلجانه فهي كانت مجرّد تجربة»، ثمّ اختار أن تُحذف
-- الحساباتُ التجريبيّةُ الاثنا عشر كلُّها معه).
--
-- ما يُمحى:
--   (١) انتخاباتُ «الميدان الحيّ» الثلاثة على الوحدتين (`ELECTIONS-SIM.md`) بمرشّحيها وأصواتها
--       وسجلّها وإشعاراتها. والأصواتُ محميّةٌ بحارسٍ يُعطَّل لحظتَها ثمّ يعود.
--   (٢) مهمّةُ تجربةٍ واحدة أنشأها `test4` في لجنةٍ حقيقيّة («خبر الجديد»)، بإسنادها.
--   (٣) الحساباتُ الاثنا عشر (`EXIT-TEST-SEATS.md`) بوصفة `20261009112814`: السجلُّ والزيارات
--       والرموز يدويًّا (لا مفتاحَ لها)، ثمّ الملفُّ (يجرّ المقاعدَ والأرشيفَ والإنذاراتِ والأوسمةَ
--       والتطوّعَ بمفاتيح CASCADE)، ثمّ مستخدمُ المصادقة.
--   (٤) «لجنة الاختبار» (28) ثمّ «قسم الاختبار» (13).
--
-- وملفّا الترشّح في `election-files` حُذفا بواجهة التخزين لا من الجدول (يمنعه `protect_delete`).
-- والحارسان في أوّله يوقفان كلَّ شيءٍ إن مسّ الحذفُ حقيقيًّا: مقعدًا في الوحدتين لغير حسابِ
-- تجربة، أو أثرًا لحسابِ تجربةٍ في انتخابٍ غيرِ الثلاثة.

do $$
declare
  v_emails constant text[] := array[
    'thead@adeeb.club', 'tleader@adeeb.club', 'tdeputy@adeeb.club', 'thr@adeeb.club', 'tqa@adeeb.club',
    'test1@adeeb.club', 'test2@adeeb.club', 'test3@adeeb.club', 'test4@adeeb.club', 'test5@adeeb.club',
    'tuser@adeeb.club', 'tvolunteer@adeeb.club'];
  v_ids uuid[];
  v_id_texts text[];
  v_elections uuid[];
  v_titles text[];
  v_paths text[];
begin
  select coalesce(array_agg(id), '{}') into v_ids from auth.users where email = any (v_emails);
  select coalesce(array_agg(id::text), '{}') into v_id_texts from unnest(v_ids) id;
  select coalesce(array_agg(id), '{}') into v_elections
  from public.elections where target_committee_id = 28 or target_department_id = 13;

  -- الحارسان
  if exists (select 1 from public.user_roles
             where (committee_id = 28 or department_id = 13) and not (user_id = any (v_ids))) then
    raise exception 'في وحدتَي الاختبار مقعدٌ لحسابٍ غير تجريبيّ: لا حذف.';
  end if;
  if exists (select 1 from public.election_candidates where user_id = any (v_ids) and not (election_id = any (v_elections)))
     or exists (select 1 from public.election_votes where voter_id = any (v_ids) and not (election_id = any (v_elections)))
     or exists (select 1 from public.election_audit_log where actor_id = any (v_ids) and not (election_id = any (v_elections))) then
    raise exception 'لحسابٍ تجريبيٍّ أثرٌ في انتخابٍ حقيقيّ: لا حذف.';
  end if;

  -- (١) الانتخابات الثلاثة
  alter table public.election_votes disable trigger votes_immutable_del;
  delete from public.election_votes where election_id = any (v_elections);
  alter table public.election_votes enable trigger votes_immutable_del;
  update public.elections set winner_candidate_id = null where id = any (v_elections);
  delete from public.elections where id = any (v_elections);

  -- (٢) مهمّة التجربة
  delete from public.tasks where created_by = any (v_ids);

  -- (٣) الحسابات: عنوانُ صفحة العضو العلنيّة «الاسم، أديب»، ومسارُها `/m/` بمعرّفه مُرمَّزًا
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

  -- (٤) الوحدتان
  delete from public.committees where id = 28;
  delete from public.departments where id = 13;
end $$;
