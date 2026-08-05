-- ══════════════════════════════════════════════════════════════════════════════
-- م٠ من مشروع «الحسابُ للجميع والعضويّةُ تُنال» — **مصادَقٌ ≠ عضو**
--
-- القاعدةُ كلُّها كُتبت على معادلةٍ صامتة: «من دخل فهو منّا». وكانت صادقةً يوم كان
-- الحسابُ لا يُفتح إلّا لعضو. ثمّ فُتح بابُ الحجز للزوّار (`book_activity_seat`
-- و`visitors`)، فصار في `auth.users` ثلاثُمئةٍ ونيّف نصفُهم ليسوا أعضاء — والمعادلةُ
-- باقيةٌ في السياسات كما هي. وهذا الملفّ يفصل ما خلطته: **الدخولُ ليس انتماءً**.
--
-- ولم يُضيَّق شيءٌ إلّا بعد جردٍ كامل: كلُّ قراءةٍ لهذه الجداول في V2 تمرّ بمفتاح
-- الخدمة (يتخطّى RLS أصلًا) إلّا موضعًا واحدًا — `BookingWidget` يقرأ صفَّ نفسه،
-- وهو مسموحٌ صراحةً أدناه. ولا سياسةَ ولا عرضَ (view) يقرأ `profiles` في تعبيره،
-- فلا سلسلةَ انهيارٍ خلف التضييق.
-- ══════════════════════════════════════════════════════════════════════════════


-- ١) المصدرُ الواحد لسؤال «أهذا عضو؟» على مستوى القاعدة
--
-- اليومَ العضويّةُ = أن يكون لك صفٌّ في `profiles` (فالزائرُ يسكن `visitors`)، وهذا
-- تعريفُ النظام القائم لا اختراعَ فيه — هو نفسُه ما تقيسه `survey_is_active_member`.
-- ويومَ تتوحّد الهويّة في م١ (فيصير `profiles` بيتَ كلّ صاحبِ حساب) **يُغيَّر جسدُ هذه
-- الدالّة وحدَها** إلى `member_details`/`user_roles`، ولا يُمسّ حرفٌ في السياسات.
-- ولهذا وُلدت: لئلّا يُنثر التعريفُ في عشر سياساتٍ فيتناقضَ يومًا.
--
-- SECURITY DEFINER لأنّها تُنادى من داخل سياسة `profiles` نفسها — فلولا التفويض
-- لَدارت على نفسها.
create or replace function public.is_adeeb_member(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select p_user is not null
     and exists (select 1 from public.profiles p where p.id = p_user);
$$;

comment on function public.is_adeeb_member(uuid) is
  'أعضوٌ هو؟ — المصدر الواحد للسؤال في السياسات. يُغيَّر جسدُها عند توحيد الهويّة (م١) ولا تُغيَّر مناديها.';


-- ٢) `profiles` — القراءةُ لصاحبها وللأعضاء، لا للعالم
--
-- كانت `USING (true)` لدور `public`، ودورُ `anon` يملك `SELECT`؛ والمفتاحُ العلنيّ
-- يُشحن في حزمة المتصفّح فليس سرًّا. أي أنّ اسمَ كلّ عضوٍ وبريدَه وجوّالَه وجنسَه
-- كان مقروءًا لأيّ أحد. تُقصَر الآن على `authenticated`، ثمّ على العضويّة.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()                       -- صفُّك لك ولو لم تكن عضوًا (زائرٌ يقرأ نفسه)
    or public.is_adeeb_member(auth.uid()) -- والعضوُ يرى إخوته كما كان
  );


-- ٣) `profiles` — الإدراجُ بقدرةٍ لا بادّعاء
--
-- كان `id = auth.uid()` يكفي: فأيُّ زائرٍ من المئة والتسعة والأربعين يستطيع أن يُدرج
-- لنفسه صفًّا في `profiles` فيظهرَ في كشف الأعضاء (`members/data.ts` يقرأ الجدول كلَّه).
-- وليس في V2 موضعٌ واحد يُدرج في `profiles` بمفتاح المستخدم — كلُّها بمفتاح الخدمة.
-- فالعضوُ يُصنَع من اللوحة بقدرة، لا يُعلنه المرءُ عن نفسه.
drop policy if exists profiles_insert_policy on public.profiles;
create policy profiles_insert_policy on public.profiles
  for insert to authenticated
  with check (check_user_permission(auth.uid(), 'manage_member_data'));


-- ٤) `user_roles` — الهيكلُ الإداريّ للأعضاء
--
-- كانت `auth.role() = 'authenticated'` — أي أنّ أيّ حسابٍ يقرأ من في أيّ لجنةٍ وبأيّ
-- منصب. وسياسةُ «صفوفُك لك» (`user_roles_select_own`) باقيةٌ كما هي، وعليها تتّكئ
-- سياساتٌ أخرى تفحص دورَ المنادي داخل تعبيرها — فلا تنكسر.
drop policy if exists user_roles_select_all on public.user_roles;
create policy user_roles_select_all on public.user_roles
  for select to authenticated
  using (public.is_adeeb_member(auth.uid()));


-- ٥) `elections` — الانتخاباتُ شأنُ أهلها
--
-- كانت `true` لكلّ مصادَق. والتصويتُ والترشّحُ يجريان بمفتاح المستخدم (سياسات
-- `votes_insert_self` و`candidates_insert_self`)، فلا بدّ أن يبقى العضوُ قارئًا.
drop policy if exists elections_select_all on public.elections;
create policy elections_select_all on public.elections
  for select to authenticated
  using (public.is_adeeb_member(auth.uid()));


-- ٦) `file_downloads` — سجلٌّ إحصائيّ لا يُقرأ إلّا بقدرة
--
-- كانت قراءتُه مباحةً لكلّ مصادَق. والكتابةُ فيه تبقى مفتوحةً للزائر (هي عدّادٌ لا
-- سرّ). وقياسُه الآن كأخواته في التحليلات (`site_pageviews` و`site_visitors`).
drop policy if exists file_downloads_select_auth on public.file_downloads;
create policy file_downloads_select_auth on public.file_downloads
  for select to authenticated
  using (current_user_is_admin());
