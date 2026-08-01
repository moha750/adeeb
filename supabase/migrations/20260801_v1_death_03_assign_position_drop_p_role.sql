-- موت V1 — تسديد البند ٣: نزع `p_role` من `assign_position`
--
-- ═══ العلّة ═══
--
-- معاملان لمعنًى واحد: `p_role integer` و`p_role_name text`. والهويّة صارت الاسم
-- في القاعدة كلّها بعد ترحيلَي البندين ١ و٢، فلم يبقَ للرقم إلّا أن يكون بابًا
-- ثانيًا إلى نفس الغرفة.
--
-- ═══ التحقّق قبل النزع ═══
--
--   • V2: `dashboard/members/structure/actions.ts:46` ينادي بستّة معاملات **مسمّاة**
--     (`p_actor · p_user · p_role_name · p_committee · p_department · p_replace`) — لا يمرّر `p_role`.
--   • القاعدة: `auto_grant_winner_role` (تريغر إعلان الفائز) ينادي بالاسم كذلك
--     (`p_actor => … , p_role_name => NEW.target_role_name`).
--   • دوالّ الحافّة: صفر مطابقة.
--   ولمّا كان كلّ نداءٍ مسمًّى، فإعادةُ ترتيب المعاملات آمنة — والاسم يحلّ محلّ الرقم
--   في موضعه بدل أن يبقى آخر القائمة.
--
-- ═══ لماذا إسقاطٌ صريح لا `create or replace` ═══
--
-- تغيير قائمة المعاملات يُنشئ **حِملًا زائدًا** لا يستبدل: تبقى نسخة الثمانية حيّة
-- إلى جانب السبعة، فيلتبس على PostgREST أيّهما يُنادى (PGRST203). فالإسقاط أوّلًا.
--
-- ═══ وتسديدٌ جانبيّ للبند ٦ ═══
--
-- نُزع `activity_coordinator` من كتلتَي الرتبة ومن `v_no_scope` في نفس الإنشاء —
-- فلا يُعاد كتابة جسدٍ من مئتَي سطرٍ مرّتين. والرتب أُعيد ترقيمها ١..١١ بلا فجوة،
-- مطابقةً لـ`v2/apps/web/src/lib/roleOrder.ts` حرفًا بحرف.

begin;

drop function public.assign_position(uuid, uuid, integer, integer, integer, boolean, text, text);

create function public.assign_position(
  p_actor      uuid,
  p_user       uuid,
  p_role_name  text    default null,
  p_committee  integer default null,
  p_department integer default null,
  p_replace    boolean default false,
  p_notes      text    default null
) returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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
      when 'committee_leader' then 9 when 'deputy_committee_leader' then 10
      when 'committee_member' then 11
      else 99 end)
  into v_actor_rank
  from user_roles ur
  where ur.user_id = p_actor and ur.is_active;

  if not exists (select 1 from profiles where id = p_user) then
    return jsonb_build_object('ok', false, 'code', 'NO_USER', 'message', 'العضو غير موجود.');
  end if;

  -- (1أ) المرجع: الاسم وحده. لا بابَ ثانٍ.
  if p_role_name is null then
    return jsonb_build_object('ok', false, 'code', 'NO_ROLE', 'message', 'المنصب غير موجود.');
  end if;

  select role_name, holder_uniqueness, home_committee_id, (case role_name
      when 'club_president' then 1 when 'president_advisor' then 2
      when 'executive_council_president' then 3 when 'hr_committee_leader' then 4
      when 'qa_committee_leader' then 5 when 'department_head' then 6
      when 'hr_admin_member' then 7 when 'qa_admin_member' then 8
      when 'committee_leader' then 9 when 'deputy_committee_leader' then 10
      when 'committee_member' then 11
      else 99 end)
  into v_role_name, v_uniq, v_home, v_target_rank
  from roles where role_name = p_role_name;

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
  v_no_scope          := v_role_name in ('club_president','president_advisor','executive_council_president');

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

commit;

-- ═══ التحقّق بعد التنفيذ ═══
--
-- ١) نسخةٌ واحدة لا نسختان (وإلّا PGRST203):
--
--   select count(*), max(pg_get_function_identity_arguments(oid))
--     from pg_proc where proname = 'assign_position';
--   → ١، بسبعة معاملات لا ذِكرَ فيها لـ`p_role`.
--
-- ٢) ولا ذِكرَ للدور المهجور فيها:
--
--   select pg_get_functiondef(oid) ~ 'activity_coordinator' from pg_proc where proname='assign_position';
--   → false.
