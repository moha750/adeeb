-- المنصبان الرئيسان ثابتان (قرار محمد، 2026-10-10).
--
-- رئيس أدِيب كان محميًّا وحده: لا يُزال (`revoke_position`)، ولا يملك أحدٌ التعيينَ في مقعده
-- (لا صفَّ في `position_authority` يستهدفه). والرئيسُ التنفيذيّ كان يملك رئيسُ أدِيب استبدالَه وإزالتَه.
-- فقال محمد: «اجعل مقعد الرئيس التنفيذي محميًّا مثله مثل مقعد رئيس أدِيب». فصار مثلَه في الأربعة:
--   • لا يُزال: `revoke_position` يردّ `PROTECTED`.
--   • لا يُسنَد ولا يُستبدَل: `assign_position` يردّ `PROTECTED` قبل فحص السلطة.
--   • لا يُجمَّد بتكليف صاحبه في غيره: `assign_acting` يردّ `PROTECTED`.
--   • ولا يملك أحدٌ التعيينَ فيه: يُنزع من أهداف رئيس أدِيب في `position_authority`.
-- وتغييرُ أيٍّ منهما عند نهاية الدورة لا يكون من شاشات المناصب، بل من «تسليم المنصب» حين يُبنى
-- (اتُّفق عليه مؤجَّلًا)، وإلى ذلك من القاعدة.
--
-- رُقِّعت الدوالُّ الثلاث على تعريفها الحيّ (لا على ملفّ ترحيلٍ سابق)، ويحرسها في التطبيق md5 ما بُني عليه.

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
  -- المنصبان الرئيسان ثابتان: رئيس أدِيب، والرئيس التنفيذيّ مثله (قرار محمد 2026-10-10).
  if p_role_name in ('club_president', 'executive_council_president') then
    return jsonb_build_object('ok', false, 'code', 'PROTECTED', 'message',
      case p_role_name when 'club_president' then 'لا يمكن إزالة رئيس أدِيب من هنا.'
                       else 'لا يمكن إزالة الرئيس التنفيذي من هنا.' end);
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

  -- المجمَّد لا يُنزع حتّى ينتهي تكليف صاحبه، والتكليف يُنهى من بابه (2026-10-10).
  if exists (select 1 from user_roles where user_id = p_user and role_name = p_role_name
               and frozen_by is not null and committee_id is not distinct from p_committee) then
    return jsonb_build_object('ok', false, 'code', 'FROZEN',
      'message', 'منصبه هذا مجمَّدٌ بتكليف: أنهِ التكليف أوّلًا.');
  end if;
  if exists (select 1 from user_roles where user_id = p_user and role_name = p_role_name
               and is_active and is_acting and committee_id is not distinct from p_committee)
     and not exists (select 1 from user_roles where user_id = p_user and role_name = p_role_name
               and is_active and not is_acting and committee_id is not distinct from p_committee) then
    return jsonb_build_object('ok', false, 'code', 'ACTING',
      'message', 'هذا تكليف، ويُنهى من باب التكليف.');
  end if;

  update user_roles
  set is_active = false
  where user_id = p_user and role_name = p_role_name and is_active and not is_acting
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
      where ur.user_id = p_user and not ur.is_active and not ur.is_acting and ur.frozen_by is null
        and c.is_active and ur.role_name = c.member_role_name
      order by ur.assigned_at desc nulls last
      limit 1;
    end if;
  end if;

  if v_back is not null and v_seat is not null then
    select id into v_row from user_roles
    where user_id = p_user and role_name = v_seat and committee_id = v_back and not is_acting
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

  if v_live and not exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active and not ur.is_acting) then
    raise exception using errcode = 'ADEEB', message = 'SOLE_SEAT';
  end if;

  return jsonb_build_object('ok', true, 'message', 'تمّت الإزالة.', 'removed', v_removed);
