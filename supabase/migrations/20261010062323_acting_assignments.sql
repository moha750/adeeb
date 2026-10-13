-- التكليف: مقعدٌ مؤقّتٌ فوق المنصب الأصيل (قرارات محمد، 2026-10-10).
--
-- كان في النظام ثابتٌ واحد: «لكلّ عضوٍ منصبٌ حيٌّ واحد»، والإسنادُ الثاني نقلٌ يُطفئ الأوّل. فلم يكن
-- للتكليف موضع: من كُلِّف بمنصبٍ فقد منصبه، ولا يعود إليه إذا انتهى التكليف. وكلمةُ «تكليف شاغل» في
-- الانتخابات كانت إسنادًا دائمًا بلا مدّة.
--
-- والآن:
--   • التكليف صفٌّ في `user_roles` نفسه (`is_acting`)، فيأخذ المكلَّفُ ما للمقعد في كلّ ما يقرأ الجدول:
--     الصلاحيات، والسلطة على الأشخاص، ووزن الصوت، والظهور في الهيكل (قرار ٣: «يأخذ كلّ ما للأصيل»).
--   • الثابت صار: منصبٌ أصيلٌ واحد، وفوقه تكليفٌ واحدٌ على الأكثر.
--   • عند التكليف خياران (قرار ١): «مع استمرار منصبه» فيبقى الأصيل حيًّا، أو «مع تجميد منصبه» فيُطفأ
--     الأصيل ويُحجز لصاحبه (`frozen_by`) ثمّ يعود حيًّا حين ينتهي التكليف. لا منطقَ استرجاع: الأصيل لم يُمسّ.
--   • لا تكليف إلّا على مقعدٍ شاغر (قرار ٢: لا نيابةَ عن صاحب مقعدٍ غائب). والمقعد المجمَّد ليس شاغرًا،
--     لكن يجوز التكليف عليه تكليفًا تابعًا (`acting_parent_id`) لا تاريخ له: ينتهي بعودة صاحبه، ويمتدّ بامتداده.
--   • للتكليف آخرُ يومٍ إلزاميّ (`acting_until`، بتوقيت الرياض)، ينهيه كنّاسٌ كلّ ساعة.
--   • «تكليف شاغل» في الانتخابات صار تكليفًا حقيقيًّا (الخيار أ): ينتهي بتاريخه، أو بإعلان فائز الانتخاب
--     التالي على المقعد أيّهما أسبق. والمكلَّف لا يمنع فتح انتخابٍ على مقعده.
--
-- لا يُمسّ الأصيلُ المجمَّد بنزعٍ ولا نقل حتّى ينتهي تكليف صاحبه، ولا يُسنَد مقعدُه إسنادًا دائمًا لغيره.

-- ══ (١) الأعمدة ══════════════════════════════════════════════════════════════════════════════

alter table public.user_roles
  add column if not exists is_acting        boolean not null default false,
  add column if not exists acting_until     date,
  add column if not exists acting_parent_id integer references public.user_roles(id) on delete set null,
  add column if not exists frozen_by        integer references public.user_roles(id) on delete set null,
  add column if not exists acting_end       text;

comment on column public.user_roles.is_acting is
  'صفُّ تكليف: مقعدٌ مؤقّتٌ فوق المنصب الأصيل. لكلّ عضوٍ أصيلٌ حيٌّ واحد وتكليفٌ حيٌّ واحدٌ على الأكثر.';
comment on column public.user_roles.acting_until is
  'آخر يومٍ في التكليف (بتوقيت الرياض، شاملًا). فارغٌ في التكليف التابع لأنّه ينتهي بعودة صاحب المقعد.';
comment on column public.user_roles.acting_parent_id is
  'التكليف التابع: كُلِّف صاحبه على مقعدٍ مجمَّد، فينتهي حين ينتهي هذا التكليف (تكليف صاحب المقعد).';
comment on column public.user_roles.frozen_by is
  'الأصيل المجمَّد: أُطفئ بهذا التكليف، ويُحجَز لصاحبه، ويعود حيًّا حين ينتهي.';
comment on column public.user_roles.acting_end is
  'كيف انتهى التكليف: expired (حلّ أجله)، ended (أُنهي قبل أجله)، parent_ended (عاد صاحب المقعد)، replaced (أُسنِد المقعد لغيره)، took_seat (أُسنِد إليه هو)، membership_ended.';

alter table public.user_roles
  add constraint user_roles_acting_shape check (
    (not is_acting and acting_until is null and acting_parent_id is null and acting_end is null)
    or (is_acting and frozen_by is null
        and (not is_active or ((acting_until is null) <> (acting_parent_id is null))))
  ),
  add constraint user_roles_frozen_shape check (frozen_by is null or (not is_acting and not is_active)),
  add constraint user_roles_acting_end_known check (acting_end is null or acting_end in
    ('expired','ended','parent_ended','replaced','took_seat','membership_ended'));

-- صفٌّ أصيلٌ واحدٌ لكلّ (شخص، دور، لجنة) كما كان؛ أمّا التكليفات فتاريخٌ يتعدّد.
alter table public.user_roles drop constraint user_roles_user_role_name_committee_key;
create unique index user_roles_user_role_name_committee_key
  on public.user_roles (user_id, role_name, committee_id) where not is_acting;

create index if not exists user_roles_acting_live_idx  on public.user_roles (acting_until) where is_acting and is_active;
create index if not exists user_roles_frozen_by_idx    on public.user_roles (frozen_by) where frozen_by is not null;
create index if not exists user_roles_acting_parent_idx on public.user_roles (acting_parent_id) where acting_parent_id is not null;

-- ══ (٢) الحارس على الجدول: أصيلٌ واحد، وتكليفٌ واحد، ومقعدٌ لا يجلس فيه اثنان ══════════════════════

CREATE OR REPLACE FUNCTION public.enforce_position_uniqueness()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uniq     text;
  v_other    uuid;
  v_held     text;
  v_reserver integer;
