-- رموزُ الوحدات في الموقع العامّ (٢٠٢٦-١١-٢٤، بإذن محمد): للأقسام واللجان رمزٌ تختاره الإدارةُ من نافذة تعديل الوحدة في البوّابة
-- (`committees.icon` و`departments.icon`)، ولم تكن الدالّةُ العلنيّة تُخرجه، فكانت «هيكلة أدِيب» وصفحةُ الانضمام ترسمان اللجانَ كلَّها
-- برمزٍ واحدٍ مكرّر. الرمزُ مفتاحُ رسمٍ لا بيانُ شخص، فلا حجبَ عليه. والصلاحيّاتُ باقيةٌ كما هي (`create or replace` لا يمسّها).
create or replace function public.get_public_structure()
 returns jsonb
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
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
        'id', c.id, 'name_ar', c.name_ar, 'head_role_name', c.head_role_name, 'description', c.description)) from councils c), '[]'::jsonb),
    'departments', coalesce((select jsonb_agg(jsonb_build_object(
        'id', d.id, 'name_ar', d.name_ar, 'display_order', d.display_order, 'description', d.description, 'icon', d.icon)) from departments d where d.is_active), '[]'::jsonb),
    'committees', coalesce((select jsonb_agg(jsonb_build_object(
        'id', m.id, 'committee_name_ar', m.committee_name_ar, 'department_id', m.department_id, 'council_id', m.council_id,
        'leader_role_name', m.leader_role_name, 'member_role_name', m.member_role_name, 'description', m.description, 'icon', m.icon)) from committees m where m.is_active), '[]'::jsonb),
    'roles', coalesce((select jsonb_agg(jsonb_build_object(
        'id', r.id, 'role_name', r.role_name, 'role_name_ar', r.role_name_ar, 'council_type', r.council_type,
        'is_elected', r.is_elected, 'membership_kind', r.membership_kind, 'vote_weight', r.vote_weight,
        'holder_uniqueness', r.holder_uniqueness, 'home_committee_id', r.home_committee_id,
        'prerequisite_role_name', r.prerequisite_role_name, 'requires_membership', r.requires_membership)) from roles r), '[]'::jsonb),
    'user_roles', coalesce((select jsonb_agg(to_jsonb(ur)) from ur), '[]'::jsonb),
    'profiles', coalesce((select jsonb_agg(to_jsonb(s)) from serving s), '[]'::jsonb),
    'supervision', coalesce((select jsonb_agg(jsonb_build_object(
        'committee_id', cs.committee_id, 'unit_id', cs.unit_id, 'supervisor_id', cs.supervisor_id))
      from committee_supervision cs join serving s on s.id = cs.supervisor_id), '[]'::jsonb)
  );
$function$;
