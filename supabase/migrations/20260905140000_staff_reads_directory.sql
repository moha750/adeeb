-- حاملُ المفاتيح يقرأ الدليلَ ولو لم ينضمّ (تصحيحُ خلطٍ بين العضويّة والتفويض)
--
-- ## العلّة، مقيسةً
-- ثلاثُ سياساتِ قراءةٍ تسأل `is_adeeb_member(auth.uid())`: `profiles` و`user_roles`
-- و`elections`. وحدُّ العضويّة `joined_date`. فحسابُ النادي «أَدِيب» — أُنشئ ٢٠٢٦-٠٩-٠٥
-- ويملك مفاتيحَ النظام كلَّها ولا عضويّةَ له — يقرأ صفَّه وحدَه. وأثرُه رُئي في أوّل شاشة:
-- إشرافُ الباركود يعرض الباركودات وأصحابُها «صاحبٌ محذوف»، لأنّ الأسماءَ لم تُقرأ أصلًا.
--
-- ## والقانون: التفويضُ قدرةٌ والعضويّةُ واقعة
-- خلطُهما هو العطب. والعضويّةُ تبقى شرطًا لِما هو عضويّةٌ حقًّا (الترشّحُ والتصويتُ وبطاقةُ
-- العضويّة)، أمّا **قراءةُ الدليل** فهي لمن يعمل في اللوحة: عضوًا كان أو حسابَ نادٍ.
--
-- ولا توسيعَ في المدى العمليّ: كلُّ حاملي المفاتيح اليومَ أعضاءٌ أصلًا، فلا يقرأ بهذا أحدٌ
-- ما لم يكن يقرؤه أمسِ — إلّا الحسابَ الذي أُنشئ لهذا الغرض بعينه.

begin;

-- **موظَّفٌ في اللوحة**: عضوٌ، أو حاملُ مفتاحٍ واحدٍ فأكثر (بدوره أو بمنحٍ فرديّ قائم).
-- والمنعُ الفرديُّ لا يُستثنى هنا: من مُنع مفتاحًا وبقي له غيرُه يبقى موظَّفًا.
create or replace function public.is_adeeb_staff(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.is_adeeb_member(p_user), false)
      or exists (
        select 1 from public.user_roles ur
        join public.role_permissions rp on rp.role_name = ur.role_name
        where ur.user_id = p_user and ur.is_active
      )
      or exists (
        select 1 from public.user_specific_permissions usp
        where usp.user_id = p_user and usp.is_granted
          and (usp.expires_at is null or usp.expires_at > now())
      );
$$;

comment on function public.is_adeeb_staff(uuid) is
  'عضوٌ في النادي أو حاملُ مفتاحٍ في اللوحة. لقراءة الدليل لا للعضويّة: الترشّحُ والتصويتُ يبقيان على is_adeeb_member.';

grant execute on function public.is_adeeb_staff(uuid) to authenticated;

-- ═══ السياساتُ الثلاث: يُبدَّل شرطُ العضويّة بشرط العمل، ولا يُمسّ ما عداه ═══
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using ((id = (select auth.uid())) or public.is_adeeb_staff((select auth.uid())));

drop policy if exists user_roles_select_all on public.user_roles;
create policy user_roles_select_all on public.user_roles
  for select to authenticated
  using (public.is_adeeb_staff((select auth.uid())));

drop policy if exists elections_select_all on public.elections;
create policy elections_select_all on public.elections
  for select to authenticated
  using (public.is_adeeb_staff((select auth.uid())));

commit;
