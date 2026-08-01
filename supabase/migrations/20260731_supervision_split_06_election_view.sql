-- فصل الإشراف عن الانتماء — المرحلة ٢ (تتمّة): قارئٌ كان يسأل الصفّ القديم
--
-- `has_election_view_permission` تمنح مشرف الموارد الاطّلاع على انتخاب اللجنة التي يشرف
-- عليها. كانت تقرؤها من `user_roles.committee_id` — وذاك بعد الفصل إدارتُه لا لجنتُه،
-- فالشرط لا يتحقّق أبدًا ويسقط الاطّلاع صامتًا. المعنى نفسه يُقرأ الآن من جدول الإشراف.
--
-- والقصرُ على إدارة الموارد باقٍ كما كان — لكن بلا اسمٍ محفور: تقوله `member_role_name`.

create or replace function public.has_election_view_permission(p_user uuid, p_election uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    exists (
      select 1
      from user_roles ur
      join roles r on r.id = ur.role_id
      where ur.user_id = p_user and ur.is_active
        and r.role_name = 'president_advisor'
    )
    or exists (
      select 1
      from committee_supervision cs
      join committees u on u.id = cs.unit_id and u.member_role_name = 'hr_admin_member'
      join elections e on e.id = p_election
      where cs.supervisor_id = p_user
        and e.target_committee_id is not null
        and cs.committee_id = e.target_committee_id
    );
$function$;