begin
  -- الصفّ الميّت لا يشغل مقعدًا؛ التفرّد على الأحياء وحدهم. (والمجمَّد ميّتٌ يُحجَز مقعدُه: انظر (ب٢).)
  if not new.is_active then return new; end if;

  -- هذا التريغر يسبق `sync_role_key` أبجديًّا (trg_… قبل user_roles_…)، فلو
  -- كتب أحدٌ بالرقم وحده لوصل الاسم فارغًا هنا وسقط الحرس صامتًا. نصرخ بدله.
  if new.role_name is null then
    raise exception 'user_roles: الاسم هو الهويّة — لا يُكتَب صفٌّ بلا role_name.'
      using errcode = '23502';
  end if;

  -- (أ) الشخص: أصيلٌ حيٌّ واحد، وتكليفٌ حيٌّ واحد (2026-10-10). النقل يُخلي الأصيل القديم ثمّ يكتب
  --     الجديد، والتكليف يُنهى قبل تكليفٍ غيره.
  select ur.role_name into v_held
  from user_roles ur
  where ur.user_id = new.user_id
    and ur.is_active
    and ur.is_acting = new.is_acting
    and ur.id is distinct from new.id
  limit 1;

  if v_held is not null then
    if new.is_acting then
      raise exception 'لكلّ عضوٍ تكليفٌ واحد: هذا العضو مكلَّفٌ بـ«%»، فأنهِ تكليفه قبل غيره.', v_held
        using errcode = '23505';
    end if;
    raise exception 'لكلّ عضوٍ منصبٌ واحد: هذا العضو يشغل «%» — أخلِ منصبه قبل إسناد غيره.', v_held
      using errcode = '23505';
  end if;

  if not new.is_acting then
    -- (أ٢) من جُمِّد منصبه بتكليفٍ لا يُكتَب له أصيلٌ آخر حتّى يعود إلى مقعده.
    if exists (select 1 from user_roles ur
               where ur.user_id = new.user_id and ur.frozen_by is not null and ur.id is distinct from new.id) then
      raise exception 'منصب هذا العضو مجمَّدٌ بتكليف: أنهِ التكليف قبل أن تُسنِد له منصبًا.'
        using errcode = '23505';
    end if;
  end if;

  -- (أ٣) والأصيل والتكليف لا يجتمعان على مقعدٍ واحدٍ لشخصٍ واحد.
  if exists (select 1 from user_roles ur
             where ur.user_id = new.user_id
               and ur.id is distinct from new.id
               and ur.is_acting <> new.is_acting
               and (ur.is_active or ur.frozen_by is not null)
               and ur.role_name = new.role_name
               and ur.committee_id is not distinct from new.committee_id
               and ur.department_id is not distinct from new.department_id) then
    raise exception 'لا يُكلَّف عضوٌ بمقعده الأصيل نفسه.'
      using errcode = '23505';
  end if;

  -- (ب) المقعد: هل يقبل هذا الدور أكثر من شاغلٍ في هذا النطاق؟ والمكلَّف شاغلٌ كالأصيل.
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

  -- (ب٢) والمقعد المجمَّد محجوزٌ لصاحبه: لا يُسنَد إسنادًا دائمًا، ولا يجلس فيه إلّا مكلَّفٌ تابعٌ
  --      لتكليف صاحبه (`acting_parent_id`) فينتهي بعودته.
  select ur.frozen_by into v_reserver
  from user_roles ur
  where ur.role_name = new.role_name
    and ur.frozen_by is not null
    and ur.id is distinct from new.id
    and ur.user_id <> new.user_id
    and (v_uniq <> 'per_committee'  or ur.committee_id  is not distinct from new.committee_id)
    and (v_uniq <> 'per_department' or ur.department_id is not distinct from new.department_id)
  limit 1;

  if v_reserver is not null and not (new.is_acting and new.acting_parent_id is not distinct from v_reserver) then
    raise exception 'المقعد محجوزٌ لصاحبه المجمَّد بالتكليف: لا يُسنَد لغيره، ولا يُكلَّف عليه إلّا تكليفًا ينتهي بعودته.'
      using errcode = '23505';
  end if;

  return new;
end;
$function$;

-- ══ (٣) إنهاء التكليف: بابٌ داخليٌّ واحد يمرّ به كلّ انتهاء ═══════════════════════════════════════
--
-- بالترتيب: التابعون أوّلًا (فيخلو المقعد المجمَّد لصاحبه)، ثمّ يُطفأ التكليف، ثمّ يعود الأصيل المجمَّد
-- حيًّا. ومن انتهت عضويّته لا يعود له مقعد: يُرفع التجميد ويبقى صفُّه منطفئًا.

create or replace function public._end_acting(p_row integer, p_actor uuid, p_how text, p_note text default null)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
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

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (p_actor, 'end_acting', 'user_role', p_row::text,
          jsonb_build_object('user_id', v_row.user_id, 'role_name', v_row.role_name,
                             'committee_id', v_row.committee_id, 'department_id', v_row.department_id,
                             'how', p_how, 'note', p_note, 'returned_role_id', v_base));
end;
$function$;

comment on function public._end_acting(integer, uuid, text, text) is
  'الباب الوحيد لانتهاء التكليف: ينهي التابعين، ويطفئ التكليف، ويعيد الأصيل المجمَّد. لا يُنادى من المتصفّح.';


-- ══ (٤) التكليف ══════════════════════════════════════════════════════════════════════════════
--
-- سلطتُه سلطةُ الإسناد نفسها (`can_assign_role` من جدول السلطة، و`can_take_position_from`)، فلا بابَ
-- سلطةٍ جديد. والمقعد شاغرٌ أو مجمَّد: إن كان مجمَّدًا صار التكليف تابعًا لتكليف صاحبه، بلا تاريخ.

