-- هيكلةُ أدِيب الجديدة (اعتمدها محمد وبشائر، 2026-10-10).
--
--   رئيس أدِيب ← الرئيس التنفيذيّ ← ثلاث إدارات: الموارد البشريّة، والضمان والجودة، والإدارة
--   التنفيذيّة ← الأقسام واللجان كما هي. المجلس الإداريّ: رئيس أدِيب والرئيس التنفيذيّ وقادة
--   الإدارات. والمجلس التشغيليّ (كان «التنفيذيّ»): الأقسام واللجان.
--
-- ما يمسّه هذا الترحيل:
--   ١. الأسماء: «رئيس نادي أدِيب» ← «رئيس أدِيب»، و«رئيس المجلس التنفيذي» ← «الرئيس التنفيذي»،
--      و«المجلس التنفيذي» ← «المجلس التشغيلي». المفاتيح الداخليّة (`club_president`،
--      `executive_council_president`، `executive`) باقيةٌ كما هي: الاسمُ يتغيّر لا الهويّة.
--   ٢. الإدارة التنفيذيّة: وحدةٌ في المجلس الإداريّ يقودها مقعدُ الرئيس التنفيذيّ نفسُه (لا منصبٌ
--      ثانٍ له)، وعضوُها `exec_admin_member` («عضو»، وزنه ٣): يعيّنه الرئيس التنفيذيّ، ولا سلطة
--      له على الأشخاص، ولا يشرف على لجان، وشرطه شرطُ أعضاء الإدارات (عضوٌ لا متطوّع).
--   ٣. الإشراف للموارد والضمان وحدهما: عمود `committees.supervises`.
--   ٤. قائد الضمان يصوّت في كلّ الانتخابات كقائد الموارد.
--   ٥. لا يُعزل قائد إدارةٍ إلّا بيد رئيس أدِيب: عمود `roles.removal_needs_club_president`، يقرؤه
--      النزع (`revoke_position`) والاستبدال والنقل (`assign_position`) وإنهاء العضويّة
--      (`can_end_membership`).

alter table public.roles
  add column if not exists removal_needs_club_president boolean not null default false;
comment on column public.roles.removal_needs_club_president is
  'لا يُعزل شاغلُ هذا المقعد (نزعًا أو استبدالًا أو نقلًا أو إنهاءً لعضويّته) إلّا بيد رئيس أدِيب.';

alter table public.committees
  add column if not exists supervises boolean not null default false;
comment on column public.committees.supervises is
  'إدارةٌ يشرف أعضاؤها على لجان المجلس التشغيليّ (الموارد البشريّة والضمان والجودة).';

create or replace function public.is_club_president(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from user_roles ur
    where ur.user_id = p_user and ur.is_active and ur.role_name = 'club_president'
  );
$$;
revoke execute on function public.is_club_president(uuid) from public, anon;

-- ١. الأسماء
update public.roles set role_name_ar = 'رئيس أدِيب' where role_name = 'club_president';
update public.roles set role_name_ar = 'الرئيس التنفيذي',
  description = 'الرئيس التنفيذي: تتبعه الإدارات الثلاث، ويقود الإدارة التنفيذية، ويقوم مقام رئيس أدِيب عند غيابه'
where role_name = 'executive_council_president';
update public.councils set name_ar = 'المجلس التشغيلي',
  description = 'يضمّ الأقسام واللجان، ويتولّى تنفيذ الخطط والبرامج الموافق عليها لضمان سير العمل وتحقيق الأهداف المرحلية.'
where id = 'executive';

update public.position_authority
set note = replace(replace(note, 'رئيس المجلس التنفيذيّ', 'الرئيس التنفيذيّ'), 'رئيس النادي', 'رئيس أدِيب')
where note ~ '(رئيس المجلس التنفيذيّ|رئيس النادي)';
update public.membership_authority
set note = replace(replace(note, 'رئيس المجلس التنفيذي', 'الرئيس التنفيذي'), 'رئيس النادي', 'رئيس أدِيب')
where note ~ '(رئيس المجلس التنفيذي|رئيس النادي)';

-- ٢. الإدارة التنفيذيّة وعضوها
insert into public.roles (role_name, role_name_ar, role_level, description, council_type, is_elected,
                          membership_kind, vote_weight, votes_in_all_elections, holder_uniqueness,
                          home_committee_id, prerequisite_role_name, requires_membership)
