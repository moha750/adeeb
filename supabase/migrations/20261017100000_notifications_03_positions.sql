-- نظامُ الإشعارات (٣): المناصب تُبلَّغ (٢٠٢٦-١٠-١٧، بموافقة محمد).
--
-- كلُّ تغيّرٍ في منصب عضوٍ يطلق واقعةً في `notification_events` من **داخل دالّته** (§٣أ في
-- v2/NOTIFICATIONS-SYSTEM.md): فتنجح الواقعةُ والتغيّرُ معًا أو يسقطان معًا، ويلتقطها كلُّ بابٍ يمرّ
-- بالدالّة (شاشةُ الهيكلة، والانتخابات، وقبولُ المتطوّع عضوًا، وكنّاسُ التكليف المجدول).
--
-- الوقائع: position.assigned · position.removed · acting.assigned · acting.extended · acting.ended
--          supervision.assigned · supervision.removed
-- ونصوصُها ومستلموها في الدليل (`lib/notifications/catalog.ts`). والحقائقُ أسماءٌ كما كانت لحظتَها.
--
-- **ولا يُبلَّغ ما لم يتغيّر**: إسنادُ مقعدٍ يشغله صاحبه أصلًا لا يطلق شيئًا. **ولا انتهاءُ العضويّة**:
-- سقوطُ المناصب معها خبرُ العضويّة لا خبرُ المنصب (`_apply_termination` لا يطلق، و`_end_acting`
-- يسكت عن `membership_ended`)، وله بريدُه في خطوته. **ولا من أخذ المقعدَ أصيلًا بعد تكليفه عليه**
-- (`took_seat`): يصله خبرُ الإسناد، فلا يصله معه «انتهى تكليفك».

-- ══ قناةُ البريد في الصندوق ══════════════════════════════════════════════════════
-- كـ`pushed_at`: يُكتب حين قبل مزوّدُ البريد الرسالة، والخطأُ يُحفظ ليُقرأ ويُعاد.
alter table public.notification_inbox
  add column if not exists emailed_at  timestamptz,
  add column if not exists email_error text;

-- ══ حقائقُ المقعد ════════════════════════════════════════════════════════════════
-- الرتبةُ عاريةً والوحدةُ وحدَها (توأما `positionParts`)، فيصرّف الدليلُ الرتبةَ بجنس قارئه (`rankFor`).
create or replace function public._position_facts(p_role text, p_committee integer, p_department integer)
returns jsonb
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select jsonb_build_object(
    'rank', coalesce((select r.role_name_ar from roles r where r.role_name = p_role), p_role),
    'unit', coalesce((select c.committee_name_ar from committees c where c.id = p_committee),
                     (select d.name_ar from departments d where d.id = p_department)));
$$;

-- حقائقُ الإشراف: اللجنةُ والإدارةُ المشرفة، واسمُ المشرف وجنسُه (يقرؤهما قائدُ اللجنة في نصّه).
create or replace function public._supervision_facts(p_user uuid, p_committee integer, p_unit integer)
returns jsonb
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select jsonb_build_object(
    'userId', p_user,
    'committeeId', p_committee,
    'committee', (select c.committee_name_ar from committees c where c.id = p_committee),
    'unit', (select c.committee_name_ar from committees c where c.id = p_unit),
    'name', (select p.full_name from profiles p where p.id = p_user),
    'gender', (select p.gender from profiles p where p.id = p_user));
$$;