exception when sqlstate 'ADEEB' then
  return jsonb_build_object('ok', false, 'code', 'SOLE_SEAT',
    'message', 'هذا مقعدُه الوحيد، ولا عضويّةَ في أديب بلا مقعد: انقله إلى مقعدٍ آخر بالإسناد، أو أنهِ عضويّتَه من تبويب الأعضاء.');
end;
$function$;

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
  v_took                 integer;
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

  -- المنصبان الرئيسان ثابتان: لا يُسنَدان ولا يُستبدَلان من شاشات المناصب، رئيس أدِيب والرئيس
  -- التنفيذيّ مثله (قرار محمد 2026-10-10). يُقال قبل فحص السلطة، فتصل الرسالةُ الصادقة لا «لا تملك».
  if v_role_name in ('club_president', 'executive_council_president') then
    return jsonb_build_object('ok', false, 'code', 'PROTECTED',
      'message', 'هذا المنصب ثابت: لا يُسنَد ولا يُستبدَل من هنا.');
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
    where ur.user_id = p_user and ur.is_active and not ur.is_acting and ur.role_name = v_prereq
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
      'held_role_name', (select ur.role_name from user_roles ur where ur.user_id = p_user and ur.is_active order by ur.is_acting limit 1));
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
  where ur.user_id = p_user and ur.is_active and not ur.is_acting
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

  -- (4ب) التكليف (2026-10-10): من أُسنِد إليه المقعدُ المكلَّفُ به انتهى تكليفه أوّلًا فعاد أصيله، ثمّ
  --      يُنقل كما يُنقل كلُّ أحد. ومن جُمِّد منصبه بتكليفٍ على غير هذا المقعد لا يُنقل حتّى ينتهي تكليفه.
  select ur.id into v_took
  from user_roles ur
  where ur.user_id = p_user and ur.is_active and ur.is_acting
    and ur.role_name = v_role_name
    and ur.committee_id is not distinct from p_committee
    and (p_committee is not null or ur.department_id is not distinct from p_department)
  limit 1;

  if v_took is null and exists (select 1 from user_roles ur where ur.user_id = p_user and ur.frozen_by is not null) then
    return jsonb_build_object('ok', false, 'code', 'FROZEN',
      'message', 'منصب هذا العضو مجمَّدٌ بتكليف: أنهِ التكليف أوّلًا ثمّ أسنِد له.');
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

  -- والمقعد المجمَّد محجوزٌ لصاحبه حتّى يعود (2026-10-10)، ولو جلس فيه مكلَّفٌ تابع: لا يُسنَد دائمًا لغيره.
  if v_uniq is distinct from 'multi' and v_uniq is not null and exists (
    select 1 from user_roles ur
    where ur.role_name = v_role_name and ur.frozen_by is not null and ur.user_id <> p_user
      and (v_uniq <> 'per_committee'  or ur.committee_id  is not distinct from p_committee)
      and (v_uniq <> 'per_department' or ur.department_id is not distinct from p_department)
  ) then
    return jsonb_build_object('ok', false, 'code', 'RESERVED',
      'message', 'هذا المقعد محجوزٌ لصاحبه المجمَّد بالتكليف حتّى يعود إليه.');
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
    -- المكلَّف يُستبدَل بإنهاء تكليفه من بابه، فيعود أصيله المجمَّد وينتهي التابعون (2026-10-10).
    if exists (select 1 from user_roles where id = v_existing_id and is_acting) then
      perform _end_acting(v_existing_id, p_actor, 'replaced', p_notes);
    else
      update user_roles set is_active = false where id = v_existing_id;
    end if;
  end if;

  if v_took is not null then
    perform _end_acting(v_took, p_actor, 'took_seat', p_notes);
  end if;

  -- (5) الإخلاء: يُطفأ ما كان قبل أن يُكتَب ما صار — في المعاملة نفسها.
  with vac as (
    update user_roles ur set is_active = false
    where ur.user_id = p_user and ur.is_active and not ur.is_acting
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
  where user_id = p_user and role_name = v_role_name and not is_acting
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

CREATE OR REPLACE FUNCTION public.assign_acting(p_actor uuid, p_user uuid, p_role_name text, p_committee integer, p_department integer, p_until date, p_freeze boolean, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_role    roles%rowtype;
  v_today   date := (now() at time zone 'Asia/Riyadh')::date;
  v_reason  text := nullif(btrim(coalesce(p_reason, '')), '');
  v_base    user_roles%rowtype;
  v_acting  text;
  v_parent  integer;
  v_owner   text;
  v_prereq  text;
  v_new     integer;
begin
  if not exists (
    select 1 from user_roles ur
    join position_authority pa on pa.role_name = ur.role_name
    where ur.user_id = p_actor and ur.is_active
  ) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'لا تملك صلاحية إدارة الهيكلة.');
  end if;

  if p_actor = p_user then
    return jsonb_build_object('ok', false, 'code', 'SELF', 'message', 'لا يُكلِّف أحدٌ نفسَه.');
  end if;

  if not is_adeeb_member(p_user) then
    return jsonb_build_object('ok', false, 'code', 'NOT_MEMBER',
      'message', 'التكليف لا يكون إلّا لعضوٍ في أدِيب الآن.');
  end if;

  select * into v_role from roles where role_name = p_role_name;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NO_ROLE', 'message', 'المنصب غير موجود.');
  end if;
  if v_role.role_name = 'adeeb_admin' then
    return jsonb_build_object('ok', false, 'code', 'NOT_ACTABLE', 'message', 'هذا المقعد لا يُكلَّف به.');
  end if;
  -- الموارد والضمان جهتا رقابة تحتاجان أعضاءً ثابتين مستقلّين، فلا يُكلَّف فيهما عضو (قرار محمد، 2026-10-10).
  -- والتكليف في مقاعد أعضاء الإدارات للإدارة التنفيذيّة وحدها، حين تُنشأ.
  if v_role.role_name in ('hr_admin_member', 'qa_admin_member') then
    return jsonb_build_object('ok', false, 'code', 'NOT_ACTABLE',
      'message', 'لا يُكلَّف أحدٌ عضوًا في الموارد البشريّة ولا في الضمان والجودة.');
  end if;

  -- النطاق كما يقرؤه `assign_position`.
  if v_role.role_name in ('club_president', 'executive_council_president') then
    p_committee  := null;
    p_department := null;
  end if;
  if v_role.role_name in ('committee_leader','deputy_committee_leader','committee_member',
                          'hr_admin_member','qa_admin_member','exec_admin_member',
                          'hr_committee_leader','qa_committee_leader')
     and p_committee is null then
    return jsonb_build_object('ok', false, 'code', 'NEED_COMMITTEE', 'message', 'هذا المنصب يتطلّب تحديد لجنة.');
  end if;
  if v_role.role_name = 'department_head' and p_department is null then
    return jsonb_build_object('ok', false, 'code', 'NEED_DEPARTMENT', 'message', 'هذا المنصب يتطلّب تحديد قسم.');
  end if;
  if p_committee is not null and not exists (select 1 from committees where id = p_committee) then
    return jsonb_build_object('ok', false, 'code', 'NO_COMMITTEE', 'message', 'اللجنة غير موجودة.');
  end if;
  if p_department is not null and not exists (select 1 from departments where id = p_department) then
    return jsonb_build_object('ok', false, 'code', 'NO_DEPARTMENT', 'message', 'القسم غير موجود.');
  end if;
  if (p_committee is not null and v_role.home_committee_id is not null and p_committee <> v_role.home_committee_id)
     or not seat_declared_by_unit(v_role.role_name, p_committee) then
    return jsonb_build_object('ok', false, 'code', 'WRONG_UNIT', 'message', 'هذه الوحدة لا تُصرّح بهذا المنصب.');
  end if;

  if not can_assign_role(p_actor, v_role.role_name, p_committee) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'صلاحيتك لا تبلغ هذا المنصب.');
  end if;
  if not can_take_position_from(p_actor, p_user) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN_HOLDER',
      'message', 'هذا العضو في موضعٍ لا تطوله يدُك.');
  end if;

  -- المكلَّف: تكليفٌ واحدٌ في المرّة، وأصيلٌ حيٌّ لا يكون هو المقعد نفسه.
  select coalesce(ro.role_name_ar, ur.role_name) into v_acting
  from user_roles ur left join roles ro on ro.role_name = ur.role_name
  where ur.user_id = p_user and ur.is_active and ur.is_acting
  limit 1;
  if v_acting is not null then
    return jsonb_build_object('ok', false, 'code', 'ALREADY_ACTING',
      'message', 'هذا العضو مكلَّفٌ الآن بـ«' || v_acting || '»، فأنهِ تكليفه قبل تكليفٍ آخر.');
  end if;

  select * into v_base from user_roles
  where user_id = p_user and is_active and not is_acting
  limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NO_BASE', 'message', 'لا منصبَ أصيلًا لهذا العضو.');
  end if;
  if v_base.role_name = v_role.role_name
     and v_base.committee_id is not distinct from p_committee
     and (p_committee is not null or v_base.department_id is not distinct from p_department) then
    return jsonb_build_object('ok', false, 'code', 'SAME_SEAT', 'message', 'هذا مقعده الأصيل.');
  end if;

  if v_role.prerequisite_role_name is not null and v_base.role_name <> v_role.prerequisite_role_name then
    select coalesce(role_name_ar, v_role.prerequisite_role_name) into v_prereq
    from roles where role_name = v_role.prerequisite_role_name;
    return jsonb_build_object('ok', false, 'code', 'NEEDS_PREREQUISITE',
      'message', 'هذا المنصب لا يُسنَد إلّا لمن هو «' || v_prereq || '» الآن.');
  end if;

  -- عضو الإدارة لا يُكلَّف بمقعدٍ تشغيليّ (قرار محمد في نقاش الهيكلة، 2026-10-10): المشرف إن قاد ما يشرف
  -- عليه صار يراقب نفسه، والبديل الطبيعيّ للقائد الغائب نائبُه.
  if v_base.role_name in ('hr_admin_member', 'qa_admin_member', 'exec_admin_member')
     and v_role.role_name in ('department_head', 'committee_leader', 'deputy_committee_leader') then
    return jsonb_build_object('ok', false, 'code', 'ADMIN_NOT_OPERATIONAL',
      'message', 'عضو الإدارة لا يُكلَّف بمقعدٍ تشغيليّ.');
  end if;

  -- والتجميد إخلاءٌ مؤقّتٌ لمقعده، فلا يجمّده إلّا من يملك التعيين فيه، ما لم يكن عضو لجنة (المبدأ نفسه في
  -- `assign_position`: من يملك التعيين في المقعد يملك إخلاءه، 2026-10-10).
  if coalesce(p_freeze, false) and v_base.role_name <> 'committee_member'
     and not can_assign_role(p_actor, v_base.role_name, v_base.committee_id) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN_SEAT',
      'message', 'لا يجمّد منصبَه إلّا من يملك التعيين فيه.');
  end if;

  if coalesce(p_freeze, false)
     and exists (select 1 from roles r where r.role_name = v_base.role_name and r.removal_needs_club_president)
     and not is_club_president(p_actor) then
    return jsonb_build_object('ok', false, 'code', 'NEEDS_CLUB_PRESIDENT',
      'message', 'لا يُجمَّد منصب قائد إدارةٍ إلّا بيد رئيس أدِيب.');
  end if;

  if coalesce(p_freeze, false) and v_base.role_name in ('club_president', 'executive_council_president', 'adeeb_admin') then
    return jsonb_build_object('ok', false, 'code', 'PROTECTED', 'message', 'هذا المنصب لا يُجمَّد.');
  end if;

  -- المقعد: شاغرٌ، أو محجوزٌ لصاحبه المجمَّد فيتبع هذا التكليفُ تكليفَه.
  if v_role.holder_uniqueness is distinct from 'multi' and v_role.holder_uniqueness is not null then
    if exists (
      select 1 from user_roles ur
      where ur.role_name = v_role.role_name and ur.is_active and ur.user_id <> p_user
        and (v_role.holder_uniqueness <> 'per_committee'  or ur.committee_id  is not distinct from p_committee)
        and (v_role.holder_uniqueness <> 'per_department' or ur.department_id is not distinct from p_department)
    ) then
      return jsonb_build_object('ok', false, 'code', 'OCCUPIED',
        'message', 'المقعد مشغول، والتكليف لا يقع إلّا على مقعدٍ شاغر.');
    end if;

    select ur.frozen_by, pr.full_name into v_parent, v_owner
    from user_roles ur
    join profiles pr on pr.id = ur.user_id
    where ur.role_name = v_role.role_name and ur.frozen_by is not null and ur.user_id <> p_user
      and (v_role.holder_uniqueness <> 'per_committee'  or ur.committee_id  is not distinct from p_committee)
      and (v_role.holder_uniqueness <> 'per_department' or ur.department_id is not distinct from p_department)
    limit 1;
  end if;

  if v_parent is null then
    if p_until is null then
      return jsonb_build_object('ok', false, 'code', 'NEED_UNTIL', 'message', 'حدِّد آخر يومٍ في التكليف.');
    end if;
    if p_until < v_today then
      return jsonb_build_object('ok', false, 'code', 'PAST_UNTIL', 'message', 'آخر يومٍ في التكليف لا يسبق اليوم.');
    end if;
  end if;

  if v_reason is null or char_length(v_reason) < 5 then
    return jsonb_build_object('ok', false, 'code', 'NEED_REASON', 'message', 'اكتب سبب التكليف، خمسة أحرفٍ فأكثر.');
  end if;

  insert into user_roles (user_id, role_name, committee_id, department_id, is_active, assigned_by, notes,
                          is_acting, acting_until, acting_parent_id)
  values (p_user, v_role.role_name, p_committee, p_department, true, p_actor, v_reason,
          true, case when v_parent is null then p_until end, v_parent)
  returning id into v_new;

  if coalesce(p_freeze, false) then
    update user_roles set is_active = false, frozen_by = v_new where id = v_base.id;
  end if;

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (p_actor, 'assign_acting', 'user_role', v_new::text,
          jsonb_build_object('user_id', p_user, 'role_name', v_role.role_name,
                             'committee_id', p_committee, 'department_id', p_department,
                             'until', case when v_parent is null then p_until end, 'parent_id', v_parent,
                             'frozen_role_id', case when coalesce(p_freeze, false) then v_base.id end,
                             'reason', v_reason));

  return jsonb_build_object(
    'ok', true, 'code', 'ACTING',
    'message', case when v_parent is not null then 'كُلِّف حتّى يعود ' || coalesce(v_owner, 'صاحب المقعد') || ' إلى مقعده.'
                    else 'كُلِّف حتّى ' || to_char(p_until, 'YYYY-MM-DD') || '.' end
               || case when coalesce(p_freeze, false) then ' وجُمِّد منصبه الأصيل حتّى ينتهي التكليف.' else '' end,
    'user_role_id', v_new,
    'until', case when v_parent is null then p_until end,
    'parent_id', v_parent,
    'frozen_role_id', case when coalesce(p_freeze, false) then v_base.id end
  );
end;
$function$;

update public.position_authority
set target_roles = array_remove(target_roles, 'executive_council_president'),
    note = 'رئيس أدِيب — كلّ منصبٍ في كلّ وحدة، إلّا مقعدَه ومقعدَ الرئيس التنفيذيّ (ثابتان، 2026-10-10).'
where role_name = 'club_president';