values ('exec_admin_member', 'عضو', 7,
        'عضو الإدارة التنفيذية: ذراع الرئيس التنفيذي في أعماله، بلا سلطة على الأشخاص',
        'administrative', false, 'subordinate', 3.0, false, 'multi', null, null, true);

do $$
declare v_unit integer;
begin
  insert into public.committees (committee_name_ar, description, council_id, department_id,
                                 leader_role_name, member_role_name, is_active, supervises)
  values ('الإدارة التنفيذية',
          'ذراع الرئيس التنفيذي في أعماله: تتولّى المتابعة والتنسيق والإعداد لما يكلّفها به، وتتبعها الأقسام واللجان عبر منسّقيها.',
          'administrative', null, 'executive_council_president', 'exec_admin_member', true, false)
  returning id into v_unit;
  update public.roles set home_committee_id = v_unit where role_name = 'exec_admin_member';
end $$;

insert into public.role_permissions (role_name, permission_id)
select 'exec_admin_member', p.id from public.permissions p
where p.permission_key in ('view_own_membership', 'view_department_reports');

update public.position_authority
set target_roles = array_append(target_roles, 'exec_admin_member')
where role_name in ('club_president', 'executive_council_president')
  and not ('exec_admin_member' = any (target_roles));

-- ٣. الإشراف للموارد والضمان وحدهما
update public.committees set supervises = true where id in (22, 23);

-- ٤. قائد الضمان يصوّت في كلّ الانتخابات
update public.roles set votes_in_all_elections = true where role_name = 'qa_committee_leader';

-- ٥. لا يُعزل قائد إدارةٍ إلّا بيد رئيس أدِيب
update public.roles set removal_needs_club_president = true
where role_name in ('hr_committee_leader', 'qa_committee_leader');

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
  v_held_role            text;
  v_held_label           text;
  v_held_needs_cp        boolean;
  v_needs_cp             boolean;
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

  select role_name, holder_uniqueness, home_committee_id, prerequisite_role_name, requires_membership,
         removal_needs_club_president
  into v_role_name, v_uniq, v_home, v_prereq, v_needs_member, v_needs_cp
  from roles where role_name = p_role_name;

  if v_role_name is null then
    return jsonb_build_object('ok', false, 'code', 'NO_ROLE', 'message', 'المنصب غير موجود.');
  end if;

  -- (2) النطاق حسب اسم الدور. أمّا التفرّد فتقوله `roles.holder_uniqueness` ويحرسه التريغر.
  v_needs_committee   := v_role_name in ('committee_leader','deputy_committee_leader','committee_member',
                                         'hr_admin_member','qa_admin_member','exec_admin_member',
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

  -- (4أ) ومن يملك التعيين في المقعد يملك إخلاءه (قرار محمد 20261010): نقلُ صاحبِ مقعدٍ غيرِ
  --      «عضو لجنة» لا يكون إلّا بيد من يملك التعيين في ذلك المقعد (`can_assign_role`). فقائد
  --      الموارد ينقل المنسّق والقائد والنائب لأنّه يملك مقاعدهم، وقائد الضمان لا يملكها، ولا يأخذ
  --      قائدُ إدارةٍ أعضاءَ الأخرى؛ والرئيسان يملكان كلّ شيء. وعضو اللجنة يُنقل بلا شرط: مقعدٌ
  --      متعدّد لا يخلو بنقله. (الانتخاب لا يصطدم به: لا يترشّح إلّا أهلُ اللجنة المستهدفة،
  --      ومُعلِنُ الفائز يملك مقاعدهم.)
  select ur.role_name,
         coalesce(r.role_name_ar, ur.role_name) || coalesce(' ' || c.committee_name_ar, ' ' || d.name_ar, ''),
         coalesce(r.removal_needs_club_president, false)
  into v_held_role, v_held_label, v_held_needs_cp
  from user_roles ur
  left join roles r       on r.role_name = ur.role_name
  left join committees c  on c.id = ur.committee_id
  left join departments d on d.id = ur.department_id
  where ur.user_id = p_user and ur.is_active
    and ur.role_name <> 'committee_member'
    and not (ur.role_name = v_role_name
             and ur.committee_id is not distinct from p_committee
             and (p_committee is not null or ur.department_id is not distinct from p_department))
    and (not can_assign_role(p_actor, ur.role_name, ur.committee_id)
         -- وقائد الإدارة لا يُخلي مقعدَه إلّا رئيسُ أدِيب (20261010): نقلُه عزلٌ له.
         or (coalesce(r.removal_needs_club_president, false) and not is_club_president(p_actor)))
  limit 1;

  if v_held_role is not null and v_held_needs_cp and not is_club_president(p_actor) then
    return jsonb_build_object('ok', false, 'code', 'NEEDS_CLUB_PRESIDENT',
      'message', 'هذا العضو «' || v_held_label || '»، ولا يعزل قائدَ الإدارة إلّا رئيسُ أدِيب.',
      'held_role_name', v_held_role);
  end if;

  if v_held_role is not null then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN_SEAT',
      'message', 'هذا العضو يشغل «' || v_held_label || '»، ولا يُخلي مقعدَه إلّا من يملك التعيين فيه.',
      'held_role_name', v_held_role);
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

  -- (4ب) والاستبدال عزلٌ للشاغل: قائد الإدارة لا يُستبدَل إلّا بيد رئيس أدِيب (20261010).
  if v_existing_id is not null and p_replace and coalesce(v_needs_cp, false) and not is_club_president(p_actor) then
    return jsonb_build_object('ok', false, 'code', 'NEEDS_CLUB_PRESIDENT',
      'message', 'استبدالُ قائد الإدارة عزلٌ له، ولا يعزله إلّا رئيسُ أدِيب.',
      'current_user_id', v_existing_user);
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