-- مساعدان لا يُناديهما إلّا ما في القاعدة (وُلدا مغلقَين، §الأمن ٢٠٢٦-١٠-١٠).
revoke all on function public._position_facts(text, integer, integer) from public, anon, authenticated;
revoke all on function public._supervision_facts(uuid, integer, integer) from public, anon, authenticated;

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
  v_was_live             boolean;
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
      -- ومن استُبدل يُبلَّغ بإزالته (٢٠٢٦-١٠-١٧). والمكلَّفُ يبلغه خبرُه من `_end_acting`.
      perform notify_event('position.removed',
        _position_facts(v_role_name, p_committee, p_department)
          || jsonb_build_object('userId', v_existing_user, 'how', 'replaced'),
        p_actor);
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

  select id, is_active into v_row_id, v_was_live
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

  -- إشعارُ الإسناد (٢٠٢٦-١٠-١٧): لصاحبه، ومعه المقعدُ الذي نُقل منه إن كان. ومن كان في المقعد
  -- أصلًا لا يُبلَّغ بما لم يتغيّر.
  if not coalesce(v_was_live, false) then
    perform notify_event('position.assigned',
      _position_facts(v_role_name, p_committee, p_department)
        || jsonb_build_object(
             'userId', p_user,
             'from', case when v_vacated is not null then
                       _position_facts(v_vacated->0->>'role_name',
                                       (v_vacated->0->>'committee_id')::integer,
                                       (v_vacated->0->>'department_id')::integer) end),
      p_actor);
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
  v_dept    integer;
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

  -- قسمُ المقعد يُحفظ قبل إطفائه: «منسّق القسم» لا لجنةَ له، فاسمُ وحدته من قسمه (للإشعار).
  select ur.department_id into v_dept from user_roles ur
  where ur.user_id = p_user and ur.role_name = p_role_name and ur.is_active and not ur.is_acting
    and ur.committee_id is not distinct from p_committee
  limit 1;

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

    -- إشعارُ الإزالة (٢٠٢٦-١٠-١٧)، ومعه المقعدُ الذي عاد إليه.
    perform notify_event('position.removed',
      _position_facts(p_role_name, p_committee, v_dept)
        || jsonb_build_object('userId', p_user, 'how', 'removed',
                              'back', _position_facts(v_seat, v_back, null)),
      p_actor);
    return jsonb_build_object('ok', true, 'code', 'RETURNED',
      'message', 'أُزيل من المنصب، وعاد عضوًا في ' || coalesce(v_name, 'لجنته السابقة') || '.',
      'removed', v_removed, 'returned_committee_id', v_back);
  end if;

  if v_live and not exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active and not ur.is_acting) then
    raise exception using errcode = 'ADEEB', message = 'SOLE_SEAT';
  end if;

  perform notify_event('position.removed',
    _position_facts(p_role_name, p_committee, v_dept)
      || jsonb_build_object('userId', p_user, 'how', 'removed'),
    p_actor);

  return jsonb_build_object('ok', true, 'message', 'تمّت الإزالة.', 'removed', v_removed);
exception when sqlstate 'ADEEB' then
  return jsonb_build_object('ok', false, 'code', 'SOLE_SEAT',
    'message', 'هذا مقعدُه الوحيد، ولا عضويّةَ في أديب بلا مقعد: انقله إلى مقعدٍ آخر بالإسناد، أو أنهِ عضويّتَه من تبويب الأعضاء.');
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

  -- إشعارُ التكليف (٢٠٢٦-١٠-١٧): أجلُه تاريخٌ أو عودةُ صاحب المقعد، ومعه منصبُه المجمَّد إن جُمِّد.
  perform notify_event('acting.assigned',
    _position_facts(v_role.role_name, p_committee, p_department)
      || jsonb_build_object(
           'userId', p_user,
           'until', case when v_parent is null then p_until end,
           'owner', case when v_parent is not null then v_owner end,
           'frozen', case when coalesce(p_freeze, false)
                          then _position_facts(v_base.role_name, v_base.committee_id, v_base.department_id) end),
    p_actor);

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

CREATE OR REPLACE FUNCTION public.extend_acting(p_actor uuid, p_row integer, p_until date, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_row   user_roles%rowtype;
  v_today date := (now() at time zone 'Asia/Riyadh')::date;
begin
  select * into v_row from user_roles where id = p_row for update;
  if not found or not v_row.is_acting or not v_row.is_active then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا تكليفَ قائمًا بهذا الرقم.');
  end if;
  if v_row.acting_parent_id is not null then
    return jsonb_build_object('ok', false, 'code', 'CHAINED',
      'message', 'هذا التكليف ينتهي بعودة صاحب المقعد، فلا تاريخ له.');
  end if;
  if p_actor = v_row.user_id then
    return jsonb_build_object('ok', false, 'code', 'SELF', 'message', 'لا يُعدِّل أحدٌ تكليفَ نفسه.');
  end if;
  if not can_assign_role(p_actor, v_row.role_name, v_row.committee_id)
     or not can_take_position_from(p_actor, v_row.user_id) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'صلاحيتك لا تبلغ هذا التكليف.');
  end if;
  -- تقديمُ أجلِ التكليف على مقعد قائد إدارةٍ كإنهائه قبل أجله: بيد رئيس أدِيب وحده (المادة ٣٥).
  if p_until is not null and v_row.acting_until is not null and p_until < v_row.acting_until
     and exists (select 1 from roles r where r.role_name = v_row.role_name and r.removal_needs_club_president)
     and not is_club_president(p_actor) then
    return jsonb_build_object('ok', false, 'code', 'NEEDS_CLUB_PRESIDENT',
      'message', 'لا يُقدَّم أجلُ تكليف قائد إدارةٍ إلّا بيد رئيس أدِيب.');
  end if;
  if p_until is null or p_until < v_today then
    return jsonb_build_object('ok', false, 'code', 'PAST_UNTIL', 'message', 'آخر يومٍ في التكليف لا يسبق اليوم.');
  end if;
  if p_until = v_row.acting_until then
    return jsonb_build_object('ok', false, 'code', 'SAME', 'message', 'هذا آخر يومٍ في التكليف أصلًا.');
  end if;

  update user_roles set acting_until = p_until where id = p_row;

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (p_actor, 'extend_acting', 'user_role', p_row::text,
          jsonb_build_object('user_id', v_row.user_id, 'from', v_row.acting_until, 'to', p_until,
                             'reason', nullif(btrim(coalesce(p_reason, '')), '')));

  perform notify_event('acting.extended',
    _position_facts(v_row.role_name, v_row.committee_id, v_row.department_id)
      || jsonb_build_object('userId', v_row.user_id, 'until', p_until, 'was', v_row.acting_until),
    p_actor);

  return jsonb_build_object('ok', true,
    'message', 'صار آخر يومٍ في التكليف ' || to_char(p_until, 'YYYY-MM-DD') || '.');
