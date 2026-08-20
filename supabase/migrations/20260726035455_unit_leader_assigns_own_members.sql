-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260726035455   الاسم: unit_leader_assigns_own_members

-- ============================================================
-- سلطة قائد الوحدة — «الوحدة تقول أيّ دور، والقدرة تقول من يوزّعه»
--
-- كان لِلإسناد بابٌ واحد: قدرة `manage_positions` — سلطة الهيكلة كاملةً (رئيس النادي وحده).
-- وقائدتا الإدارتين (الموارد/الضمان) تحتاجان توزيع **أعضائهما الإداريّين** على اللجان،
-- بلا أن تُفتح لهما المناصب كلّها (قادة · نوّاب · منسّقو أقسام).
--
-- فالحلّ بابٌ ثانٍ **مضبوط** في الدالّة نفسها لا دالّة موازية تُنسَخ فيها الضوابط:
--   • القدرة `assign_unit_members` تقول **من** يملك التوزيع (تُمنَح وتُسحَب من شاشة الصلاحيات).
--   • و`committees.member_role_name` يقول **أيّ دور** بالضبط — فقائدة الموارد لا تبلغ دور
--     الضمان ولا دور قائد لجنة، بلا اسمٍ محفورٍ في الدالّة.
-- ============================================================

-- (١) القدرة
insert into permissions (permission_key, permission_name_ar, description, category)
select 'assign_unit_members', 'توزيع أعضاء الوحدة',
       'قائد الوحدة يُسنِد دور عضوها المُصرَّح به (committees.member_role_name) ويسحبه',
       'membership'
where not exists (select 1 from permissions where permission_key = 'assign_unit_members');

insert into role_permissions (role_id, role_name, permission_id)
select r.id, r.role_name, p.id
from roles r, permissions p
where r.role_name in ('hr_committee_leader', 'qa_committee_leader')
  and p.permission_key = 'assign_unit_members'
  and not exists (select 1 from role_permissions rp where rp.role_id = r.id and rp.permission_id = p.id);

-- (٢) الحَكَم الواحد — تقرؤه `assign_position` و`revoke_position` معًا فلا تفترق الضوابط
create or replace function public.can_assign_role(p_actor uuid, p_role_name text, p_committee integer)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    -- الباب الأوّل: سلطة الهيكلة كاملةً
    check_user_permission(p_actor, 'manage_positions')
    or (
      -- الباب الثاني: قائد وحدةٍ يوزّع دور عضوها
      check_user_permission(p_actor, 'assign_unit_members')
      and exists (
        select 1
        from committees u
        -- الوحدة التي يقودها المُنفّذ فعلًا: صفٌّ حيّ بدورها القياديّ وعليها هي
        join user_roles ur
          on ur.user_id = p_actor and ur.is_active
         and ur.role_name = u.leader_role_name
         and ur.committee_id = u.id
        -- الوحدة المقصودة بالإسناد
        join committees t on t.id = p_committee and t.is_active
        where u.member_role_name = p_role_name
          and (
            -- عضوٌ **في** وحدته (قائد لجنة ← عضو لجنته)
            t.id = u.id
            -- أو **مشرفٌ على** لجان التنفيذيّ (قائد إدارة ← عضوه الإداريّ):
            -- عضو الإدارة `committee_id` عنده = اللجنة المُشرَف عليها لا إدارته
            or (u.council_id = 'administrative' and t.council_id = 'executive')
          )
      )
    );
$$;

revoke execute on function public.can_assign_role(uuid, text, integer) from public, anon;
grant execute on function public.can_assign_role(uuid, text, integer) to authenticated, service_role;

