-- شرطُ مقعد عضو الإدارة: «عضوٌ في أدِيب، أيًّا كان مقعده» بدل «عضو لجنة».
--
-- قرار محمد (2026-10-10): عضو الموارد البشريّة وعضو الضمان والجودة يُسنَدان لمن هو عضوٌ الآن —
-- عضو لجنة، أو نائب قائد، أو منسّق قسم، أو عضو إدارةٍ أخرى — وأقلُّ رتبته «عضو»، لا متطوّع ولا
-- زائر. والقاعدة نفسها لعضو «الإدارة التنفيذيّة» حين تُنشأ.
--
-- كان الشرط `prerequisite_role_name = 'committee_member'`: منصبٌ بعينه. وصار شرطَ حالٍ لا شرطَ
-- منصب، فله عمودُه `roles.requires_membership` يقرؤه الإسناد (`assign_position`) والبِركة
-- (`assignable_members`). والإسناد نقلٌ كما كان («منصبٌ حيٌّ واحد لكلّ عضو»): يُخلي مقعده السابق.

alter table public.roles
  add column if not exists requires_membership boolean not null default false;

comment on column public.roles.requires_membership is
  'لا يُسنَد المقعد إلّا لعضوٍ في أدِيب الآن (is_adeeb_member)، أيًّا كان مقعده — لا لمتطوّعٍ ولا لزائر.';

update public.roles
set requires_membership = true,
    prerequisite_role_name = null
where role_name in ('hr_admin_member', 'qa_admin_member');