CREATE OR REPLACE FUNCTION public.revoke_position(p_actor uuid, p_user uuid, p_role_name text, p_committee integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_removed integer;
  v_back    integer;
  v_seat    text;
  v_row     integer;
  v_name    text;
  v_live    boolean;
begin
  if p_role_name = 'club_president' then
    return jsonb_build_object('ok', false, 'code', 'PROTECTED', 'message', 'لا يمكن إزالة رئيس أدِيب من هنا.');
  end if;

  -- عزلُ قائد الإدارة لا يكون إلّا بيد رئيس أدِيب (قرار محمد 20261010).
  if exists (select 1 from roles r where r.role_name = p_role_name and r.removal_needs_club_president)
     and not is_club_president(p_actor) then
    return jsonb_build_object('ok', false, 'code', 'NEEDS_CLUB_PRESIDENT',
      'message', 'لا يعزل قائدَ الإدارة إلّا رئيسُ أدِيب.');
  end if;

  if not can_assign_role(p_actor, p_role_name, p_committee) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN',
      'message', 'صلاحيتك لا تبلغ هذا المنصب.');
  end if;

  select (p.joined_date is not null and p.account_status = 'active') into v_live
  from profiles p where p.id = p_user;

  update user_roles
  set is_active = false
  where user_id = p_user and role_name = p_role_name and is_active
    and committee_id is not distinct from p_committee;
  get diagnostics v_removed = row_count;

  if v_removed = 0 then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا تعيين نشطًا بهذه الصفة.');
  end if;

  if not exists (
    select 1 from committees c where c.id = p_committee and c.member_role_name = p_role_name
  ) then
    select c.id, c.member_role_name into v_back, v_seat
    from committees c
    where c.id = p_committee and c.is_active and c.member_role_name is not null;

    if v_back is null then
      select ur.committee_id, c.member_role_name into v_back, v_seat
      from user_roles ur
      join committees c on c.id = ur.committee_id
      where ur.user_id = p_user and not ur.is_active
        and c.is_active and ur.role_name = c.member_role_name
      order by ur.assigned_at desc nulls last
      limit 1;
    end if;
  end if;

  if v_back is not null and v_seat is not null then
    select id into v_row from user_roles
    where user_id = p_user and role_name = v_seat and committee_id = v_back
    limit 1;

    if v_row is not null then
      update user_roles set is_active = true, assigned_by = p_actor, assigned_at = now(),
             notes = 'عاد عضوًا بعد نزع منصبه.'
      where id = v_row;
    else
      insert into user_roles (user_id, role_name, committee_id, department_id, is_active, assigned_by, notes)
      values (p_user, v_seat, v_back, null, true, p_actor, 'عاد عضوًا بعد نزع منصبه.');
    end if;

    select committee_name_ar into v_name from committees where id = v_back;
    return jsonb_build_object('ok', true, 'code', 'RETURNED',
      'message', 'أُزيل من المنصب، وعاد عضوًا في ' || coalesce(v_name, 'لجنته السابقة') || '.',
      'removed', v_removed, 'returned_committee_id', v_back);
  end if;

  if v_live and not exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active) then
    raise exception using errcode = 'ADEEB', message = 'SOLE_SEAT';
  end if;

  return jsonb_build_object('ok', true, 'message', 'تمّت الإزالة.', 'removed', v_removed);