create or replace function public.assign_acting(
  p_actor      uuid,
  p_user       uuid,
  p_role_name  text,
  p_committee  integer,
  p_department integer,
  p_until      date,
  p_freeze     boolean,
  p_reason     text
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
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

  if coalesce(p_freeze, false) and v_base.role_name in ('club_president', 'adeeb_admin') then
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

comment on function public.assign_acting(uuid, uuid, text, integer, integer, date, boolean, text) is
  'التكليف: مقعدٌ مؤقّتٌ فوق الأصيل، مع استمراره أو تجميده (p_freeze). على مقعدٍ شاغر، أو مجمَّدٍ فيتبع تكليفَ صاحبه بلا تاريخ.';


-- ══ (٥) تعديل آخر يوم، والإنهاء قبل الأجل ═══════════════════════════════════════════════════════

create or replace function public.extend_acting(p_actor uuid, p_row integer, p_until date, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
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

  return jsonb_build_object('ok', true,
    'message', 'صار آخر يومٍ في التكليف ' || to_char(p_until, 'YYYY-MM-DD') || '.');
end;
$function$;

create or replace function public.end_acting(p_actor uuid, p_row integer, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_row    user_roles%rowtype;
  v_frozen boolean;
begin
  select * into v_row from user_roles where id = p_row;
  if not found or not v_row.is_acting or not v_row.is_active then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا تكليفَ قائمًا بهذا الرقم.');
  end if;
  if p_actor = v_row.user_id then
    return jsonb_build_object('ok', false, 'code', 'SELF', 'message', 'لا يُنهي أحدٌ تكليفَ نفسه.');
  end if;
  if not can_assign_role(p_actor, v_row.role_name, v_row.committee_id)
     or not can_take_position_from(p_actor, v_row.user_id) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'صلاحيتك لا تبلغ هذا التكليف.');
  end if;

  if exists (select 1 from roles r where r.role_name = v_row.role_name and r.removal_needs_club_president)
     and not is_club_president(p_actor) then
    return jsonb_build_object('ok', false, 'code', 'NEEDS_CLUB_PRESIDENT',
      'message', 'لا يُنهى تكليف قائد إدارةٍ قبل أجله إلّا بيد رئيس أدِيب.');
  end if;

  v_frozen := exists (select 1 from user_roles where frozen_by = p_row);
  perform _end_acting(p_row, p_actor, 'ended', nullif(btrim(coalesce(p_reason, '')), ''));

  return jsonb_build_object('ok', true,
    'message', case when v_frozen then 'انتهى التكليف، وعاد إلى منصبه الأصيل.' else 'انتهى التكليف.' end);
end;
$function$;


-- ══ (٦) بِركة التكليف: من يجوز أن يُكلَّف بهذا الدور على يد هذا المُنفّذ ══════════════════════════════

create or replace function public.actable_members(p_actor uuid, p_role_name text default null)
returns setof uuid
language sql
stable
security definer
set search_path to 'public'
as $function$
  select p.id
  from profiles p
  left join lateral (
    select ur.role_name from user_roles ur
    where ur.user_id = p.id and ur.is_active and not ur.is_acting
    limit 1
  ) h on true
  where exists (select 1 from user_roles a join position_authority pa on pa.role_name = a.role_name
                where a.user_id = p_actor and a.is_active)
    and p.id <> p_actor
    and is_adeeb_member(p.id)
    and h.role_name is not null
    and can_take_position_from(p_actor, p.id)
    and not exists (select 1 from user_roles x where x.user_id = p.id and x.is_active and x.is_acting)
    and not (h.role_name in ('hr_admin_member', 'qa_admin_member', 'exec_admin_member')
             and p_role_name in ('department_head', 'committee_leader', 'deputy_committee_leader'))
    and coalesce(p_role_name, '') not in ('hr_admin_member', 'qa_admin_member', 'adeeb_admin')
    and (p_role_name is null
         or (select r.prerequisite_role_name from roles r where r.role_name = p_role_name) is null
         or h.role_name = (select r.prerequisite_role_name from roles r where r.role_name = p_role_name));
$function$;


-- ══ (٧) الكنّاس: ينهي كلَّ تكليفٍ مضى آخرُ يومه، كلَّ ساعة ═══════════════════════════════════════
--
-- كلُّ صفٍّ في معاملةٍ فرعيّة: إن تعذّر إنهاء واحدٍ (وحدتُه أُغلقت مثلًا فلا يعود الأصيل) لم يقف
-- الباقون، وسُجّل العذر في `activity_log`.

create or replace function public.sweep_acting_assignments()
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_id    integer;
  v_n     integer := 0;
  v_today date := (now() at time zone 'Asia/Riyadh')::date;
begin
  for v_id in
    select id from user_roles
    where is_acting and is_active and acting_until is not null and acting_until < v_today
    order by id
  loop
    begin
      perform _end_acting(v_id, null, 'expired', null);
      v_n := v_n + 1;
    exception when others then
      insert into activity_log (user_id, action_type, target_type, target_id, details)
      values (null, 'acting_sweep_failed', 'user_role', v_id::text, jsonb_build_object('error', sqlerrm));
    end;
  end loop;
  return v_n;
end;
$function$;

select cron.schedule('acting-sweep', '7 * * * *', $cron$select public.sweep_acting_assignments();$cron$);

-- الترشّح لا يُسحب بالتجميد، ولا ما بقي لصاحبه في الوحدة مقعدٌ آخر (أصيلٌ بجانب تكليف).
CREATE OR REPLACE FUNCTION public.cascade_membership_loss_to_candidacy()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF OLD.is_active = true AND NEW.is_active = false AND NEW.frozen_by IS NULL
       AND NOT EXISTS (
           SELECT 1 FROM user_roles o
           WHERE o.user_id = NEW.user_id AND o.id <> NEW.id
             AND (o.is_active OR o.frozen_by IS NOT NULL)
             AND ((OLD.committee_id  IS NOT NULL AND o.committee_id  = OLD.committee_id)
               OR (OLD.department_id IS NOT NULL AND o.department_id = OLD.department_id))
       ) THEN
        UPDATE election_candidates ec
        SET status = 'withdrawn',
            withdrawn_at = now(),
            review_note_ar = COALESCE(ec.review_note_ar, 'انسحاب تلقائي بسبب فقدان العضوية')
        FROM elections e
        WHERE ec.election_id = e.id
          AND ec.user_id = NEW.user_id
          AND ec.status IN ('pending','approved','needs_edit')
          AND e.archived_at IS NULL
          AND e.status IN ('candidacy_open','candidacy_closed')
          AND (
              (OLD.committee_id  IS NOT NULL AND e.target_committee_id  = OLD.committee_id)
           OR (OLD.department_id IS NOT NULL AND e.target_department_id = OLD.department_id)
          );
    END IF;
    RETURN NEW;
END;
$function$;

-- الإشراف لا يُمحى بالتجميد: يعود صاحبه إليه حين يعود.
CREATE OR REPLACE FUNCTION public.cascade_membership_loss_to_supervision()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if tg_op = 'DELETE' or (old.is_active and not new.is_active and new.frozen_by is null) then
    delete from committee_supervision cs
    using committees u
    where u.id = old.committee_id
      and u.member_role_name = old.role_name
      and cs.unit_id = u.id
      and cs.supervisor_id = old.user_id;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$function$;

-- المقعد الذي يحفظ العضويّة: أصيلٌ حيّ أو مجمَّد. والتكليف وحده لا يكفي، لأنّه ينتهي.
CREATE OR REPLACE FUNCTION public.guard_live_member_has_seat()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user uuid := coalesce(new.user_id, old.user_id);
  v_name text;
begin
  if not exists (select 1 from profiles p
                 where p.id = v_user and p.joined_date is not null and p.account_status = 'active')
  then
    return null;
  end if;

  if exists (select 1 from user_roles ur where ur.user_id = v_user
               and ((ur.is_active and not ur.is_acting) or ur.frozen_by is not null)) then
    return null;
  end if;

  select full_name into v_name from profiles where id = v_user;
  raise exception 'لا عضويّةَ حيّةٌ بلا مقعد (%): أسنِد له مقعدًا، أو أنهِ عضويّتَه.', coalesce(v_name, v_user::text)
    using errcode = '23514';
end;
$function$;

-- وكذلك حين تُحيا العضويّة.
CREATE OR REPLACE FUNCTION public.guard_live_member_has_seat_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if new.joined_date is null or new.account_status is distinct from 'active' then
    return null;
  end if;
  if exists (select 1 from user_roles ur where ur.user_id = new.id
               and ((ur.is_active and not ur.is_acting) or ur.frozen_by is not null)) then
    return null;
  end if;
  raise exception 'لا عضويّةَ حيّةٌ بلا مقعد (%): أسنِد له مقعدًا قبل أن تُحيا عضويّتُه.', coalesce(new.full_name, new.id::text)
    using errcode = '23514';
end;
$function$;

-- الدور الأوّل: الأصيل قبل التكليف.
CREATE OR REPLACE FUNCTION public.get_user_primary_role(p_user uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select r.role_name
  from user_roles ur join roles r on r.role_name = ur.role_name
  where ur.user_id = p_user and ur.is_active = true
  order by ur.is_acting, case r.role_name
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

-- موضع العضو في كشف الإنذار: أصيله قبل تكليفه.
CREATE OR REPLACE FUNCTION public.members_i_may_warn(p_actor uuid)
 RETURNS TABLE(user_id uuid, name text, phone text, avatar text, gender text, committee_id integer, committee_name text, role_ar text, active_count integer, joined_date date)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p.id, p.full_name, p.phone, p.avatar_url, p.gender,
         ur.committee_id, c.committee_name_ar, ro.role_name_ar,
         (select count(*)::integer from member_warnings w where w.user_id = p.id and w.status = 'active'),
         p.joined_date
  from profiles p
  left join lateral (
    select u.committee_id, u.role_name from user_roles u
    where u.user_id = p.id and u.is_active
    order by u.is_acting, (u.committee_id is not null) desc, u.assigned_at limit 1
  ) ur on true
  left join committees c on c.id = ur.committee_id
  left join roles ro     on ro.role_name = ur.role_name
  where p.account_status = 'active' and can_issue_warning(p_actor, p.id);
$function$;

-- لقطة الموقع في الإنذار: الأصيل قبل التكليف، ما لم تُذكر لجنة التكليف نفسها.
CREATE OR REPLACE FUNCTION public.issue_warning(p_actor uuid, p_user uuid, p_category text, p_reason text, p_committee integer DEFAULT NULL::integer, p_occurred date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_status text;
  v_joined date;
  v_today date := (now() at time zone 'Asia/Riyadh')::date;
  v_role text;
  v_committee integer := p_committee;
  v_id uuid;
  v_count integer;
  v_limit integer := warning_limit();
  v_terminated boolean := false;
begin
  select account_status, joined_date into v_status, v_joined from profiles where id = p_user;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا وجود لهذا العضو.');
  end if;
  if v_status <> 'active' then
    return jsonb_build_object('ok', false, 'code', 'NOT_ACTIVE',
      'message', 'لا يُنذَر إلّا عضوٌ عضويّته سارية.');
  end if;

  if not can_issue_warning(p_actor, p_user) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN',
      'message', 'صلاحيتك لا تبلغ إنذار هذا العضو.');
  end if;

  if p_category is null or p_category not in
     ('absence','lateness','task_neglect','unresponsive','conduct','policy','other') then
    return jsonb_build_object('ok', false, 'code', 'BAD_CATEGORY', 'message', 'اختر تصنيف المخالفة.');
  end if;
  if v_reason is null or char_length(v_reason) < 5 then
    return jsonb_build_object('ok', false, 'code', 'REASON_REQUIRED',
      'message', 'اكتب سبب الإنذار (خمسة أحرف فأكثر).');
  end if;

  -- الواقعة أثرٌ ماضٍ: لا تقع غدًا، ولا تقع قبل أن يصير المُنذَرُ عضوًا
  if p_occurred is not null then
    if p_occurred > v_today then
      return jsonb_build_object('ok', false, 'code', 'FUTURE_DATE',
        'message', 'تاريخ الواقعة لا يكون في المستقبل.');
    end if;
    if v_joined is not null and p_occurred < v_joined then
      return jsonb_build_object('ok', false, 'code', 'BEFORE_JOIN',
        'message', format('تاريخ الواقعة يسبق انضمام العضو (%s).', to_char(v_joined, 'YYYY-MM-DD')));
    end if;
  end if;

  -- لقطة الموقع: اللجنة المذكورة إن صحّت، وإلّا لجنةُ دوره الحيّ إن كانت واحدة
  select ur.role_name, coalesce(v_committee, ur.committee_id)
  into v_role, v_committee
  from user_roles ur
  where ur.user_id = p_user and ur.is_active
    and (v_committee is null or ur.committee_id = v_committee)
  order by ur.is_acting, (ur.committee_id is not null) desc, ur.assigned_at
  limit 1;

  insert into member_warnings (user_id, issued_by, committee_id, role_at_issue, category, reason, occurred_on)
  values (p_user, p_actor, v_committee, v_role, p_category, v_reason, p_occurred)
  returning id into v_id;

  select count(*) into v_count from member_warnings
  where user_id = p_user and status = 'active';

  if v_count >= v_limit then
    update member_warnings set caused_termination = true where id = v_id;
    perform set_config('app.termination_kind', case
      when p_category in ('absence', 'lateness', 'task_neglect', 'unresponsive') then 'idle'
      when p_category in ('conduct', 'policy') then 'breach'
      else 'other' end, true);
    perform _apply_termination(
      p_actor, p_user,
      format('بلوغ حدّ الإنذارات (%s) — آخرها: %s', v_limit, v_reason),
      'warning_threshold'
    );
    v_terminated := true;
  end if;

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (p_actor, 'issue_warning', 'profile', p_user::text,
          jsonb_build_object('warning_id', v_id, 'ordinal', v_count, 'category', p_category, 'reason', v_reason));

  return jsonb_build_object(
    'ok', true, 'id', v_id, 'ordinal', v_count, 'active_count', v_count,
    'limit', v_limit, 'terminated', v_terminated,
    'message', case when v_terminated
      then 'سُجِّل الإنذار الثالث، وسُحبت العضويّة ببلوغ الحدّ.'
      else format('سُجِّل الإنذار %s.', case v_count when 1 then 'الأوّل' when 2 then 'الثاني' else v_count::text end) end
  );
end;
$function$;

-- دور الشهادة: الأصيل قبل التكليف.
CREATE OR REPLACE FUNCTION public.issue_certificate(p_actor uuid, p_user uuid, p_name text DEFAULT NULL::text, p_position text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
declare
  v_today    date := (now() at time zone 'Asia/Riyadh')::date;
  v_joined   date;
  v_name     text;
  v_title    text;
  v_role     text;
  v_committee integer;
  v_serial   text;
  v_id       uuid;
begin
  select p.joined_date,
         coalesce(nullif(btrim(coalesce(p_name, '')), ''),
                  nullif(btrim(md.full_name_triple), ''),
                  btrim(p.full_name))
  into v_joined, v_name
  from profiles p
  left join member_details md on md.user_id = p.id
  where p.id = p_user;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا وجود لهذا العضو.');
  end if;

  if not can_issue_certificate(p_actor, p_user) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN',
      'message', 'صلاحيتك لا تبلغ إصدار شهادةٍ لهذا العضو.');
  end if;

  if v_joined is null then
    return jsonb_build_object('ok', false, 'code', 'NO_JOIN_DATE',
      'message', 'لا تاريخَ انضمامٍ مسجَّلٌ لهذا العضو — سجّله أوّلًا فالشهادة تبدأ منه.');
  end if;

  v_title := coalesce(nullif(btrim(coalesce(p_position, '')), ''), position_title_of(p_user));
  if v_title is null or v_title = '' then
    return jsonb_build_object('ok', false, 'code', 'NO_POSITION',
      'message', 'لا منصبَ مسجَّلٌ لهذا العضو — اكتب المسمّى في النافذة.');
  end if;

  if v_name is null or char_length(v_name) < 3 then
    return jsonb_build_object('ok', false, 'code', 'NO_NAME', 'message', 'اسمُ العضو ناقص.');
  end if;

  select ur.role_name, ur.committee_id into v_role, v_committee
  from user_roles ur
  where ur.user_id = p_user
  order by ur.is_active desc, ur.is_acting, ur.assigned_at desc
  limit 1;

  v_serial := 'ADEEB-EXP-' || extract(year from v_today)::text || '-'
              || lpad(nextval('experience_certificate_serial_seq')::text, 4, '0') || '-'
              || upper(encode(gen_random_bytes(3), 'hex'));

  insert into experience_certificates
    (user_id, issued_by, serial, holder_name, position_title, period_from, period_to, role_at_issue, committee_id)
  values
    (p_user, p_actor, v_serial, v_name, v_title, v_joined, v_today, v_role, v_committee)
  returning id into v_id;

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (p_actor, 'issue_certificate', 'profile', p_user::text,
          jsonb_build_object('certificate_id', v_id, 'serial', v_serial,
                             'position', v_title, 'from', v_joined, 'to', v_today));

  return jsonb_build_object(
    'ok', true, 'id', v_id, 'serial', v_serial,
    'holder_name', v_name, 'position_title', v_title,
    'period_from', v_joined, 'period_to', v_today,
    'message', format('صدرت الشهادة برقم %s.', v_serial)
  );
end;
$function$;

-- بِركة الإسناد: شرط المقعد يُقرأ من الأصيل.
CREATE OR REPLACE FUNCTION public.assignable_members(p_actor uuid, p_role_name text DEFAULT NULL::text)
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p.id
  from profiles p
  left join lateral (
    select ur.role_name, ur.committee_id from user_roles ur
    where ur.user_id = p.id and ur.is_active and not ur.is_acting
    limit 1                                   -- صفٌّ واحدٌ بحكم ثابت «منصبٌ واحدٌ لكلّ شخص»
  ) h on true
  where exists (select 1 from user_roles a join position_authority pa on pa.role_name = a.role_name
                where a.user_id = p_actor and a.is_active)
    and p.account_status = 'active'
    and can_take_position_from(p_actor, p.id)
    -- ومن يملك التعيين في المقعد يملك إخلاءه (20261010): لا يظهر صاحبُ مقعدٍ لا يملكه المُنفّذ،
    -- إلّا عضو اللجنة (مقعدٌ متعدّد لا يخلو بنقله).
    and (h.role_name is null or h.role_name = 'committee_member'
         or can_assign_role(p_actor, h.role_name, h.committee_id))
    and (p_role_name is null
         or coalesce(h.role_name, '') is not distinct from coalesce(
              (select r.prerequisite_role_name from roles r where r.role_name = p_role_name),
              coalesce(h.role_name, '')))
    -- شرطُ العضويّة (`roles.requires_membership`): عضوٌ في أدِيب الآن، أيًّا كان مقعده.
    and (p_role_name is null
         or not coalesce((select r.requires_membership from roles r where r.role_name = p_role_name), false)
         or is_adeeb_member(p.id));
$function$;

-- وسام «تولّى منصب»: التكليف يُحسب، بلفظ «تكليفًا» (قرار ٣).
CREATE OR REPLACE FUNCTION public.badge_awards()
 RETURNS TABLE(user_id uuid, badge_id uuid, earned_at timestamp with time zone, evidence text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p.id, b.id,
         (p.joined_date + make_interval(days => b.threshold))::timestamptz,
         'انضمّ إلى أديب في ' || to_char(p.joined_date, 'YYYY-MM-DD')
  from public.badges b
  join public.profiles p
    on p.joined_date is not null
   and p.joined_date + make_interval(days => b.threshold) <= current_date
  where b.is_active and b.kind = 'computed' and b.rule_key = 'tenure_days'
  union all
  select a.uid, b.id, a.attended_at, b.description_ar
  from public.badges b
  join (
    select r.user_id as uid, r.attended_at,
           row_number() over (partition by r.user_id order by r.attended_at, r.id) as n
    from public.activity_reservations r
    where r.attendance_status = 'attended' and r.attended_at is not null
  ) a on a.n = b.threshold
  where b.is_active and b.kind = 'computed' and b.rule_key = 'events_attended'
  union all
  select x.uid, b.id, x.first_at, 'تولّى منصب ' || x.title
  from public.badges b
  cross join lateral (
    select distinct on (ur.user_id)
      ur.user_id as uid,
      ur.assigned_at as first_at,
      nullif(btrim(coalesce(r.role_name_ar, '') || coalesce(' ' || coalesce(c.committee_name_ar, d.name_ar), '')), '')
        || case when ur.is_acting then ' تكليفًا' else '' end as title
    from public.user_roles ur
    join public.roles r on r.role_name = ur.role_name
    left join public.committees  c on c.id = ur.committee_id
    left join public.departments d on d.id = ur.department_id
    where r.holder_uniqueness is distinct from 'multi' and ur.assigned_at is not null
    order by ur.user_id, ur.assigned_at
  ) x
  where b.is_active and b.kind = 'computed' and b.rule_key = 'unit_leadership'
    and x.title is not null
  union all
  select c.user_id, b.id, min(c.submitted_at), 'ترشّح لانتخابات أديب'
  from public.badges b
  join public.election_candidates c on c.status in ('approved','withdrawn') and c.submitted_at is not null
  where b.is_active and b.kind = 'computed' and b.rule_key = 'election_candidacy'
  group by c.user_id, b.id;
$function$;

-- الملفّ العامّ: كلُّ منصبٍ يقول أهو تكليفٌ وإلى متى، والأصيل أوّلًا.
CREATE OR REPLACE FUNCTION public.get_public_profile(p_slug text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'slug',       p.public_slug,
    'name',       coalesce(nullif(btrim(md.full_name_triple), ''), p.full_name),
    'avatar',     nullif(btrim(coalesce(p.avatar_url, '')), ''),
    'gender',     p.gender,
    'bio',        nullif(btrim(coalesce(p.bio, '')), ''),
    'joinedDate', p.joined_date,
    'positions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'roleAr',   r.role_name_ar,
               'unitName', coalesce(c.committee_name_ar, d.name_ar),
               'since',    ur.assigned_at,
               'acting',   ur.is_acting,
               'until',    ur.acting_until
             ) order by ur.is_acting, (r.holder_uniqueness = 'multi'), ur.assigned_at)
      from public.user_roles ur
      join public.roles r             on r.role_name = ur.role_name
      left join public.committees c   on c.id = ur.committee_id
      left join public.departments d  on d.id = ur.department_id
      where ur.user_id = p.id and ur.is_active
    ), '[]'::jsonb),
    'badges', coalesce((
      select jsonb_agg(x order by (x->>'earnedAt') is null, (x->>'sortOrder')::int)
      from (
        select jsonb_build_object(
                 'key', b.badge_key, 'name', b.name_ar, 'how', b.description_ar,
                 'icon', b.icon, 'sortOrder', b.sort_order,
                 'earnedAt', mb.earned_at, 'evidence', mb.evidence,
                 'current', case
                              when mb.id is not null then null
                              when b.rule_key = 'events_attended' then
                                (select count(*) from public.activity_reservations ar
                                 where ar.user_id = p.id and ar.attendance_status = 'attended')
                              when b.rule_key = 'tenure_days' and p.joined_date is not null then
                                (current_date - p.joined_date)
                            end,
                 'threshold', case when mb.id is null then b.threshold end
               ) as x
        from public.badges b
        left join public.member_badges mb on mb.badge_id = b.id and mb.user_id = p.id
        where b.is_active and (mb.id is not null or b.show_locked)
      ) s
    ), '[]'::jsonb),
    'college', nullif(btrim(coalesce(md.college, '')), ''),
    'major',   nullif(btrim(coalesce(md.major, '')), ''),
    'degree',  nullif(btrim(coalesce(md.academic_degree, '')), ''),
    'links', jsonb_strip_nulls(jsonb_build_object(
      'twitter',   nullif(btrim(coalesce(md.twitter_account, '')), ''),
      'instagram', nullif(btrim(coalesce(md.instagram_account, '')), ''),
      'tiktok',    nullif(btrim(coalesce(md.tiktok_account, '')), ''),
      'linkedin',  nullif(btrim(coalesce(md.linkedin_account, '')), '')
    ))
  )
  from public.profiles p
  left join public.member_details md on md.user_id = p.id
  where p.public_slug = p_slug
    and p.account_status = 'active'
    and p.deleted_at is null
    and p.deletion_requested_at is null
    and coalesce(nullif(btrim(md.full_name_triple), ''), p.full_name) is not null
    and exists (select 1 from public.user_roles ur where ur.user_id = p.id and ur.is_active);