-- (٣) `assign_position` — السلطة تُقرأ من الحَكَم، وبقيّة الضوابط كما هي بلا مساس
create or replace function public.assign_position(p_actor uuid, p_user uuid, p_role integer DEFAULT NULL::integer, p_committee integer DEFAULT NULL::integer, p_department integer DEFAULT NULL::integer, p_replace boolean DEFAULT false, p_notes text DEFAULT NULL::text, p_role_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actor_rank           integer;
  v_target_rank          integer;
  v_role_id              integer;
  v_role_name            text;
  v_needs_committee      boolean;
  v_needs_department     boolean;
  v_no_scope             boolean;
  v_globally_unique      boolean;
  v_per_committee_unique boolean;
  v_per_department_unique boolean;
  v_existing_id          integer;
  v_existing_user        uuid;
  v_other_dept           integer;
  v_row_id               integer;
  v_new_id               integer;
begin
  -- (1) بوّابة أوّليّة: من لا يملك أيّ سلطة إسناد يُردّ هنا قبل أن يعرف شيئًا عن المنصب.
  --     والحكم الدقيق (أيّ دور بالضبط) بعد أن يُعرَف الدور والنطاق — انظر (1ج).
  if not check_user_permission(p_actor, 'manage_positions')
     and not check_user_permission(p_actor, 'assign_unit_members') then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'لا تملك صلاحية إدارة الهيكلة.');
  end if;

  -- رتبة المُنفّذ (بالاسم) — لمنع التصعيد الرأسيّ. الأصغر = الأعلى.
  select min(case r.role_name
      when 'club_president' then 1 when 'president_advisor' then 2
      when 'executive_council_president' then 3 when 'hr_committee_leader' then 4
      when 'qa_committee_leader' then 5 when 'department_head' then 6
      when 'hr_admin_member' then 7 when 'qa_admin_member' then 8
      when 'committee_leader' then 9 when 'activity_coordinator' then 10
      when 'deputy_committee_leader' then 11 when 'committee_member' then 12
      else 99 end)
  into v_actor_rank
  from user_roles ur join roles r on r.id = ur.role_id
  where ur.user_id = p_actor and ur.is_active;

  if not exists (select 1 from profiles where id = p_user) then
    return jsonb_build_object('ok', false, 'code', 'NO_USER', 'message', 'العضو غير موجود.');
  end if;

  -- (1أ) المرجع: الاسم إن جاء، وإلّا الرقم
  if p_role_name is not null then
    select id, role_name, (case role_name
        when 'club_president' then 1 when 'president_advisor' then 2
        when 'executive_council_president' then 3 when 'hr_committee_leader' then 4
        when 'qa_committee_leader' then 5 when 'department_head' then 6
        when 'hr_admin_member' then 7 when 'qa_admin_member' then 8
        when 'committee_leader' then 9 when 'activity_coordinator' then 10
        when 'deputy_committee_leader' then 11 when 'committee_member' then 12
        else 99 end)
    into v_role_id, v_role_name, v_target_rank
    from roles where role_name = p_role_name;
  elsif p_role is not null then
    select id, role_name, (case role_name
        when 'club_president' then 1 when 'president_advisor' then 2
        when 'executive_council_president' then 3 when 'hr_committee_leader' then 4
        when 'qa_committee_leader' then 5 when 'department_head' then 6
        when 'hr_admin_member' then 7 when 'qa_admin_member' then 8
        when 'committee_leader' then 9 when 'activity_coordinator' then 10
        when 'deputy_committee_leader' then 11 when 'committee_member' then 12
        else 99 end)
    into v_role_id, v_role_name, v_target_rank
    from roles where id = p_role;
  else
    return jsonb_build_object('ok', false, 'code', 'NO_ROLE', 'message', 'المنصب غير موجود.');
  end if;

  if v_role_name is null then
    return jsonb_build_object('ok', false, 'code', 'NO_ROLE', 'message', 'المنصب غير موجود.');
  end if;

  -- (1ب) منع التصعيد الرأسيّ: لا يُسنِد المُنفّذ منصبًا أعلى من رتبته (رتبة أصغر = أعلى)
  if v_actor_rank > v_target_rank then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN_LEVEL', 'message', 'لا يمكنك إسناد منصب أعلى من صلاحيتك.');
  end if;

  -- (2) تصنيف النطاق والتفرّد حسب اسم الدور
  v_needs_committee       := v_role_name in ('committee_leader','deputy_committee_leader','committee_member',
                                             'hr_admin_member','qa_admin_member',
                                             'hr_committee_leader','qa_committee_leader');
  v_needs_department      := v_role_name in ('department_head');
  v_no_scope              := v_role_name in ('club_president','president_advisor','executive_council_president','activity_coordinator');
  v_globally_unique       := v_role_name in ('club_president','executive_council_president','hr_committee_leader','qa_committee_leader');
  v_per_committee_unique  := v_role_name in ('committee_leader','deputy_committee_leader','hr_admin_member','qa_admin_member');
  v_per_department_unique := v_role_name in ('department_head');

  if v_no_scope then
    p_committee := null;
    p_department := null;
  end if;

  if v_needs_committee and p_committee is null then
    return jsonb_build_object('ok', false, 'code', 'NEED_COMMITTEE', 'message', 'هذا المنصب يتطلّب تحديد لجنة.');
  end if;
  if v_needs_department and p_department is null then
    return jsonb_build_object('ok', false, 'code', 'NEED_DEPARTMENT', 'message', 'هذا المنصب يتطلّب تحديد قسم.');
  end if;
  if p_committee is not null and not exists (select 1 from committees where id = p_committee) then
    return jsonb_build_object('ok', false, 'code', 'NO_COMMITTEE', 'message', 'اللجنة غير موجودة.');
  end if;
  if p_department is not null and not exists (select 1 from departments where id = p_department) then
    return jsonb_build_object('ok', false, 'code', 'NO_DEPARTMENT', 'message', 'القسم غير موجود.');
  end if;

  -- (1ج) الحكم الدقيق: هل يبلغ المُنفّذ **هذا الدور** في **هذا النطاق**؟
  if not can_assign_role(p_actor, v_role_name, p_committee) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN',
      'message', 'صلاحيتك لا تبلغ هذا المنصب — لا تُسنِد إلّا أعضاء وحدتك.');
  end if;

  if p_committee is not null
     and exists (select 1 from committees where leader_role_name = v_role_name)
     and not exists (select 1 from committees where id = p_committee and leader_role_name = v_role_name) then
    return jsonb_build_object('ok', false, 'code', 'WRONG_UNIT',
      'message', 'هذا المنصب لا يقود هذه الوحدة.');
  end if;

  if v_role_name = 'department_head' then
    select ur.department_id into v_other_dept
    from user_roles ur
    where ur.user_id = p_user and ur.role_id = v_role_id and ur.is_active
      and ur.department_id is distinct from p_department
    limit 1;
    if v_other_dept is not null then
      return jsonb_build_object('ok', false, 'code', 'ALREADY_HEAD', 'message', 'هذا العضو يرأس قسمًا آخر بالفعل. أزِل رئاسته السابقة أوّلًا.');
    end if;
  end if;

  if v_globally_unique then
    select ur.id, ur.user_id into v_existing_id, v_existing_user
    from user_roles ur
    where ur.role_id = v_role_id and ur.is_active and ur.user_id <> p_user
    limit 1;
  elsif v_per_committee_unique then
    select ur.id, ur.user_id into v_existing_id, v_existing_user
    from user_roles ur
    where ur.role_id = v_role_id and ur.is_active and ur.committee_id = p_committee and ur.user_id <> p_user
    limit 1;
  elsif v_per_department_unique then
    select ur.id, ur.user_id into v_existing_id, v_existing_user
    from user_roles ur
    where ur.role_id = v_role_id and ur.is_active and ur.department_id = p_department and ur.user_id <> p_user
    limit 1;
  end if;

  if v_existing_id is not null and not p_replace then
    return jsonb_build_object(
      'ok', false, 'code', 'OCCUPIED',
      'message', 'هذا المنصب مشغول حاليًّا. فعّل الاستبدال لإحلال شخص جديد.',
      'current_user_id', v_existing_user
    );
  end if;

  if v_existing_id is not null and p_replace then
    update user_roles set is_active = false where id = v_existing_id;
  end if;

  select id into v_row_id
  from user_roles
  where user_id = p_user and role_id = v_role_id
    and committee_id is not distinct from p_committee
    and (p_committee is not null or department_id is not distinct from p_department)
  limit 1;

  if v_row_id is not null then
    update user_roles
    set is_active = true, department_id = p_department, assigned_by = p_actor, assigned_at = now(),
        notes = coalesce(p_notes, notes)
    where id = v_row_id;
    v_new_id := v_row_id;
  else
    insert into user_roles (user_id, role_id, role_name, committee_id, department_id, is_active, assigned_by, notes)
    values (p_user, v_role_id, v_role_name, p_committee, p_department, true, p_actor, p_notes)
    returning id into v_new_id;
  end if;

  if v_role_name in ('committee_leader', 'deputy_committee_leader') and p_committee is not null then
    update user_roles ur
    set is_active = false
    where ur.role_name = 'committee_member'
      and ur.user_id = p_user and ur.committee_id = p_committee and ur.is_active;
  end if;

  if v_role_name in ('hr_admin_member', 'qa_admin_member') and p_committee is not null then
    update user_roles ur
    set is_active = false
    where ur.role_name in ('hr_admin_member', 'qa_admin_member')
      and ur.user_id = p_user and ur.committee_id = p_committee
      and ur.role_name <> v_role_name and ur.is_active;
  end if;

  return jsonb_build_object(
    'ok', true,
    'message', 'تمّ الإسناد بنجاح.',
    'user_role_id', v_new_id,
    'replaced_user_id', v_existing_user
  );
