-- فصل الإشراف عن الانتماء — المرحلة ١: القاعدة
--
-- كان صفٌّ واحدٌ في `user_roles` يحمل حقيقتين: أنّ فلانًا **عضوٌ في إدارة الموارد**،
-- وأنّه **يشرف على لجنة الفعاليات**. فـ`committee_id` عند عضو الإدارة كان يعني اللجنة
-- المُشرَف عليها لا إدارته — فلا صفَّ يقول إنّه من الإدارة أصلًا، وسحبُ آخر لجنةٍ إخراجٌ
-- من الإدارة، وعضوٌ لم يُوزَّع بعدُ لا يمكن أن يوجد، والقارئ يراه عضوًا في تسع لجان.
--
-- هنا تفترق الحقيقتان:
--   الانتماء  → `user_roles` كسائر المناصب، و`committee_id` = الإدارة الأمّ (22/23).
--   الإشراف   → `committee_supervision`: شخصٌ ولجنةٌ **أجنبيّةٌ عنه** يتابعها. ليس منصبًا.
--
-- والحَكَم يبقى واحدًا: `can_assign_role` — من يملك ضمّ عضوٍ إلى إدارةٍ يملك توزيعه.
-- (الترحيل في الملفّ 02؛ هذا الملفّ لا يمسّ صفًّا حيًّا.)

-- ═══ ١) جدول الإشراف ═══════════════════════════════════════════════════════════

create table if not exists public.committee_supervision (
  id            serial primary key,
  committee_id  integer not null references public.committees(id) on delete cascade,  -- اللجنة المُشرَف عليها (تنفيذيّة)
  unit_id       integer not null references public.committees(id) on delete cascade,  -- الإدارة المُشرِفة (إداريّة)
  supervisor_id uuid    not null references public.profiles(id)   on delete cascade,
  assigned_by   uuid             references public.profiles(id),
  assigned_at   timestamptz not null default now(),
  notes         text
);

comment on table public.committee_supervision is
  'الإشراف: عضو إدارةٍ إداريّة يتابع لجنةً تنفيذيّة. تكليفٌ تشغيليّ يدور — لا منصب، فلا مكان له في user_roles.';

-- المقعد: مشرفٌ واحدٌ لكلّ لجنةٍ من كلّ إدارة (كانت يحرسها holder_uniqueness؛ فالتفرّد ينتقل مع المقعد)
create unique index if not exists committee_supervision_seat
  on public.committee_supervision (committee_id, unit_id);

create index if not exists committee_supervision_by_supervisor
  on public.committee_supervision (supervisor_id);

alter table public.committee_supervision enable row level security;

-- على نسق `user_roles`: القراءة لكلّ مُصادَق، والكتابة المباشرة لسلطة الهيكلة وحدها —
-- وقادةُ الإدارات يمرّون من الدالّتين أدناه لا من الجدول.
drop policy if exists committee_supervision_select on public.committee_supervision;
create policy committee_supervision_select on public.committee_supervision
  for select using (auth.role() = 'authenticated');

drop policy if exists committee_supervision_modify on public.committee_supervision;
create policy committee_supervision_modify on public.committee_supervision
  for all using (check_user_permission(auth.uid(), 'manage_positions'))
  with check (check_user_permission(auth.uid(), 'manage_positions'));

-- ═══ ٢) شكل صفّ الإشراف — حارسٌ على الجدول لا في الدالّة وحدها ═════════════════

create or replace function public.enforce_supervision_shape()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
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

  select c.council_id, c.is_active into v_target from committees c where c.id = new.committee_id;
  if v_target.council_id is distinct from 'executive' or not coalesce(v_target.is_active, false) then
    raise exception 'الإشراف لا يقع إلّا على لجنةٍ تنفيذيّةٍ نشطة.' using errcode = '23514';
  end if;

  -- الشرط الذي لم يكن يمكن كتابته قبل الفصل: المشرف عضوٌ في إدارته فعلًا.
  if not exists (
    select 1 from user_roles ur
    where ur.user_id = new.supervisor_id and ur.is_active
      and ur.role_name = v_member_role and ur.committee_id = new.unit_id
  ) then
    raise exception 'المشرف ليس عضوًا في هذه الإدارة — ضُمّه إليها أوّلًا.' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_supervision_shape on public.committee_supervision;
create trigger trg_enforce_supervision_shape
  before insert or update on public.committee_supervision
  for each row execute function public.enforce_supervision_shape();

