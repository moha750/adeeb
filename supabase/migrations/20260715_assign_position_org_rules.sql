-- assign_position — مواءمة قواعد الإسناد مع هيكلة النادي الحقيقيّة.
--
-- ═══ ١) مشرف من كلّ إدارة، لا واحد من أيّهما ═══
--
-- هيكلة النادي (بكلمات المالك 2026-07-15): «إدارة الموارد ... يضم أعضاء
-- إداريين عددهم بعدد اللجان» — ومثلها إدارة الضمان. أي أنّ لكلّ لجنة
-- تشغيليّة **مشرفَين**: واحد من الموارد وواحد من الضمان.
--
-- والدالّة تفرض العكس حرفيًّا:
--     -- مشرف إداريّ واحد لكلّ لجنة (من أيّ إدارة — لا اثنان)
--     where r2.role_name in ('hr_admin_member','qa_admin_member') ...
--       and ur.committee_id = p_committee
-- فمن يُسنِد مشرف ضمان للجنة لها مشرف موارد، يُردّ عليه OCCUPIED.
--
-- الإصلاح: التفرّد يكون لكلّ (دور + لجنة) لا لكلّ لجنة. وحينها يذوب
-- الفرع الخاصّ كلّه في v_per_committee_unique القائم — قاعدة أقلّ لا أكثر.
--
-- ═══ ٢) القائدتان تُربطان بإدارتيهما ═══
--
-- كان: v_no_scope := (... 'hr_committee_leader','qa_committee_leader' ...)
--      if v_no_scope then p_committee := null; end if;
-- فتُفرغ الدالّة committee_id قسرًا، وأيّ ربط يُمحى عند أوّل إسناد.
-- وقد ربطنا أرياف بإدارة الموارد (22) وغادة بالضمان (23) في ترحيل سابق،
-- فلولا هذا الرفع لمحته الدالّة.
--
-- ═══ ٣) حارس جديد: دور القيادة يُسنَد لوحدته ═══
--
-- committees.leader_role_name صار يقول أيّ دور يقود كلّ وحدة. فلا شيء
-- يمنع اليوم إسناد «قائدة إدارة الموارد» إلى «لجنة التصوير».
-- الحارس يقرأ التصريح ولا يحفر أسماء: الوحدة الهدف يجب أن تُصرّح
-- بالدور المُسنَد قائدًا لها.