exception when sqlstate 'ADEEB' then
  return jsonb_build_object('ok', false, 'code', 'SOLE_SEAT',
    'message', 'هذا مقعدُه الوحيد، ولا عضويّةَ في أديب بلا مقعد: انقله إلى مقعدٍ آخر بالإسناد، أو أنهِ عضويّتَه من تبويب الأعضاء.');
end;
$function$;

CREATE OR REPLACE FUNCTION public.can_end_membership(p_actor uuid, p_target uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p_actor is distinct from p_target and member_within_reach(p_actor, p_target)
     -- وإنهاءُ عضويّة قائد الإدارة عزلٌ وزيادة: لا يكون إلّا بيد رئيس أدِيب (20261010).
     and (is_club_president(p_actor) or not exists (
           select 1 from user_roles v join roles r on r.role_name = v.role_name
           where v.user_id = p_target and v.is_active and r.removal_needs_club_president));
$function$;

CREATE OR REPLACE FUNCTION public.assign_supervision(p_actor uuid, p_user uuid, p_committee integer, p_unit integer DEFAULT NULL::integer, p_replace boolean DEFAULT false, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_unit        integer;
  v_units       integer;
  v_member_role text;
  v_existing    uuid;
begin
  if p_unit is not null then
    v_unit := p_unit;
  else
    select count(*), min(ur.committee_id) into v_units, v_unit
    from user_roles ur
    join committees c on c.id = ur.committee_id
    where ur.user_id = p_user and ur.is_active
      and c.council_id = 'administrative' and c.supervises and ur.role_name = c.member_role_name;

    if coalesce(v_units, 0) = 0 then
      return jsonb_build_object('ok', false, 'code', 'NOT_MEMBER',
        'message', 'هذا العضو ليس في إدارةٍ إداريّة — ضُمّه إلى إدارتك أوّلًا.');
    end if;
    if v_units > 1 then
      return jsonb_build_object('ok', false, 'code', 'AMBIGUOUS_UNIT',
        'message', 'هذا العضو في أكثر من إدارة — حدّد الإدارة المُشرِفة.');
    end if;
  end if;

  select c.member_role_name into v_member_role
  from committees c where c.id = v_unit and c.council_id = 'administrative' and c.is_active;
  if v_member_role is null then
    return jsonb_build_object('ok', false, 'code', 'NO_UNIT', 'message', 'الإدارة المُشرِفة غير موجودة.');
  end if;

  -- لا يشرف على اللجان إلّا الموارد والضمان؛ والإدارة التنفيذيّة ذراعُ الرئيس التنفيذيّ لا رقيب (20261010).
  if not coalesce((select c.supervises from committees c where c.id = v_unit), false) then
    return jsonb_build_object('ok', false, 'code', 'NO_SUPERVISION', 'message', 'هذه الإدارة لا تشرف على اللجان.');
  end if;

  if not can_assign_role(p_actor, v_member_role, v_unit) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN',
      'message', 'صلاحيتك لا تبلغ هذه الإدارة — لا توزّع إلّا أعضاء وحدتك.');
  end if;

  if not exists (
    select 1 from committees where id = p_committee and council_id = 'executive' and is_active
  ) then
    return jsonb_build_object('ok', false, 'code', 'NO_COMMITTEE',
      'message', 'الإشراف لا يقع إلّا على لجنةٍ تنفيذيّةٍ نشطة.');
  end if;

  if not exists (
    select 1 from user_roles ur
    where ur.user_id = p_user and ur.is_active
      and ur.role_name = v_member_role and ur.committee_id = v_unit
  ) then
    return jsonb_build_object('ok', false, 'code', 'NOT_MEMBER',
      'message', 'هذا العضو ليس في هذه الإدارة — ضُمّه إليها أوّلًا.');
  end if;

  select supervisor_id into v_existing
  from committee_supervision where committee_id = p_committee and unit_id = v_unit;

  if v_existing = p_user then
    return jsonb_build_object('ok', true, 'message', 'هذا الإشراف قائمٌ بالفعل.');
  end if;

  if v_existing is not null and not p_replace then
    return jsonb_build_object('ok', false, 'code', 'OCCUPIED',
      'message', 'لهذه اللجنة مشرفٌ من إدارتك. فعّل الاستبدال لإحلال غيره.',
      'current_user_id', v_existing);
  end if;

  if v_existing is not null then
    delete from committee_supervision where committee_id = p_committee and unit_id = v_unit;
  end if;

  insert into committee_supervision (committee_id, unit_id, supervisor_id, assigned_by, notes)
  values (p_committee, v_unit, p_user, p_actor, p_notes);

  return jsonb_build_object('ok', true, 'message', 'تمّ توزيع الإشراف.',
    'replaced_user_id', v_existing);
end;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_supervision_shape()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_member_role   text;
  v_unit_council  text;
  v_target        record;
begin
  select c.member_role_name, c.council_id into v_member_role, v_unit_council
  from committees c where c.id = new.unit_id;

  if v_unit_council is distinct from 'administrative' or v_member_role is null then
    raise exception 'المُشرِفة ليست إدارةً إداريّةً تُصرّح بدور عضوها.' using errcode = '23514';
  end if;

  if not coalesce((select c.supervises from committees c where c.id = new.unit_id), false) then
    raise exception 'هذه الإدارة لا تشرف على اللجان.' using errcode = '23514';
  end if;

  select c.council_id, c.is_active into v_target from committees c where c.id = new.committee_id;
  if v_target.council_id is distinct from 'executive' or not coalesce(v_target.is_active, false) then
    raise exception 'الإشراف لا يقع إلّا على لجنةٍ تنفيذيّةٍ نشطة.' using errcode = '23514';
  end if;

  if not exists (
    select 1 from user_roles ur
    where ur.user_id = new.supervisor_id and ur.is_active
      and ur.role_name = v_member_role and ur.committee_id = new.unit_id
  ) then
    raise exception 'المشرف ليس عضوًا في هذه الإدارة — ضُمّه إليها أوّلًا.' using errcode = '23514';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.exit_decider_roles(p_user uuid)
 RETURNS text[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select case
    when exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active
                   and ur.role_name = 'executive_council_president')
      then array['club_president']
    when exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active
                   and ur.role_name in ('hr_committee_leader', 'qa_committee_leader'))
      then array['club_president', 'executive_council_president']
    when exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active
                   and ur.role_name = 'qa_admin_member')
      then array['club_president', 'executive_council_president', 'qa_committee_leader']
    when exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active
                   and ur.role_name = 'exec_admin_member')
      then array['club_president', 'executive_council_president']
    else array['club_president', 'executive_council_president', 'hr_committee_leader']
  end;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_primary_role(p_user uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select r.role_name
  from user_roles ur join roles r on r.role_name = ur.role_name
  where ur.user_id = p_user and ur.is_active = true
  order by case r.role_name
    when 'club_president' then 1
    when 'executive_council_president' then 2 when 'hr_committee_leader' then 3
    when 'qa_committee_leader' then 4 when 'department_head' then 5
    when 'hr_admin_member' then 6 when 'qa_admin_member' then 7
    when 'exec_admin_member' then 8
    when 'committee_leader' then 9 when 'deputy_committee_leader' then 10
    when 'committee_member' then 11
    else 99 end
  limit 1;
$function$;

CREATE OR REPLACE FUNCTION public.request_my_account_deletion(p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid    uuid := auth.uid();
  v_door   text;
  v_at     timestamptz;
  v_gone   timestamptz;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'no_session', 'message', 'لا جلسةَ لك.');
  end if;

  select p.deletion_requested_at, p.deleted_at into v_at, v_gone
  from public.profiles p where p.id = v_uid;

  if not found then
    select q.requested_at into v_at
    from public.account_deletion_requests q
    where q.user_id = v_uid and q.closed_at is null;

    if v_at is not null then
      return jsonb_build_object('ok', true, 'code', 'already_requested', 'at', v_at,
                                'dueAt', v_at + interval '30 days', 'message', 'طلبُك قائمٌ من قبل.');
    end if;

    insert into public.account_deletion_requests (user_id, requested_at, reason, closed_at, closed_how)
    values (v_uid, now(), v_reason, null, null)
    on conflict (user_id) do update
      set requested_at = excluded.requested_at, reason = excluded.reason,
          closed_at = null, closed_how = null
    returning requested_at into v_at;

    insert into public.activity_log (user_id, action_type, target_type, target_id, details)
    values (null, 'request_account_deletion', 'auth_user', v_uid::text,
            jsonb_build_object('reason', v_reason, 'dueAt', v_at + interval '30 days', 'without_profile', true));

    return jsonb_build_object('ok', true, 'code', 'requested', 'at', v_at, 'dueAt', v_at + interval '30 days');
  end if;

  if v_gone is not null then
    return jsonb_build_object('ok', false, 'code', 'already_deleted', 'message', 'هذا الحسابُ محذوفٌ أصلًا.');
  end if;

  v_door := membership_exit_door(v_uid);
  if v_door = 'sealed' then
    return jsonb_build_object('ok', false, 'code', 'sealed', 'door', v_door,
      'message', 'مقعدُ رئيس أدِيب محميٌّ في القاعدة: لا يُخليه أحدٌ ولا تُخليه أنت، فلا سبيل إلى حذف الحساب من هنا.');
  elsif v_door = 'request' then
    return jsonb_build_object('ok', false, 'code', 'needs_request', 'door', v_door,
      'message', 'منصبُك يسبق حسابَك: اطلب إنهاء عضويّتك أوّلًا، فإذا أُقرّ صرتَ صاحبَ حسابٍ ولك الحذف.');
  elsif v_door = 'end_now' then
    return jsonb_build_object('ok', false, 'code', 'needs_end', 'door', v_door,
      'message', 'أنهِ عضويّتَك أوّلًا، ثمّ احذف حسابَك إن شئت.');
  end if;

  if v_at is not null then
    return jsonb_build_object('ok', true, 'code', 'already_requested', 'at', v_at,
                              'dueAt', v_at + interval '30 days', 'message', 'طلبُك قائمٌ من قبل.');
  end if;

  update public.profiles
     set deletion_requested_at = now(),
         deletion_reason       = v_reason,
         accepts_marketing     = false,
         updated_at            = now()
   where id = v_uid
  returning deletion_requested_at into v_at;

  insert into public.activity_log (user_id, action_type, target_type, target_id, details)
  values (v_uid, 'request_account_deletion', 'profile', v_uid::text,
          jsonb_build_object('reason', v_reason, 'dueAt', v_at + interval '30 days'));

  return jsonb_build_object('ok', true, 'code', 'requested', 'at', v_at, 'dueAt', v_at + interval '30 days');
end;
$function$;

do $$
begin
  if (select role_name_ar from roles where role_name = 'club_president') <> 'رئيس أدِيب'
     or (select role_name_ar from roles where role_name = 'executive_council_president') <> 'الرئيس التنفيذي'
     or (select name_ar from councils where id = 'executive') <> 'المجلس التشغيلي'
     or not exists (select 1 from committees c join roles r on r.home_committee_id = c.id
                    where r.role_name = 'exec_admin_member' and c.committee_name_ar = 'الإدارة التنفيذية'
                      and c.leader_role_name = 'executive_council_president' and not c.supervises)
     or (select count(*) from committees where supervises) <> 2
     or not (select votes_in_all_elections from roles where role_name = 'qa_committee_leader')
     or (select count(*) from roles where removal_needs_club_president) <> 2
     or (select count(*) from role_permissions where role_name = 'exec_admin_member') <> 2
     or (select count(*) from position_authority where 'exec_admin_member' = any (target_roles)) <> 2
  then
    raise exception 'الهيكلة الجديدة لم تُضبط كما يجب';
  end if;
end $$;