-- ═══ ٣) تفرّد دورَي العضو ═══════════════════════════════════════════════════════
-- كان `per_committee` ليبقى مشرفٌ واحدٌ لكلّ لجنة — وقد انتقل ذاك التفرّد إلى فهرس المقعد
-- أعلاه. والإدارة تحتمل أعضاءها كلّهم، فلو بقي القيد لم يسكنها إلّا واحد.
update public.roles set holder_uniqueness = 'multi'
where role_name in ('hr_admin_member', 'qa_admin_member');

-- ═══ ٤) الحَكَم — يفقد فرعه الاستثنائيّ ════════════════════════════════════════
-- كان فيه: «قائد إدارةٍ يُسنِد عضوه على لجنةٍ تنفيذيّة» — وهو بابُ الخلط نفسه.
-- بعد الفصل لا يُسنَد دورُ العضو إلّا على إدارته، فيبقى الفرع الطبيعيّ وحده: عضوٌ في وحدته.

create or replace function public.can_assign_role(p_actor uuid, p_role_name text, p_committee integer)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    -- الباب الأوّل: سلطة الهيكلة كاملةً
    check_user_permission(p_actor, 'manage_positions')
    or (
      -- الباب الثاني: قائد وحدةٍ يوزّع دور عضوها **في وحدته**
      check_user_permission(p_actor, 'assign_unit_members')
      and exists (
        select 1
        from committees u
        -- الوحدة التي يقودها المُنفّذ فعلًا: صفٌّ حيّ بدورها القياديّ وعليها هي
        join user_roles ur
          on ur.user_id = p_actor and ur.is_active
         and ur.role_name = u.leader_role_name
         and ur.committee_id = u.id
        where u.member_role_name = p_role_name
          and u.id = p_committee
      )
    );
$$;

-- ═══ ٥) بابا الإشراف — يقرآن الحَكَم نفسه ══════════════════════════════════════

create or replace function public.assign_supervision(
  p_actor     uuid,
  p_user      uuid,
  p_committee integer,
  p_unit      integer default null,
  p_replace   boolean default false,
  p_notes     text    default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_unit        integer;
  v_units       integer;
  v_member_role text;
  v_existing    uuid;
begin
  -- الإدارة المُشرِفة: تُقال صراحةً، أو تُشتقّ من انتماء العضو — والانتماء صار حقيقةً تُقرأ.
  if p_unit is not null then
    v_unit := p_unit;
  else
    select count(*), min(ur.committee_id) into v_units, v_unit
    from user_roles ur
    join committees c on c.id = ur.committee_id
    where ur.user_id = p_user and ur.is_active
      and c.council_id = 'administrative' and ur.role_name = c.member_role_name;

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

  -- يقوله التريغر أيضًا؛ يُقال هنا رسالةً مفهومةً بدل استثناء.
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
$$;

create or replace function public.revoke_supervision(
  p_actor     uuid,
  p_user      uuid,
  p_committee integer,
  p_unit      integer default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_unit        integer;
  v_member_role text;
  v_removed     integer;
begin
  -- الإدارة تُقرأ من صفّ الإشراف نفسه — فلا يُسحب إلّا إشرافٌ قائم.
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

  -- حذفٌ صلب: الإشراف تكليفٌ يدور، ولا تريغر يتعلّق به (بخلاف المناصب وترشّحاتها).
  delete from committee_supervision
  where committee_id = p_committee and unit_id = v_unit and supervisor_id = p_user;
  get diagnostics v_removed = row_count;

  return jsonb_build_object('ok', true, 'message', 'سُحب الإشراف.', 'removed', v_removed);
end;
$$;

-- الصلاحيّات كنظيرتيهما `assign_position`/`revoke_position` بالضبط: **الخدمة وحدها**.
-- الدالّة تأخذ `p_actor` وتصدّقه، فمن بلغها من المتصفّح بدّل الفاعل واشترى سلطةً ليست له.
-- بابُها إذن الخادم (مفتاح الخدمة) لا العميل — والحَكَم داخلها دفاعُ عمقٍ لا سياجٌ وحيد.
revoke execute on function public.assign_supervision(uuid, uuid, integer, integer, boolean, text) from public, anon, authenticated;
revoke execute on function public.revoke_supervision(uuid, uuid, integer, integer) from public, anon, authenticated;
-- ودالّتا التريغر ليستا نداءً أصلًا — فلا تُعرَضان على REST.
revoke execute on function public.enforce_supervision_shape() from public, anon, authenticated;
