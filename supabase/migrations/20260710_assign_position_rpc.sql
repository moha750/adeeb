-- ============================================================
-- assign_position — إسناد ذرّيّ لمنصب (SECURITY DEFINER)
-- يحلّ حاجز RLS غير المتماثل على user_roles (INSERT>=8 / UPDATE>=9 / DELETE=10):
-- الدالّة تعمل بصلاحية المالك فتتجاوز RLS، وتفرض بدلًا منه:
--   (1) صلاحية المُنفّذ (role_level >= 8، مطابق لدوال الخلفية الطرفية)
--   (2) صحّة نطاق المنصب (لجنة/قسم/بلا نطاق)
--   (3) قواعد التفرّد (عالميّ / لكلّ لجنة / لكلّ قسم) التي كانت في JS فقط
--   (4) الإحلال الصريح (p_replace) بدل الإسناد المزدوج الصامت
-- كلّ ذلك في معاملة واحدة ذرّيّة. الاستدعاء عبر service_role حصرًا (من Server Action مُصادَق).
-- ملاحظة: عتبة الصلاحية رقميّة مؤقّتًا؛ تُستبدَل بقدرة مُسمّاة عند تنفيذ RBAC-MIGRATION.md.
-- ============================================================

create or replace function public.assign_position(
  p_actor      uuid,
  p_user       uuid,
  p_role       integer,
  p_committee  integer default null,
  p_department integer default null,
  p_replace    boolean default false,
  p_notes      text    default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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

  -- (1ب) منع التصعيد الرأسيّ: لا يُسنِد المُنفّذ منصبًا أعلى من مستواه (يمنع خطف الرئاسة/الاستشارة)
  if v_actor_level < v_target_level then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN_LEVEL', 'message', 'لا يمكنك إسناد منصب أعلى من صلاحيتك.');
  end if;

  -- (2) تصنيف النطاق والتفرّد حسب اسم الدور
  v_needs_committee       := v_role_name in ('committee_leader','deputy_committee_leader','committee_member','hr_admin_member','qa_admin_member');
  v_needs_department      := v_role_name in ('department_head');
  v_no_scope              := v_role_name in ('club_president','president_advisor','executive_council_president','hr_committee_leader','qa_committee_leader','activity_coordinator');
  v_globally_unique       := v_role_name in ('club_president','executive_council_president','hr_committee_leader','qa_committee_leader');
  v_per_committee_unique  := v_role_name in ('committee_leader','deputy_committee_leader');
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

  -- (2ب) رئيس القسم يرأس قسمًا واحدًا فقط — امنع الرئاسة المزدوجة (وتفادَ إفراغ قسمه السابق صامتًا)
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
  if v_role_name in ('hr_admin_member', 'qa_admin_member') then
    -- مشرف إداريّ واحد لكلّ لجنة (من أيّ إدارة — لا اثنان)
    select ur.id, ur.user_id into v_existing_id, v_existing_user
    from user_roles ur
    join roles r2 on r2.id = ur.role_id
    where r2.role_name in ('hr_admin_member', 'qa_admin_member') and ur.is_active
      and ur.committee_id = p_committee and ur.user_id <> p_user
    limit 1;
  elsif v_globally_unique then
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

  -- إحلال: إلغاء تفعيل شاغل المنصب السابق
  if v_existing_id is not null and p_replace then
    update user_roles set is_active = false where id = v_existing_id;
  end if;

  -- (4) إسناد ذرّيّ يحترم UNIQUE(user_id, role_id, committee_id):
  -- إن وُجد صفّ لنفس (عضو، دور، لجنة) — فعّله وحدّث القسم؛ وإلّا أدرِج صفًّا جديدًا.
  -- نطابق على (عضو، دور، لجنة)، ونضيف القسم للأدوار بلا لجنة (كرئيس القسم) كي لا نُعيد استخدام صفّ قسم آخر
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

  -- ترقية: عند إسناد قيادة لجنة لعضو، أزِل صفّ عضويّته العاديّة في نفس اللجنة (فلا يظهر مرّتين)
  if v_role_name in ('committee_leader', 'deputy_committee_leader') and p_committee is not null then
    update user_roles ur
    set is_active = false
    from roles r
    where ur.role_id = r.id and r.role_name = 'committee_member'
      and ur.user_id = p_user and ur.committee_id = p_committee and ur.is_active;
  end if;

  -- عضو إداري: يتبع لإدارة واحدة على اللجنة — أزِل صفّ الإدارة الأخرى لنفس العضو على نفس اللجنة
  -- (يمنع الازدواج عند تبديل نفس الشخص بين الموارد/الضمان)
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
$$;

-- الاستدعاء عبر service_role حصرًا (من Server Action مُصادَق)؛ لا نمنحه للعميل.
revoke all on function public.assign_position(uuid, uuid, integer, integer, integer, boolean, text) from public, anon, authenticated;
grant execute on function public.assign_position(uuid, uuid, integer, integer, integer, boolean, text) to service_role;

comment on function public.assign_position is
  'إسناد ذرّيّ لمنصب في user_roles: يتحقّق من صلاحية المُنفّذ (>=8) والنطاق والتفرّد، ويدعم الإحلال. service_role فقط.';
