-- هيكلةُ أدِيب العلنيّة: بابٌ آمنٌ يُخرج ما يُنشَر وحدَه (٢٠٢٦-١٠-١٨، طلبه محمد: «فعّل الدالّة»).
--
-- كانت صفحةُ `/structure` تقرأ بمفتاح الخدمة (يرى القاعدةَ كلَّها) ثمّ تقصّ ما يُنشَر في الكود. فصار القصُّ
-- هنا: الدالّةُ لا تُخرج إلّا الحقولَ العلنيّة، فلو أخطأ الكودُ يومًا لم يخرج شيءٌ غيرها. على نمط
-- `get_board_members` لـ«أهل الدفّة».
--
-- **ما يخرج ولماذا يكفي:** الصفوفُ الخامُ التي يبني منها `buildStructure` شجرتَه (النموذجُ نفسُه الذي تبنيه
-- غرفةُ الهيكلة، فلا شجرةٌ ثانية):
--   • المجالسُ والأقسامُ واللجانُ القائمة: معرّفُها واسمُها وأسماءُ أدوار قيادتها وعضويّتها وترتيبُها.
--     **لا** `description` ولا `group_link` (روابطُ مجموعات الواتساب ليست للعامّة).
--   • الأدوار: وصفُها البنيويّ (اسمُها ومجلسُها ونوعُ عضويّتها…)، وهي بنيةٌ لا بياناتُ أشخاص.
--   • المناصبُ السارية لأصحاب العضويّة السارية، بلا حساب النادي (`adeeb_admin`).
--   • الأشخاص: المعرّف، والاسم، والصورة، والجنس، والرابطُ العلنيّ — لا جوّالَ ولا بريدَ ولا غيرَها.
--     والعضويّةُ الساريةُ وحدها (`account_status = 'active'` ولها `joined_date`)، كما تنخل الغرفة.
--
-- **المنحة:** للزائر (`anon`) والداخل (`authenticated`)، فالصفحةُ علنيّة تُبنى بمفتاح anon. ولا فاعلَ يُمرَّر
-- فلا يُوثَق بمعرّفٍ يأتي من المتّصل. والدالّةُ مولودةٌ مغلقة (security_01)، فالمنحةُ هنا صريحة.

create or replace function public.get_public_structure()
returns jsonb
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  with serving as (
    select p.id, p.full_name, p.avatar_url, p.gender, p.account_status, p.public_slug
    from profiles p
    where p.account_status = 'active' and p.joined_date is not null
  ),
  ur as (
    select u.user_id, u.role_name, u.committee_id, u.department_id, u.is_acting
    from user_roles u
    join serving s on s.id = u.user_id
    where u.is_active = true and u.role_name <> 'adeeb_admin'
  )
  select jsonb_build_object(
    'councils', coalesce((select jsonb_agg(jsonb_build_object(
        'id', c.id, 'name_ar', c.name_ar, 'head_role_name', c.head_role_name)) from councils c), '[]'::jsonb),
    'departments', coalesce((select jsonb_agg(jsonb_build_object(
        'id', d.id, 'name_ar', d.name_ar, 'display_order', d.display_order)) from departments d where d.is_active), '[]'::jsonb),
    'committees', coalesce((select jsonb_agg(jsonb_build_object(
        'id', m.id, 'committee_name_ar', m.committee_name_ar, 'department_id', m.department_id, 'council_id', m.council_id,
        'leader_role_name', m.leader_role_name, 'member_role_name', m.member_role_name)) from committees m where m.is_active), '[]'::jsonb),
    'roles', coalesce((select jsonb_agg(jsonb_build_object(
        'id', r.id, 'role_name', r.role_name, 'role_name_ar', r.role_name_ar, 'council_type', r.council_type,
        'is_elected', r.is_elected, 'membership_kind', r.membership_kind, 'vote_weight', r.vote_weight,
        'holder_uniqueness', r.holder_uniqueness, 'home_committee_id', r.home_committee_id,
        'prerequisite_role_name', r.prerequisite_role_name, 'requires_membership', r.requires_membership)) from roles r), '[]'::jsonb),
    'user_roles', coalesce((select jsonb_agg(to_jsonb(ur)) from ur), '[]'::jsonb),
    'profiles', coalesce((select jsonb_agg(to_jsonb(s)) from serving s), '[]'::jsonb)
  );
$$;

comment on function public.get_public_structure() is
  'هيكلة أدِيب العلنيّة (/structure): الحقول المنشورة وحدها. للزائر والداخل. ٢٠٢٦-١٠-١٨';

revoke execute on function public.get_public_structure() from public;
-- الصفحةُ علنيّةٌ تُبنى بمفتاح anon، فالزائرُ والداخلُ كلاهما يقرأ.
grant execute on function public.get_public_structure() to anon, authenticated;