end;
$function$;

-- (٤) `revoke_position` — نظيرة الإسناد. كانت الإزالة تحديثًا مباشرًا في طبقة التطبيق
--     بمفتاح الخدمة، فضوابطها تُكتب هناك؛ والآن بابها هو الحَكَم نفسه — مصدرٌ واحد للسلطتين.
create or replace function public.revoke_position(p_actor uuid, p_user uuid, p_role_name text, p_committee integer default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_removed integer;
begin
  if p_role_name = 'club_president' then
    return jsonb_build_object('ok', false, 'code', 'PROTECTED', 'message', 'لا يمكن إزالة رئيس النادي من هنا.');
  end if;

  if not can_assign_role(p_actor, p_role_name, p_committee) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN',
      'message', 'صلاحيتك لا تبلغ هذا المنصب — لا تُزيل إلّا أعضاء وحدتك.');
  end if;

  -- إلغاء تفعيل لا حذف صلب (تريغر القاعدة قد يسحب ترشّحًا انتخابيًّا نشطًا)
  update user_roles
  set is_active = false
  where user_id = p_user and role_name = p_role_name and is_active
    and committee_id is not distinct from p_committee;
  get diagnostics v_removed = row_count;

  if v_removed = 0 then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا تعيين نشطًا بهذه الصفة.');
  end if;

  return jsonb_build_object('ok', true, 'message', 'تمّت الإزالة.', 'removed', v_removed);
end;
$function$;

revoke execute on function public.revoke_position(uuid, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.revoke_position(uuid, uuid, text, integer) to service_role;