CREATE OR REPLACE FUNCTION public.assign_position(p_actor uuid, p_user uuid, p_role_name text DEFAULT NULL::text, p_committee integer DEFAULT NULL::integer, p_department integer DEFAULT NULL::integer, p_replace boolean DEFAULT false, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_role_name            text;
  v_uniq                 text;
  v_home                 integer;
  v_prereq               text;
  v_prereq_ar            text;
  v_needs_member         boolean;
  v_needs_committee      boolean;
  v_needs_department     boolean;
  v_no_scope             boolean;
  v_existing_id          integer;
  v_existing_user        uuid;
  v_row_id               integer;
  v_new_id               integer;
  v_vacated              jsonb;
  v_vacated_label        text;
begin
  -- (1) بوّابة أوّليّة: من لا صفَّ له في جدول السلطة لا يُسنِد شيئًا.
  if not exists (
    select 1 from user_roles ur
    join position_authority pa on pa.role_name = ur.role_name
    where ur.user_id = p_actor and ur.is_active
  ) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'لا تملك صلاحية إدارة الهيكلة.');
  end if;

  if not exists (select 1 from profiles where id = p_user) then
    return jsonb_build_object('ok', false, 'code', 'NO_USER', 'message', 'العضو غير موجود.');
  end if;

  if p_role_name is null then
    return jsonb_build_object('ok', false, 'code', 'NO_ROLE', 'message', 'المنصب غير موجود.');
  end if;

  select role_name, holder_uniqueness, home_committee_id, prerequisite_role_name, requires_membership
  into v_role_name, v_uniq, v_home, v_prereq, v_needs_member
  from roles where role_name = p_role_name;

  if v_role_name is null then
    return jsonb_build_object('ok', false, 'code', 'NO_ROLE', 'message', 'المنصب غير موجود.');
  end if;

  -- (2) النطاق حسب اسم الدور. أمّا التفرّد فتقوله `roles.holder_uniqueness` ويحرسه التريغر.
  v_needs_committee   := v_role_name in ('committee_leader','deputy_committee_leader','committee_member',
                                         'hr_admin_member','qa_admin_member',
                                         'hr_committee_leader','qa_committee_leader');
  v_needs_department  := v_role_name in ('department_head');
  v_no_scope          := v_role_name in ('club_president','executive_council_president');

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

  -- (2ب) والوحدة يجب أن تُصرّح بالمقعد: قائدَها أو عضوَها، أو نائبَ قائدٍ حيث للقيادة نائب.
  --      (بهذا لا يُجلَس «عضو لجنة» في إدارةٍ إداريّة — وهو الخطأ الذي قُبل به أعضاءٌ سابقًا.)
  if not seat_declared_by_unit(v_role_name, p_committee) then
    return jsonb_build_object('ok', false, 'code', 'WRONG_UNIT',
      'message', 'هذه الوحدة لا تُصرّح بهذا المنصب.');
  end if;

  -- (1ج) أيبلغ المُنفّذ **هذا المقعد** في **هذا النطاق**؟ — من الجدول.
  if not can_assign_role(p_actor, v_role_name, p_committee) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN',
      'message', 'صلاحيتك لا تبلغ هذا المنصب.');
  end if;

  -- (3) شرطُ المقعد: منصبٌ سابقٌ بعينه يجب أن يشغله المرشّح (لا مقعدَ يشترطه منذ 20261010).
  if v_prereq is not null and not exists (
    select 1 from user_roles ur
    where ur.user_id = p_user and ur.is_active and ur.role_name = v_prereq
  ) then
    select coalesce(role_name_ar, v_prereq) into v_prereq_ar from roles where role_name = v_prereq;
    return jsonb_build_object('ok', false, 'code', 'NEEDS_PREREQUISITE',
      'message', 'هذا المنصب لا يُسنَد إلّا لمن هو «' || v_prereq_ar || '» الآن.',
      'prerequisite_role_name', v_prereq);
  end if;

  -- (3ب) شرطُ العضويّة: عضو الإدارة لا يُسنَد إلّا لعضوٍ في أدِيب الآن، أيًّا كان مقعده
  --      (عضو لجنة، نائب قائد، منسّق قسم، عضو إدارةٍ أخرى…) — لا لمتطوّعٍ ولا لزائر.
  if v_needs_member and not is_adeeb_member(p_user) then
    return jsonb_build_object('ok', false, 'code', 'NEEDS_MEMBERSHIP',
      'message', 'هذا المنصب لا يُسنَد إلّا لعضوٍ في أدِيب الآن، لا لمتطوّعٍ ولا لزائر.');
  end if;

  -- (4) السحب: من بلغ المقعد أخذ شاغلَه من حيث كان — إلّا ما سُمّي ممنوعًا (`blocked_roles`)
  --     ورئيسَ النادي. ولكلّ عضوٍ منصبٌ واحد، فالإسناد الثاني نقلٌ لا جمع.
  if not can_take_position_from(p_actor, p_user)
     and exists (
       select 1 from user_roles ur
       where ur.user_id = p_user and ur.is_active
         and not (ur.role_name = v_role_name
                  and ur.committee_id is not distinct from p_committee
                  and (p_committee is not null or ur.department_id is not distinct from p_department))
     ) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN_HOLDER',
      'message', 'هذا العضو في موضعٍ لا تطوله يدُك — لا يُنقل إلّا بيد من يملك نزعه.',
      'held_role_name', (select ur.role_name from user_roles ur where ur.user_id = p_user and ur.is_active limit 1));
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

  -- (5) الإخلاء: يُطفأ ما كان قبل أن يُكتَب ما صار — في المعاملة نفسها.
  with vac as (
    update user_roles ur set is_active = false
    where ur.user_id = p_user and ur.is_active
      and not (ur.role_name = v_role_name
               and ur.committee_id is not distinct from p_committee
               and (p_committee is not null or ur.department_id is not distinct from p_department))
    returning ur.role_name, ur.committee_id, ur.department_id
  )
  select jsonb_agg(jsonb_build_object(
           'role_name', vac.role_name,
           'committee_id', vac.committee_id,
           'department_id', vac.department_id)),
         string_agg(
           coalesce(r.role_name_ar, vac.role_name)
             || coalesce(' — ' || c.committee_name_ar, ' — ' || d.name_ar, ''),
           '، ')
  into v_vacated, v_vacated_label
  from vac
  left join roles r       on r.role_name = vac.role_name
  left join committees c  on c.id = vac.committee_id
  left join departments d on d.id = vac.department_id;

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

  return jsonb_build_object(
    'ok', true,
    'message', case when v_vacated_label is null then 'تمّ الإسناد بنجاح.'
                    else 'تمّ الإسناد — ونُقل من: ' || v_vacated_label || '.' end,
    'user_role_id', v_new_id,
    'replaced_user_id', v_existing_user,
    'vacated', v_vacated
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.assignable_members(p_actor uuid, p_role_name text DEFAULT NULL::text)
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
              coalesce(h.role_name, '')))
    -- شرطُ العضويّة (`roles.requires_membership`): عضوٌ في أدِيب الآن، أيًّا كان مقعده.
    and (p_role_name is null
         or not coalesce((select r.requires_membership from roles r where r.role_name = p_role_name), false)
         or is_adeeb_member(p.id));
$function$;

do $$
begin
  if (select count(*) from public.roles
      where role_name in ('hr_admin_member', 'qa_admin_member')
        and requires_membership and prerequisite_role_name is null) <> 2 then
    raise exception 'شرط عضو الإدارة لم يُضبط';
  end if;
end $$;