end;
$function$;

CREATE OR REPLACE FUNCTION public._end_acting(p_row integer, p_actor uuid, p_how text, p_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_row   user_roles%rowtype;
  v_child integer;
  v_base  integer;
begin
  select * into v_row from user_roles where id = p_row for update;
  if not found or not v_row.is_acting or not v_row.is_active then
    return;
  end if;

  for v_child in
    select id from user_roles
    where acting_parent_id = p_row and is_active and is_acting
    order by id
  loop
    perform _end_acting(v_child, p_actor, 'parent_ended', null);
  end loop;

  update user_roles set is_active = false, acting_end = p_how where id = p_row;

  if is_adeeb_member(v_row.user_id) then
    update user_roles set is_active = true, frozen_by = null
    where frozen_by = p_row
    returning id into v_base;
  else
    update user_roles set frozen_by = null where frozen_by = p_row;
  end if;

  -- إشعارُ انتهاء التكليف (٢٠٢٦-١٠-١٧)، ومعه المنصبُ الأصيلُ الذي عاد إليه. ويسكت عن انتهاء العضويّة
  -- (خبرُها خبرُ العضويّة) وعمّن أخذ المقعدَ أصيلًا (يصله خبرُ الإسناد).
  if p_how not in ('membership_ended', 'took_seat') then
    perform notify_event('acting.ended',
      _position_facts(v_row.role_name, v_row.committee_id, v_row.department_id)
        || jsonb_build_object(
             'userId', v_row.user_id,
             'how', p_how,
             'back', (select _position_facts(b.role_name, b.committee_id, b.department_id)
                        from user_roles b where b.id = v_base)),
      p_actor);
  end if;

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (p_actor, 'end_acting', 'user_role', p_row::text,
          jsonb_build_object('user_id', v_row.user_id, 'role_name', v_row.role_name,
                             'committee_id', v_row.committee_id, 'department_id', v_row.department_id,
                             'how', p_how, 'note', p_note, 'returned_role_id', v_base));
end;
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

  -- إشعارُ الإشراف (٢٠٢٦-١٠-١٧): للمشرف ولقائد اللجنة. ومن استُبدل يُبلَّغ بسحبه، ولا يُبلَّغ
  -- القائدُ بالسحب حينئذٍ (`replaced`): يكفيه خبرُ المشرف الجديد.
  if v_existing is not null then
    perform notify_event('supervision.removed',
      _supervision_facts(v_existing, p_committee, v_unit) || jsonb_build_object('replaced', true),
      p_actor);
  end if;
  perform notify_event('supervision.assigned', _supervision_facts(p_user, p_committee, v_unit), p_actor);

  return jsonb_build_object('ok', true, 'message', 'تمّ توزيع الإشراف.',
    'replaced_user_id', v_existing);
end;
$function$;

CREATE OR REPLACE FUNCTION public.revoke_supervision(p_actor uuid, p_user uuid, p_committee integer, p_unit integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_unit        integer;
  v_member_role text;
  v_removed     integer;
begin
  select cs.unit_id into v_unit
  from committee_supervision cs
  where cs.committee_id = p_committee and cs.supervisor_id = p_user
    and (p_unit is null or cs.unit_id = p_unit);

  if v_unit is null then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا إشراف قائمًا بهذه الصفة.');
  end if;

  select c.member_role_name into v_member_role from committees c where c.id = v_unit;

  if not can_assign_role(p_actor, v_member_role, v_unit) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN',
      'message', 'صلاحيتك لا تبلغ هذه الإدارة — لا تسحب إلّا من أعضاء وحدتك.');
  end if;

  delete from committee_supervision
  where committee_id = p_committee and unit_id = v_unit and supervisor_id = p_user;
  get diagnostics v_removed = row_count;

  if v_removed > 0 then
    perform notify_event('supervision.removed',
      _supervision_facts(p_user, p_committee, v_unit) || jsonb_build_object('replaced', false),
      p_actor);
  end if;

  return jsonb_build_object('ok', true, 'message', 'سُحب الإشراف.', 'removed', v_removed);
end;
$function$;
