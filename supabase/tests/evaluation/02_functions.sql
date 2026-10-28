-- FILE 20261010090700_notifications_01_engine.sql
create or replace function public.notify_event(p_kind text, p_facts jsonb default '{}'::jsonb, p_actor uuid default null)
returns bigint
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.notification_events (kind, facts, actor_id)
  values (p_kind, coalesce(p_facts, '{}'::jsonb), p_actor)
  returning id;
$$;

-- FILE 20261017100000_notifications_03_positions.sql
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

-- FILE 20261003101228_former_member_is_visitor.sql
create or replace function public.is_adeeb_member(p_user uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select exists (
    select 1 from public.profiles p
    where p.id = p_user
      and p.joined_date is not null
      and p.account_status is distinct from 'suspended'
  );
$function$;

-- FILE 20260802123018_authority_reads_the_table.sql
create or replace function public.can_assign_role(p_actor uuid, p_role_name text, p_committee integer)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from user_roles ur
    join position_authority pa on pa.role_name = ur.role_name
    where ur.user_id = p_actor and ur.is_active
      and p_role_name = any (pa.target_roles)
      -- ما كان «في وحدته» لا يُسنَد إلّا في الوحدة التي يقودها هو
      and (not (p_role_name = any (pa.own_unit_roles))
           or exists (
             select 1 from committees c
             where c.id = p_committee
               and c.leader_role_name = ur.role_name
               and ur.committee_id = c.id
           ))
  );
$function$;

-- FILE 20261010050001_structure_v3.sql
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

-- FILE 20260802155637_seat_must_be_declared_by_its_unit.sql
create or replace function public.seat_declared_by_unit(p_role_name text, p_committee integer)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select p_committee is null or exists (
    select 1 from committees c
    where c.id = p_committee
      and (c.leader_role_name = p_role_name
           or c.member_role_name = p_role_name
           or (p_role_name = 'deputy_committee_leader' and c.leader_role_name = 'committee_leader'))
  );
$function$;

-- FILE 20260802155637_seat_must_be_declared_by_its_unit.sql
create or replace function public.enforce_seat_belongs_to_unit()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not new.is_active or new.committee_id is null then return new; end if;

  if not exists (
    select 1 from committees c
    where c.id = new.committee_id
      and (c.leader_role_name = new.role_name
           or c.member_role_name = new.role_name
           or (new.role_name = 'deputy_committee_leader' and c.leader_role_name = 'committee_leader'))
  ) then
    raise exception 'هذه الوحدة لا تُصرّح بهذا المقعد: «%» لا يُجلَس في الوحدة رقم %.', new.role_name, new.committee_id
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

-- FILE 20261010062323_acting_assignments.sql
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

-- FILE 20260811_bare_rank_02_person_unit_from_assignment.sql
create or replace function public.enforce_home_unit_match()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_home integer;
  v_name text;
begin
  select r.home_committee_id into v_home from public.roles r where r.role_name = new.role_name;
  if v_home is null then return new; end if;

  if new.committee_id is distinct from v_home then
    select c.committee_name_ar into v_name from public.committees c where c.id = v_home;
    raise exception 'المنصب «%» لا يُسنَد إلّا في %', new.role_name, coalesce(v_name, v_home::text)
      using errcode = 'check_violation';
  end if;
  return new;
end;
$function$;

-- FILE 20261010062323_acting_assignments.sql
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

-- FILE 20261010062323_acting_assignments.sql
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

-- FILE 20261010062323_acting_assignments.sql
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

-- FILE 20261013121323_portal_01_standing_keys.sql
create or replace function public.get_user_permissions(p_user_id uuid)
 returns table(permission_key text, permission_name_ar text, category text)
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
begin
    return query
    -- صلاحيات الدور
    select distinct
        perm.permission_key,
        perm.permission_name_ar,
        perm.category
    from user_roles ur
    join role_permissions rp on rp.role_name = ur.role_name
    join permissions perm    on perm.id = rp.permission_id
    where ur.user_id  = p_user_id
      and ur.is_active = true

    union

    -- الصلاحيات الفردية المضافة
    select distinct
        perm.permission_key,
        perm.permission_name_ar,
        perm.category
    from user_specific_permissions usp
    join permissions perm on perm.id = usp.permission_id
    where usp.user_id   = p_user_id
      and usp.is_granted = true
      and (usp.expires_at is null or usp.expires_at > now())

    union

    -- مفاتيحُ المكانة المشتقّة (بوّابة أدِيب): بابُ كلّ صاحب حساب، وغرفةُ المتطوّع
    select perm.permission_key, perm.permission_name_ar, perm.category
    from permissions perm
    where (perm.permission_key = 'use_portal'
           and exists (select 1 from auth.users u where u.id = p_user_id))
       or (perm.permission_key = 'view_own_volunteering'
           and public.adeeb_standing(p_user_id) = 'volunteer')

    except

    -- حذف الصلاحيات المحظورة صراحةً
    select distinct
        perm.permission_key,
        perm.permission_name_ar,
        perm.category
    from user_specific_permissions usp
    join permissions perm on perm.id = usp.permission_id
    where usp.user_id   = p_user_id
      and usp.is_granted = false
      and (usp.expires_at is null or usp.expires_at > now());
end;
$function$;

-- FILE 20261017100000_notifications_03_positions.sql
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

CREATE OR REPLACE FUNCTION public.stamp_role_end()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if old.is_active and not new.is_active then
    new.ended_at := coalesce(new.ended_at, now());
  elsif not old.is_active and new.is_active then
    new.ended_at := null;
  end if;
  return new;
end;
$function$;
CREATE TRIGGER trg_enforce_seat_belongs_to_unit BEFORE INSERT OR UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION enforce_seat_belongs_to_unit();
CREATE TRIGGER trg_stamp_role_end BEFORE UPDATE OF is_active ON public.user_roles FOR EACH ROW EXECUTE FUNCTION stamp_role_end();
CREATE CONSTRAINT TRIGGER trg_live_member_has_seat AFTER INSERT OR DELETE OR UPDATE ON public.user_roles DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION guard_live_member_has_seat();
CREATE TRIGGER trg_enforce_home_unit_match BEFORE INSERT OR UPDATE OF role_name, committee_id ON public.user_roles FOR EACH ROW EXECUTE FUNCTION enforce_home_unit_match();
CREATE TRIGGER user_roles_cascade_candidacy AFTER UPDATE OF is_active ON public.user_roles FOR EACH ROW EXECUTE FUNCTION cascade_membership_loss_to_candidacy();
CREATE TRIGGER trg_enforce_position_uniqueness BEFORE INSERT OR UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION enforce_position_uniqueness();
CREATE TRIGGER user_roles_cascade_supervision AFTER DELETE OR UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION cascade_membership_loss_to_supervision();

create or replace function public.adeeb_standing(p_user uuid) returns text language sql stable security definer set search_path to 'public' as $$
  select case when public.is_adeeb_member(p_user) then 'member'
    when exists (select 1 from public.volunteers v where v.user_id = p_user and v.status = 'active') then 'volunteer' else 'visitor' end; $$;