$function$;

-- المجلس في الصفحة الرئيسيّة: عمودٌ يقول إن كان المقعد تكليفًا. تغيّر شكل الإرجاع، فتُسقط الدالّة وتُبنى.
drop function public.get_board_members();
CREATE OR REPLACE FUNCTION public.get_board_members()
 RETURNS TABLE(id uuid, full_name text, avatar_url text, gender text, role_ar text, unit_name text, twitter_account text, linkedin_account text, public_slug text, is_acting boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with board_roles as (
    select u.role_key, u.ord::int as ord
    from unnest(array[
      'club_president','executive_council_president',
      'hr_committee_leader','qa_committee_leader','department_head',
      'committee_leader','deputy_committee_leader'
    ]) with ordinality as u(role_key, ord)
  ),
  picked as (
    select distinct on (p.id)
      p.id, p.full_name, p.avatar_url, p.gender,
      r.role_name_ar as role_ar,
      coalesce(c.committee_name_ar, d.name_ar) as unit_name,
      b.ord,
      coalesce('c' || ur.committee_id::text, 'u' || p.id::text) as cluster,
      md.twitter_account, md.linkedin_account,
      p.public_slug,
      ur.is_acting
    from profiles p
    join user_roles ur on ur.user_id = p.id and ur.is_active = true
    join roles r       on r.role_name = ur.role_name
    join board_roles b on b.role_key = r.role_name
    left join committees  c on c.id = ur.committee_id
    left join departments d on d.id = ur.department_id
    left join member_details md on md.user_id = p.id
    where p.account_status = 'active'
    order by p.id, b.ord, ur.is_acting, ur.committee_id
  ),
  clustered as (
    select k.*,
      min(k.ord) over (partition by k.cluster) as cluster_ord,
      first_value(k.full_name) over (partition by k.cluster order by k.ord, k.full_name) as cluster_lead
    from picked k
  )
  select c.id, c.full_name, c.avatar_url, c.gender, c.role_ar, c.unit_name,
         c.twitter_account, c.linkedin_account, c.public_slug, c.is_acting
  from clustered c
  order by c.cluster_ord, c.cluster_lead, c.ord, c.full_name;
$function$;
grant execute on function public.get_board_members() to anon, authenticated, service_role;

-- إعادة العضويّة تشترط أصيلًا، لا تكليفًا.
CREATE OR REPLACE FUNCTION public.restore_membership(p_actor uuid, p_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_status text;
  v_reason text;
  v_at timestamptz;
begin
  select account_status, termination_reason, terminated_at into v_status, v_reason, v_at
  from profiles where id = p_user;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا وجود لهذا العضو.');
  end if;
  if v_status is distinct from 'suspended' then
    return jsonb_build_object('ok', false, 'code', 'NOT_TERMINATED', 'message', 'عضويّته ليست منتهية.');
  end if;
  if not can_end_membership(p_actor, p_user) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN',
      'message', 'صلاحيتك لا تبلغ عضويّة هذا العضو.');
  end if;

  if not exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active and not ur.is_acting) then
    return jsonb_build_object('ok', false, 'code', 'NO_SEAT',
      'message', 'أسنِد له مقعدًا أوّلًا من تبويب تعيين المناصب، ثمّ أعِد عضويّتَه: لا عضويّةَ في أديب بلا مقعد.');
  end if;

  perform set_config('app.membership_gate', 'open', true);
  update profiles
  set account_status = 'active', termination_reason = null, updated_at = now()
  where id = p_user;
  perform set_config('app.membership_gate', '', true);

  update volunteers
  set status = 'former', ended_at = now(), ended_by = p_actor, end_reason = 'عادت عضويّته'
  where user_id = p_user and status = 'active';

  update volunteer_applications set status = 'withdrawn'
  where user_id = p_user and status = 'pending';

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (p_actor, 'restore_membership', 'profile', p_user::text,
          jsonb_build_object('previous_reason', v_reason, 'previous_terminated_at', v_at));

  return jsonb_build_object('ok', true, 'message', 'أُعيدت العضوية.');