create or replace function public.assign_position(
  p_actor uuid,
  p_user uuid,
  p_role integer,
  p_committee integer default null,
  p_department integer default null,
  p_replace boolean default false,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor_level          integer;
  v_target_level         integer;
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
  -- (1) صلاحية المُنفّذ: أعلى دور نشط >= 8
  select max(r.role_level) into v_actor_level
  from user_roles ur join roles r on r.id = ur.role_id
  where ur.user_id = p_actor and ur.is_active;

  if coalesce(v_actor_level, 0) < 8 then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'لا تملك صلاحية إدارة الهيكلة.');
  end if;

  if not exists (select 1 from profiles where id = p_user) then
    return jsonb_build_object('ok', false, 'code', 'NO_USER', 'message', 'العضو غير موجود.');
  end if;

  select role_name, role_level into v_role_name, v_target_level from roles where id = p_role;
  if v_role_name is null then
    return jsonb_build_object('ok', false, 'code', 'NO_ROLE', 'message', 'المنصب غير موجود.');
  end if;

  -- (1ب) منع التصعيد الرأسيّ: لا يُسنِد المُنفّذ منصبًا أعلى من مستواه
  if v_actor_level < v_target_level then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN_LEVEL', 'message', 'لا يمكنك إسناد منصب أعلى من صلاحيتك.');
  end if;

  -- (2) تصنيف النطاق والتفرّد حسب اسم الدور
  -- قائدتا الإدارتين تحتاجان وحدتهما (رُفعتا من v_no_scope).
  v_needs_committee       := v_role_name in ('committee_leader','deputy_committee_leader','committee_member',
                                             'hr_admin_member','qa_admin_member',
                                             'hr_committee_leader','qa_committee_leader');
  v_needs_department      := v_role_name in ('department_head');
  v_no_scope              := v_role_name in ('club_president','president_advisor','executive_council_president','activity_coordinator');
  v_globally_unique       := v_role_name in ('club_president','executive_council_president','hr_committee_leader','qa_committee_leader');
  -- مشرف واحد لكلّ لجنة **من كلّ إدارة** — الموارد والضمان مستقلّان.
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

  -- (2ج) دور القيادة يُسنَد إلى الوحدة التي تُصرّح به قائدًا لها.
  -- يُقرأ من committees.leader_role_name — لا أسماء محفورة هنا.
  if p_committee is not null
     and exists (select 1 from committees where leader_role_name = v_role_name)
     and not exists (select 1 from committees where id = p_committee and leader_role_name = v_role_name) then
    return jsonb_build_object('ok', false, 'code', 'WRONG_UNIT',
      'message', 'هذا المنصب لا يقود هذه الوحدة.');
  end if;

  -- (2ب) رئيس القسم يرأس قسمًا واحدًا فقط
  if v_role_name = 'department_head' then
    select ur.department_id into v_other_dept
    from user_roles ur
    where ur.user_id = p_user and ur.role_id = p_role and ur.is_active
      and ur.department_id is distinct from p_department
    limit 1;
    if v_other_dept is not null then
      return jsonb_build_object('ok', false, 'code', 'ALREADY_HEAD', 'message', 'هذا العضو يرأس قسمًا آخر بالفعل. أزِل رئاسته السابقة أوّلًا.');
    end if;
  end if;

  -- (3) شغل المنصب (للأدوار المفردة فقط) — نستثني نفس العضو
  if v_globally_unique then
    select ur.id, ur.user_id into v_existing_id, v_existing_user
    from user_roles ur
    where ur.role_id = p_role and ur.is_active and ur.user_id <> p_user
    limit 1;
  elsif v_per_committee_unique then
    select ur.id, ur.user_id into v_existing_id, v_existing_user
    from user_roles ur
    where ur.role_id = p_role and ur.is_active and ur.committee_id = p_committee and ur.user_id <> p_user
    limit 1;
  elsif v_per_department_unique then
    select ur.id, ur.user_id into v_existing_id, v_existing_user
    from user_roles ur
    where ur.role_id = p_role and ur.is_active and ur.department_id = p_department and ur.user_id <> p_user
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

  -- (4) إسناد ذرّيّ يحترم UNIQUE(user_id, role_id, committee_id)
  select id into v_row_id
  from user_roles
  where user_id = p_user and role_id = p_role
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
    insert into user_roles (user_id, role_id, committee_id, department_id, is_active, assigned_by, notes)
    values (p_user, p_role, p_committee, p_department, true, p_actor, p_notes)
    returning id into v_new_id;
  end if;

  -- ترقية: عند إسناد قيادة لجنة لعضو، أزِل صفّ عضويّته العاديّة في نفس اللجنة
  if v_role_name in ('committee_leader', 'deputy_committee_leader') and p_committee is not null then
    update user_roles ur
    set is_active = false
    from roles r
    where ur.role_id = r.id and r.role_name = 'committee_member'
      and ur.user_id = p_user and ur.committee_id = p_committee and ur.is_active;
  end if;

  -- الشخص يتبع إدارةً واحدة: لا يكون مشرف موارد ومشرف ضمان على اللجنة نفسها
  if v_role_name in ('hr_admin_member', 'qa_admin_member') and p_committee is not null then
    update user_roles ur
    set is_active = false
    from roles r
    where ur.role_id = r.id and r.role_name in ('hr_admin_member', 'qa_admin_member')
      and ur.user_id = p_user and ur.committee_id = p_committee and ur.role_id <> p_role and ur.is_active;
  end if;

  return jsonb_build_object(
    'ok', true,
    'message', 'تمّ الإسناد بنجاح.',
    'user_role_id', v_new_id,
    'replaced_user_id', v_existing_user
  );
end;
$function$;

revoke all on function public.assign_position(uuid, uuid, integer, integer, integer, boolean, text) from public, anon, authenticated;
grant execute on function public.assign_position(uuid, uuid, integer, integer, integer, boolean, text) to service_role;

comment on function public.assign_position is
  'إسناد ذرّيّ لمنصب في user_roles: يتحقّق من صلاحية المُنفّذ (>=8) والنطاق والتفرّد ووحدة القيادة، ويدعم الإحلال. مشرف إداريّ واحد لكلّ (إدارة + لجنة) — لا واحد لكلّ لجنة. service_role فقط.';
