-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260801035313   الاسم: v1_death_00d_rewrite_writers_and_promote_pk

begin;

CREATE OR REPLACE FUNCTION public.assign_activity_coordinator(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_admin BOOLEAN;
    v_member_name TEXT;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
    v_is_admin := check_user_permission(v_user_id, 'manage_activities');
    IF NOT v_is_admin THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;

    SELECT full_name INTO v_member_name FROM profiles
    WHERE id = p_user_id AND account_status = 'active';
    IF v_member_name IS NULL THEN RAISE EXCEPTION 'MEMBER_NOT_FOUND'; END IF;

    IF NOT EXISTS (SELECT 1 FROM roles WHERE role_name = 'activity_coordinator') THEN
        RAISE EXCEPTION 'ROLE_NOT_FOUND';
    END IF;

    IF EXISTS (SELECT 1 FROM user_roles WHERE user_id=p_user_id AND role_name='activity_coordinator') THEN
        UPDATE user_roles SET is_active=true, assigned_at=now(), assigned_by=v_user_id
        WHERE user_id=p_user_id AND role_name='activity_coordinator';
    ELSE
        -- كانت تُدرِج `role_id` وحده وتترك التريغر يشتقّ الاسم؛ وبعد ٠٢ لا تريغر
        -- ولا رقم، و`role_name` غير قابل للعدم — فالاسم يُكتب صراحةً.
        INSERT INTO user_roles (user_id, role_name, is_active, assigned_by)
        VALUES (p_user_id, 'activity_coordinator', true, v_user_id);
    END IF;

    INSERT INTO notifications (
        title, message, type, priority, icon,
        target_audience, target_user_ids,
        sender_id, action_url, action_label, metadata
    ) VALUES (
        'تم إسداء مهمة جديدة',
        'تم إسداء مهمة "تسجيل الحضور" إليك. يمكنك الآن الدخول إلى تبويب "تسجيل الحضور" لتسجيل حضور المسجّلين في الأنشطة الحيّة.',
        'success',
        'normal',
        'fa-clipboard-check',
        'specific_users',
        ARRAY[p_user_id],
        v_user_id,
        '/admin/dashboard.html#activities-attendance-section',
        'فتح تبويب تسجيل الحضور',
        jsonb_build_object('role', 'activity_coordinator', 'action', 'assigned')
    );

    RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.revoke_activity_coordinator(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_admin BOOLEAN;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
    v_is_admin := check_user_permission(v_user_id, 'manage_activities');
    IF NOT v_is_admin THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;

    IF NOT EXISTS (SELECT 1 FROM roles WHERE role_name='activity_coordinator') THEN
        RAISE EXCEPTION 'ROLE_NOT_FOUND';
    END IF;

    UPDATE user_roles SET is_active=false WHERE user_id=p_user_id AND role_name='activity_coordinator';
    IF NOT FOUND THEN RAISE EXCEPTION 'COORDINATOR_NOT_FOUND'; END IF;

    -- إشعار للمستخدم المسحوبة منه المهمة
    INSERT INTO notifications (
        title, message, type, priority, icon,
        target_audience, target_user_ids,
        sender_id, metadata
    ) VALUES (
        'انتهاء مهمة',
        'تم سحب مهمة "تسجيل الحضور" منك. لن يظهر تبويب تسجيل الحضور بعد الآن في لوحتك.',
        'info',
        'normal',
        'fa-clipboard-check',
        'specific_users',
        ARRAY[p_user_id],
        v_user_id,
        jsonb_build_object('role', 'activity_coordinator', 'action', 'revoked')
    );

    RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_position_uniqueness()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uniq  text;
  v_other uuid;
begin
  -- الصفّ الميّت لا يشغل مقعدًا؛ التفرّد على الأحياء وحدهم.
  if not new.is_active then return new; end if;

  -- هذا التريغر يسبق `sync_role_key` أبجديًّا (trg_… قبل user_roles_…)، فلو
  -- كتب أحدٌ بالرقم وحده لوصل الاسم فارغًا هنا وسقط الحرس صامتًا. نصرخ بدله.
  if new.role_name is null then
    raise exception 'user_roles: الاسم هو الهويّة — لا يُكتَب صفٌّ بلا role_name.'
      using errcode = '23502';
  end if;

  select holder_uniqueness into v_uniq from roles where role_name = new.role_name;
  if v_uniq is null or v_uniq = 'multi' then return new; end if;

  select ur.user_id into v_other
  from user_roles ur
  where ur.role_name = new.role_name
    and ur.is_active
    and ur.id is distinct from new.id
    and ur.user_id <> new.user_id
    and (v_uniq <> 'per_committee'  or ur.committee_id  is not distinct from new.committee_id)
    and (v_uniq <> 'per_department' or ur.department_id is not distinct from new.department_id)
  limit 1;

  if v_other is not null then
    raise exception 'المنصب مشغول: هذا الدور لا يقبل أكثر من شاغلٍ واحد في هذا النطاق. أزِل الشاغل الحاليّ أو استعمل assign_position بالاستبدال.'
      using errcode = '23505';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.assign_position(p_actor uuid, p_user uuid, p_role integer DEFAULT NULL::integer, p_committee integer DEFAULT NULL::integer, p_department integer DEFAULT NULL::integer, p_replace boolean DEFAULT false, p_notes text DEFAULT NULL::text, p_role_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actor_rank           integer;
  v_target_rank          integer;
  v_role_name            text;
  v_uniq                 text;
  v_home                 integer;
  v_needs_committee      boolean;
  v_needs_department     boolean;
  v_no_scope             boolean;
  v_existing_id          integer;
  v_existing_user        uuid;
  v_other_dept           integer;
  v_row_id               integer;
  v_new_id               integer;
begin
  -- (1) بوّابة أوّليّة: من لا يملك أيّ سلطة إسناد يُردّ هنا قبل أن يعرف شيئًا عن المنصب.
  if not check_user_permission(p_actor, 'manage_positions')
     and not check_user_permission(p_actor, 'assign_unit_members') then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'لا تملك صلاحية إدارة الهيكلة.');
  end if;

  -- رتبة المُنفّذ (بالاسم) — لمنع التصعيد الرأسيّ. الأصغر = الأعلى.
  select min(case ur.role_name
      when 'club_president' then 1 when 'president_advisor' then 2
      when 'executive_council_president' then 3 when 'hr_committee_leader' then 4
      when 'qa_committee_leader' then 5 when 'department_head' then 6
      when 'hr_admin_member' then 7 when 'qa_admin_member' then 8
      when 'committee_leader' then 9 when 'activity_coordinator' then 10
      when 'deputy_committee_leader' then 11 when 'committee_member' then 12
      else 99 end)
  into v_actor_rank
  from user_roles ur
  where ur.user_id = p_actor and ur.is_active;

  if not exists (select 1 from profiles where id = p_user) then
    return jsonb_build_object('ok', false, 'code', 'NO_USER', 'message', 'العضو غير موجود.');
  end if;

  -- (1أ) المرجع: الاسم إن جاء، وإلّا الرقم. والرقم يُترجَم إلى اسمٍ فورًا ولا
  --      يُستعمل بعدها — فالوسيط `p_role` باقٍ للتوافق لا للهويّة.
  if p_role_name is not null then
    select role_name, holder_uniqueness, home_committee_id, (case role_name
        when 'club_president' then 1 when 'president_advisor' then 2
        when 'executive_council_president' then 3 when 'hr_committee_leader' then 4
        when 'qa_committee_leader' then 5 when 'department_head' then 6
        when 'hr_admin_member' then 7 when 'qa_admin_member' then 8
        when 'committee_leader' then 9 when 'activity_coordinator' then 10
        when 'deputy_committee_leader' then 11 when 'committee_member' then 12
        else 99 end)
    into v_role_name, v_uniq, v_home, v_target_rank
    from roles where role_name = p_role_name;
  elsif p_role is not null then
    select role_name, holder_uniqueness, home_committee_id, (case role_name
        when 'club_president' then 1 when 'president_advisor' then 2
        when 'executive_council_president' then 3 when 'hr_committee_leader' then 4
        when 'qa_committee_leader' then 5 when 'department_head' then 6
        when 'hr_admin_member' then 7 when 'qa_admin_member' then 8
        when 'committee_leader' then 9 when 'activity_coordinator' then 10
        when 'deputy_committee_leader' then 11 when 'committee_member' then 12
        else 99 end)
    into v_role_name, v_uniq, v_home, v_target_rank
    from roles where id = p_role;
  else
    return jsonb_build_object('ok', false, 'code', 'NO_ROLE', 'message', 'المنصب غير موجود.');
  end if;

  if v_role_name is null then
    return jsonb_build_object('ok', false, 'code', 'NO_ROLE', 'message', 'المنصب غير موجود.');
  end if;

  -- (1ب) منع التصعيد الرأسيّ
  if v_actor_rank > v_target_rank then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN_LEVEL', 'message', 'لا يمكنك إسناد منصب أعلى من صلاحيتك.');
  end if;

  -- (2) النطاق حسب اسم الدور. أمّا التفرّد فتقوله `roles.holder_uniqueness` ويحرسه التريغر.
  v_needs_committee   := v_role_name in ('committee_leader','deputy_committee_leader','committee_member',
                                         'hr_admin_member','qa_admin_member',
                                         'hr_committee_leader','qa_committee_leader');
  v_needs_department  := v_role_name in ('department_head');
  v_no_scope          := v_role_name in ('club_president','president_advisor','executive_council_president','activity_coordinator');

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

  -- (2أ) الدور الذي يُصرّح بإدارته الأمّ لا يُسنَد خارجها. وإشراف عضو الإدارة على لجان
  --      التنفيذيّ بابُه `assign_supervision` لا هذا الباب.
  if p_committee is not null and v_home is not null and p_committee <> v_home then
    return jsonb_build_object('ok', false, 'code', 'WRONG_UNIT',
      'message', 'هذا المنصب لا يُسنَد خارج وحدته الأمّ.');
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
    where ur.user_id = p_user and ur.role_name = v_role_name and ur.is_active
      and ur.department_id is distinct from p_department
    limit 1;
    if v_other_dept is not null then
      return jsonb_build_object('ok', false, 'code', 'ALREADY_HEAD', 'message', 'هذا العضو يرأس قسمًا آخر بالفعل. أزِل رئاسته السابقة أوّلًا.');
    end if;
  end if;

  -- إدارةٌ إداريّةٌ واحدةٌ للشخص — كانت تُنفَّذ إطفاءً صامتًا بعد الكتابة، صارت تُقال وتُردّ.
  if v_role_name in ('hr_admin_member', 'qa_admin_member')
     and exists (
       select 1 from user_roles ur
       where ur.user_id = p_user and ur.is_active
         and ur.role_name in ('hr_admin_member', 'qa_admin_member')
         and ur.role_name <> v_role_name
     ) then
    return jsonb_build_object('ok', false, 'code', 'ALREADY_ADMIN_MEMBER',
      'message', 'هذا العضو في إدارةٍ إداريّةٍ أخرى. أخرِجه منها أوّلًا.');
  end if;

  -- الشاغل المزاحِم — بنطاق التفرّد الذي يقوله الكتالوج. 'multi' لا يزاحم أحدًا.
  if v_uniq is distinct from 'multi' and v_uniq is not null then
    select ur.id, ur.user_id into v_existing_id, v_existing_user
    from user_roles ur
    where ur.role_name = v_role_name and ur.is_active and ur.user_id <> p_user
      and (v_uniq <> 'per_committee'  or ur.committee_id  is not distinct from p_committee)
      and (v_uniq <> 'per_department' or ur.department_id is not distinct from p_department)
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
  where user_id = p_user and role_name = v_role_name
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
    insert into user_roles (user_id, role_name, committee_id, department_id, is_active, assigned_by, notes)
    values (p_user, v_role_name, p_committee, p_department, true, p_actor, p_notes)
    returning id into v_new_id;
  end if;

  if v_role_name in ('committee_leader', 'deputy_committee_leader') and p_committee is not null then
    update user_roles ur
    set is_active = false
    where ur.role_name = 'committee_member'
      and ur.user_id = p_user and ur.committee_id = p_committee and ur.is_active;
  end if;

  return jsonb_build_object(
    'ok', true,
    'message', 'تمّ الإسناد بنجاح.',
    'user_role_id', v_new_id,
    'replaced_user_id', v_existing_user
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.grant_permission_to_role(p_role_id integer, p_permission_key text, p_scope text DEFAULT 'all'::text, p_granted_by uuid DEFAULT NULL::uuid, p_conditions jsonb DEFAULT '{}'::jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_permission_id INTEGER;
    v_role_permission_id INTEGER;
    v_role_name TEXT;
BEGIN
    -- الرقم يُترجَم إلى اسم، والاسم وحده هو ما يُكتب
    SELECT role_name INTO v_role_name FROM public.roles WHERE id = p_role_id;

    IF v_role_name IS NULL THEN
        RAISE EXCEPTION 'Role % not found', p_role_id;
    END IF;

    -- الحصول على معرف الصلاحية
    SELECT id INTO v_permission_id
    FROM public.permissions
    WHERE permission_key = p_permission_key;

    IF v_permission_id IS NULL THEN
        RAISE EXCEPTION 'Permission key % not found', p_permission_key;
    END IF;

    -- إدراج أو تحديث الصلاحية
    INSERT INTO public.role_permissions (role_name, permission_id, scope, conditions, granted_by)
    VALUES (v_role_name, v_permission_id, p_scope, p_conditions, p_granted_by)
    ON CONFLICT (role_name, permission_id)
    DO UPDATE SET
        scope = p_scope,
        conditions = p_conditions,
        granted_at = NOW(),
        granted_by = p_granted_by
    RETURNING id INTO v_role_permission_id;

    -- تسجيل في سجل التدقيق
    INSERT INTO public.permissions_audit_log (
        action_type, target_type, target_id, permission_key,
        role_id, performed_by, new_value
    )
    VALUES (
        'grant', 'role_permission', v_role_permission_id, p_permission_key,
        p_role_id, p_granted_by,
        jsonb_build_object('scope', p_scope, 'conditions', p_conditions)
    );

    RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.revoke_permission_from_role(p_role_id integer, p_permission_key text, p_scope text DEFAULT 'all'::text, p_revoked_by uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_permission_id INTEGER;
    v_deleted_id INTEGER;
    v_role_name TEXT;
BEGIN
    SELECT role_name INTO v_role_name FROM public.roles WHERE id = p_role_id;

    IF v_role_name IS NULL THEN
        RETURN false;
    END IF;

    -- الحصول على معرف الصلاحية
    SELECT id INTO v_permission_id
    FROM public.permissions
    WHERE permission_key = p_permission_key;

    IF v_permission_id IS NULL THEN
        RETURN false;
    END IF;

    -- حذف الصلاحية
    DELETE FROM public.role_permissions
    WHERE role_name = v_role_name
        AND permission_id = v_permission_id
        AND scope = p_scope
    RETURNING id INTO v_deleted_id;

    IF v_deleted_id IS NOT NULL THEN
        -- تسجيل في سجل التدقيق
        INSERT INTO public.permissions_audit_log (
            action_type, target_type, target_id, permission_key,
            role_id, performed_by
        )
        VALUES (
            'revoke', 'role_permission', v_deleted_id, p_permission_key,
            p_role_id, p_revoked_by
        );

        RETURN true;
    END IF;

    RETURN false;
END;
$function$;

-- و: المفتاح الأوّليّ ينتقل إلى الاسم، وفهرس الاسم يخلف فهرس الرقم

alter table public.role_permissions drop constraint role_permissions_pkey;
alter table public.role_permissions drop constraint role_permissions_role_name_permission_key;
alter table public.role_permissions add constraint role_permissions_pkey
  primary key (role_name, permission_id);

create index if not exists idx_user_roles_role_name on public.user_roles (role_name);

commit;