end;
$function$;

-- انتهاء العضويّة يُنهي التكليف من بابه: ينتهي التابعون له، ويُرفع التجميد عن أصيله.
CREATE OR REPLACE FUNCTION public._apply_termination(p_actor uuid, p_user uuid, p_reason text, p_source text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  -- الفئةُ من باب السلطة إن حملها، وإلّا فمن مصدر الإنهاء: من خرج بإرادته فبطلبه
  v_kind text := coalesce(
    nullif(current_setting('app.termination_kind', true), ''),
    case when p_source in ('exit_request', 'self_exit', 'account_deletion') then 'asked' else 'other' end);
begin
  perform set_config('app.membership_gate', 'open', true);
  update profiles
  set account_status = 'suspended', termination_reason = p_reason, termination_kind = v_kind, updated_at = now()
  where id = p_user;
  perform set_config('app.membership_gate', '', true);
  perform set_config('app.termination_kind', '', true);

  -- والمقعدُ يخلو مع صاحبه (2026-08-20): من خرج من النادي لا يبقى اسمُه في الهيكل
  -- والتكليف يُنهى من بابه (2026-10-10): فينتهي التابعون له، ويُرفع التجميد عن أصيله ولا يعود.
  perform _end_acting(ur.id, p_actor, 'membership_ended', p_reason)
  from user_roles ur
  where ur.user_id = p_user and ur.is_acting and ur.is_active;
  update user_roles set frozen_by = null where user_id = p_user and frozen_by is not null;

  update user_roles set is_active = false
  where user_id = p_user and is_active;

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (p_actor, 'terminate_membership', 'profile', p_user::text,
          jsonb_build_object('reason', p_reason, 'source', p_source, 'kind', v_kind));
end;
$function$;

-- النزع للأصيل الحيّ وحده: المجمَّد لا يُنزع حتّى يعود صاحبه، والتكليف يُنهى من بابه.
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

-- الإسناد الدائم مع التكليف: يُستبدَل المكلَّف بإنهاء تكليفه، ومن أُسنِد إليه مقعدُ تكليفه انتهى تكليفه، والمجمَّد محجوز.
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

-- ══ (٩) الشغور للانتخاب، والمسمّى ═══════════════════════════════════════════════════════════════
--
-- المقعد يُنتخب له ما لم يكن عليه أصيلٌ حيّ أو صاحبٌ مجمَّدٌ يُحجَز له. والمكلَّف لا يمنع الانتخاب:
-- تكليفه ينتهي بإعلان الفائز (`assign_position` بالاستبدال)، وهو الخيار أ من قرارات محمد.

CREATE OR REPLACE FUNCTION public.is_target_position_vacant(p_role_name text, p_committee_id integer, p_department_id integer)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF p_role_name IN ('committee_leader', 'deputy_committee_leader') THEN
        IF p_committee_id IS NULL THEN RETURN true; END IF;
        RETURN NOT EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.role_name = p_role_name
              AND ur.committee_id = p_committee_id
              AND ((ur.is_active AND NOT ur.is_acting) OR ur.frozen_by IS NOT NULL)
        );

    ELSIF p_role_name = 'department_head' THEN
        IF p_department_id IS NULL THEN RETURN true; END IF;
        RETURN NOT EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.role_name = 'department_head'
              AND ur.department_id = p_department_id
              AND ((ur.is_active AND NOT ur.is_acting) OR ur.frozen_by IS NOT NULL)
        );
    END IF;

    RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_occupied_positions()
 RETURNS TABLE(role_name text, committee_id integer, department_id integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    -- مشغولٌ للانتخاب: أصيلٌ حيّ، أو صاحبٌ مجمَّدٌ يُحجَز له. والمكلَّف لا يشغله (2026-10-10).
    SELECT r.role_name::TEXT, ur.committee_id, ur.department_id
    FROM user_roles ur
    JOIN roles r ON r.role_name = ur.role_name
    WHERE ((ur.is_active AND NOT ur.is_acting) OR ur.frozen_by IS NOT NULL)
      AND r.role_name IN ('committee_leader','deputy_committee_leader','department_head');
$function$;

-- مسمّى العضو كما تقترحه الشهادة: الأصيل أوّلًا (حيًّا أو مجمَّدًا)، ثمّ التكليف بلفظ «تكليفًا» (قرار ٣).
CREATE OR REPLACE FUNCTION public.position_title_of(p_user uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  with seats as (
    select
      (ur.is_active or ur.frozen_by is not null) as live,
      ur.is_acting,
      ur.assigned_at,
      nullif(btrim(coalesce(r.role_name_ar, '') || coalesce(' ' || coalesce(unit.committee_name_ar, dept.name_ar), '')), '')
        || case when ur.is_acting then ' تكليفًا' else '' end as title
    from user_roles ur
    join roles r on r.role_name = ur.role_name
    left join committees  unit on unit.id = ur.committee_id
    left join departments dept on dept.id = ur.department_id
    where ur.user_id = p_user
  )
  select coalesce(
    (select string_agg(title, ' و' order by is_acting, assigned_at) from seats where live and title is not null),
    (select title from seats where title is not null and not is_acting order by assigned_at desc limit 1)
  );
$function$;


-- ══ (١٠) «تكليف شاغل» في الانتخابات صار تكليفًا (الخيار أ) ══════════════════════════════════════
--
-- توقيعٌ خماسيّ جديد بآخر يومٍ وخيار التجميد. والثلاثيّ القديم باقٍ كما هو حتّى تُنشر الواجهة الجديدة،
-- لأنّ الموقع المنشور يناديه؛ ثمّ يُسقَط.

CREATE OR REPLACE FUNCTION public.appoint_to_seat(p_election uuid, p_user uuid, p_reason text, p_until date, p_freeze boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_e      elections%ROWTYPE;
    v_res    JSONB;
    v_name   TEXT;
    v_holder INTEGER;
BEGIN
    IF NOT has_election_admin_permission(auth.uid()) THEN
        RAISE EXCEPTION 'غير مصرح بالتكليف على هذا المقعد';
    END IF;

    IF p_reason IS NULL OR length(trim(p_reason)) < 10 THEN
        RAISE EXCEPTION 'سببُ التكليف مطلوب (١٠ أحرف على الأقلّ)';
    END IF;

    SELECT * INTO v_e FROM elections WHERE id = p_election FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'الانتخاب غير موجود';
    END IF;
    IF v_e.status = 'completed' THEN
        RAISE EXCEPTION 'هذا الانتخاب اكتمل بفائزٍ معلَن';
    END IF;
    IF v_e.status = 'voting_open' THEN
        RAISE EXCEPTION 'لا تُكلِّف والتصويتُ جارٍ؛ أغلِق التصويت أوّلًا';
    END IF;

    SELECT full_name INTO v_name FROM profiles WHERE id = p_user;
    IF v_name IS NULL THEN
        RAISE EXCEPTION 'العضو غير موجود';
    END IF;

    -- مكلَّفٌ قائمٌ على المقعد يُستبدَل: مدير الانتخابات يختار من يُكلَّف بعد التعثّر، ولو كان هو نفسه.
    SELECT ur.id INTO v_holder
    FROM user_roles ur
    JOIN roles r ON r.role_name = ur.role_name
    WHERE ur.role_name = v_e.target_role_name AND ur.is_active AND ur.is_acting
      AND (r.holder_uniqueness <> 'per_committee'  OR ur.committee_id  IS NOT DISTINCT FROM v_e.target_committee_id)
      AND (r.holder_uniqueness <> 'per_department' OR ur.department_id IS NOT DISTINCT FROM v_e.target_department_id)
    LIMIT 1;
    IF v_holder IS NOT NULL THEN
        PERFORM public._end_acting(v_holder, auth.uid(), 'replaced', 'تكليف على مقعدٍ تعثّر انتخابُه (' || p_election::text || ')');
    END IF;

    v_res := assign_acting(
        p_actor      => auth.uid(),
        p_user       => p_user,
        p_role_name  => v_e.target_role_name,
        p_committee  => v_e.target_committee_id,
        p_department => v_e.target_department_id,
        p_until      => p_until,
        p_freeze     => coalesce(p_freeze, false),
        p_reason     => 'تكليف على مقعدٍ تعثّر انتخابُه (' || p_election::text || ') : ' || trim(p_reason)
    );

    IF NOT COALESCE((v_res->>'ok')::boolean, false) THEN
        RAISE EXCEPTION 'تعذّر التكليف: %', COALESCE(v_res->>'message', 'خطأ غير معروف');
    END IF;

    INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
    VALUES (p_election, auth.uid(), 'seat_appointed',
            jsonb_build_object('user_id', p_user, 'reason', trim(p_reason), 'until', p_until,
                               'freeze', coalesce(p_freeze, false), 'assignment', v_res));

    IF v_e.status <> 'cancelled' THEN
        PERFORM public._cancel_election_apply(
            p_election, 'كُلّف شاغلٌ للمقعد : ' || trim(p_reason), 'cancelled');
    END IF;

    PERFORM public._send_election_notification(
        p_election, 'election_voters', 'كُلّف شاغلٌ للمقعد',
        'كُلّف ' || v_name || ' بـ' || public._election_target_label(p_election)
            || ' حتّى ' || to_char(p_until, 'YYYY-MM-DD') || ' بعد تعثّر الانتخاب.',
        'info', 'normal', NULL,
        jsonb_build_object('event', 'seat_appointed', 'user_id', p_user, 'until', p_until));
END;
$function$;

-- ══ (١١) الأبواب: كلُّ ما يأخذ p_actor بمفتاح الخدمة وحده، و«تكليف شاغل» للجلسة كأخيه ══════════════

revoke all on function public._end_acting(integer, uuid, text, text) from public, anon, authenticated;
revoke all on function public.assign_acting(uuid, uuid, text, integer, integer, date, boolean, text) from public, anon, authenticated;
revoke all on function public.extend_acting(uuid, integer, date, text) from public, anon, authenticated;
revoke all on function public.end_acting(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.actable_members(uuid, text) from public, anon, authenticated;
revoke all on function public.sweep_acting_assignments() from public, anon, authenticated;

grant execute on function public._end_acting(integer, uuid, text, text) to service_role;
grant execute on function public.assign_acting(uuid, uuid, text, integer, integer, date, boolean, text) to service_role;
grant execute on function public.extend_acting(uuid, integer, date, text) to service_role;
grant execute on function public.end_acting(uuid, integer, text) to service_role;
grant execute on function public.actable_members(uuid, text) to service_role;
grant execute on function public.sweep_acting_assignments() to service_role;

revoke all on function public.appoint_to_seat(uuid, uuid, text, date, boolean) from public, anon;
grant execute on function public.appoint_to_seat(uuid, uuid, text, date, boolean) to authenticated, service_role;
