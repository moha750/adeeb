-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260801091838   الاسم: one_position_per_person

-- منصبٌ واحدٌ لكلّ شخص.
--
-- كان الجدول يحرس **المقعد** (`holder_uniqueness`: شاغلٌ واحدٌ لكلّ مقعد) ولا يحرس
-- **الشخص**، فكان الجمع ممكنًا وكانت الاستثناءات تُرصّع حالةً حالة: منسّق قسمين
-- (`ALREADY_HEAD`)، وإدارتين إداريّتين (`ALREADY_ADMIN_MEMBER`)، وإطفاء عضويّة
-- اللجنة عند ترقية عضوها قائدًا. كلّها كانت وجوهًا لثابتٍ واحدٍ لم يُقَل: لكلّ
-- عضوٍ منصبٌ واحد. يُقال الآن مرّةً في التريغر فتسقط الوجوه.
--
-- والإسناد الثاني — بعد هذا — ليس جمعًا بل **نقلًا**، والنقل انتزاعٌ من الوحدة
-- القديمة كما هو إجلاسٌ في الجديدة. فلا يُنفّذه إلّا من تبلغ سلطتُه المنصبَ
-- القديم أيضًا: قائدُ إدارةٍ لا يأخذ قائد لجنةٍ فيجعله عضوًا عنده. من يملك نزعه
-- هو من يملك إعطاءه.

-- ══ (١) الحارس على الجدول: الثابت لا يُتحايَل عليه من أيّ باب ══
create or replace function public.enforce_position_uniqueness()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uniq  text;
  v_other uuid;
  v_held  text;
begin
  -- الصفّ الميّت لا يشغل مقعدًا؛ التفرّد على الأحياء وحدهم.
  if not new.is_active then return new; end if;

  -- هذا التريغر يسبق `sync_role_key` أبجديًّا (trg_… قبل user_roles_…)، فلو
  -- كتب أحدٌ بالرقم وحده لوصل الاسم فارغًا هنا وسقط الحرس صامتًا. نصرخ بدله.
  if new.role_name is null then
    raise exception 'user_roles: الاسم هو الهويّة — لا يُكتَب صفٌّ بلا role_name.'
      using errcode = '23502';
  end if;

  -- (أ) الشخص: منصبٌ واحد. النقل يُخلي القديم ثمّ يكتب الجديد — لا يجمعهما.
  select ur.role_name into v_held
  from user_roles ur
  where ur.user_id = new.user_id
    and ur.is_active
    and ur.id is distinct from new.id
  limit 1;

  if v_held is not null then
    raise exception 'لكلّ عضوٍ منصبٌ واحد: هذا العضو يشغل «%» — أخلِ منصبه قبل إسناد غيره.', v_held
      using errcode = '23505';
  end if;

  -- (ب) المقعد: هل يقبل هذا الدور أكثر من شاغلٍ في هذا النطاق؟
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

-- ══ (٢) الباب: الإسناد نقلٌ مأذونٌ من الطرفَين ══
create or replace function public.assign_position(p_actor uuid, p_user uuid, p_role_name text default null::text, p_committee integer default null::integer, p_department integer default null::integer, p_replace boolean default false, p_notes text default null::text)
returns jsonb
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
  v_row_id               integer;
  v_new_id               integer;
  v_held                 record;
  v_vacated              jsonb;
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

  -- (3) الطرف الآخر: ما يشغله العضو الآن. لكلّ عضوٍ منصبٌ واحد، فالإسناد نقلٌ —
  --     ولا يَنقل إلّا من تبلغ سلطتُه المنصبَ القديم كما بلغت الجديد. (هذا الحارس
  --     يبتلع ما كان استثناءات: قسمين، وإدارتين إداريّتين، وعضويّةً تُطفأ بالترقية.)
  for v_held in
    select ur.role_name, ur.committee_id, ur.department_id
    from user_roles ur
    where ur.user_id = p_user and ur.is_active
      and not (ur.role_name = v_role_name
               and ur.committee_id is not distinct from p_committee
               and (p_committee is not null or ur.department_id is not distinct from p_department))
  loop
    if v_held.role_name = 'club_president' then
      return jsonb_build_object('ok', false, 'code', 'PROTECTED',
        'message', 'لا يُنقل رئيس النادي من منصبه من هنا.');
    end if;

    if not can_assign_role(p_actor, v_held.role_name, v_held.committee_id) then
      return jsonb_build_object('ok', false, 'code', 'FORBIDDEN_HOLDER',
        'message', 'هذا العضو يشغل منصبًا خارج سلطتك — لا يُنقل إلّا بيد من يملك نزعه.',
        'held_role_name', v_held.role_name,
        'held_committee_id', v_held.committee_id,
        'held_department_id', v_held.department_id);
    end if;
  end loop;

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

  -- (4) الإخلاء: يُطفأ ما كان قبل أن يُكتَب ما صار — في المعاملة نفسها، فلا يمرّ
  --     العضو بلحظةٍ يحمل فيها منصبين. ويُرجَع اسم المُخلى لتقوله اللوحة: «نُقل من…».
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
           'department_id', vac.department_id))
  into v_vacated
  from vac;

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
    'message', 'تمّ الإسناد بنجاح.',
    'user_role_id', v_new_id,
    'replaced_user_id', v_existing_user,
    'vacated', v_vacated
  );
end;
$function$;

comment on function public.enforce_position_uniqueness() is
  'حارسان على user_roles: (أ) لكلّ عضوٍ منصبٌ نشطٌ واحد، (ب) لكلّ مقعدٍ شاغلٌ واحدٌ في نطاق holder_uniqueness.';
comment on function public.assign_position(uuid, uuid, text, integer, integer, boolean, text) is
  'الباب الوحيد للإسناد. الإسناد لمن يشغل منصبًا = نقلٌ يُخلي القديم، ولا يمرّ إلّا إذا بلغت سلطةُ المُنفّذ المنصبَ القديم والجديد معًا (FORBIDDEN_HOLDER).';
