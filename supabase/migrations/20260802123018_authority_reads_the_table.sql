-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260802123018   الاسم: authority_reads_the_table

-- الحُكم يُقرأ من `position_authority` — والدوالّ صارت قارئةً لا حاكمة.

-- (١) أيبلغ هذا المُنفّذ هذا المقعد؟ — بالجدول وحده. (كانت قدرةً + قيادةَ وحدة.)
create or replace function public.can_assign_role(p_actor uuid, p_role_name text, p_committee integer)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from user_roles ur
    join position_authority pa on pa.role_name = ur.role_name
    where ur.user_id = p_actor and ur.is_active
      and p_role_name = any (pa.target_roles)
      -- ما كان «في وحدته» لا يُسنَد إلّا في الوحدة التي يقودها هو
      and (not (p_role_name = any (pa.own_unit_roles))
           or exists (
             select 1 from committees c
             where c.id = p_committee
               and c.leader_role_name = ur.role_name
               and ur.committee_id = c.id
           ))
  );
$function$;

-- (٢) أيسحب هذا المُنفّذ هذا الشخصَ من موضعه؟ — السحب تابعٌ للإجلاس: لا يُشترط بلوغُ
--     المقعد القديم، إنّما يُسمّى الممنوع صراحةً. ورئيس النادي لا تطوله يدٌ من هنا.
create or replace function public.can_take_position_from(p_actor uuid, p_target uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select not exists (
    select 1
    from user_roles v
    where v.user_id = p_target and v.is_active
      and (
        v.role_name = 'club_president'
        or exists (
          select 1
          from user_roles a
          join position_authority pa on pa.role_name = a.role_name
          where a.user_id = p_actor and a.is_active
            and v.role_name = any (pa.blocked_roles)
        )
      )
  );
$function$;

comment on function public.can_take_position_from(uuid, uuid) is
  'أيسحب المُنفّذ هذا الشخص من موضعه؟ الممنوع يُسمّى في position_authority.blocked_roles، ورئيس النادي محجوبٌ عن الجميع.';

-- (٣) بِركةُ المنتقي — من يجوز إسنادهم. وإن سُمّي المقعد طُبّق شرطُه (العضو الإداريّ ← عضو لجنة).
create or replace function public.assignable_members(p_actor uuid, p_role_name text default null)
returns setof uuid
language sql
stable
security definer
set search_path to 'public'
as $function$
  select p.id
  from profiles p
  left join lateral (
    select ur.role_name from user_roles ur
    where ur.user_id = p.id and ur.is_active
    limit 1                                   -- صفٌّ واحدٌ بحكم ثابت «منصبٌ واحدٌ لكلّ شخص»
  ) h on true
  where exists (select 1 from user_roles a join position_authority pa on pa.role_name = a.role_name
                where a.user_id = p_actor and a.is_active)
    and p.account_status = 'active'
    and can_take_position_from(p_actor, p.id)
    and (p_role_name is null
         or coalesce(h.role_name, '') is not distinct from coalesce(
              (select r.prerequisite_role_name from roles r where r.role_name = p_role_name),
              coalesce(h.role_name, '')));
$function$;

comment on function public.assignable_members(uuid, text) is
  'بِركةُ منتقي الإسناد: من لا تحجبه blocked_roles. وإن سُمّي المقعد طُبّق شرطُه (roles.prerequisite_role_name).';

drop function if exists public.assignable_members(uuid);
