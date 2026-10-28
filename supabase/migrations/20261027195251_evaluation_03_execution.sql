-- تقييمُ القيادات الربعيّ (٣): الحكمُ والتنفيذُ والتصحيح، ومهلةُ الانتخاب.
--
-- بعد الإغلاق ينادي المؤقّتُ `evaluation-execute` منفذَ الخادم (`/api/evaluation/execute`): يقرأ المجاميع
-- (`evaluation_tally`)، ويحكم بدالّة الكود النقيّة (`lib/evaluation/score.ts`)، ويسلّم الأحكامَ لـ
-- `evaluation_record` فتكتبها وتنفّذ الاستبعادَ في معاملةٍ واحدة. والقيدُ `evaluation_targets_verdict_matches`
-- يرفض حكمًا يخالف النتيجة.
--
-- **الاستبعادُ حكمٌ من اللائحة لا بسلطة شخص** (م٩/1): لا يمرّ على `can_assign_role`، ولا يُنسب إلى أحد،
-- ولا إلى حساب النادي. فاعلُه في السجلّات فارغ.
--
-- قراراتُ محمد (٢٠٢٦-١٠-٢٠) في ما لم تحسمه اللائحة:
--   ١. التصحيحُ بعد شغل المقعد: يُصحَّح السجلُّ ويُبلَّغ المستبعَد ولا يُعاد. ولا يُفتح انتخابٌ على المقعد
--      قبل ٧ أيامٍ من الاستبعاد، لتتّسع مهلةُ التصحيح (`evaluation_hold_election`).
--   ٤. منسّقٌ استُبعد ولا لجنةَ سابقةَ له يعود إليها: يختار له قائدُ الموارد لجنةً، ثمّ يُنفَّذ.
--   ٥. التصحيحُ العكسيّ: من نزلت نتيجتُه المصحَّحة إلى 40% أو أقلّ استُبعد، فالحكمُ يتبع النتيجة.

-- ══ العودةُ عضوًا: منطقٌ واحدٌ لبابين ══════════════════════════════════════
--
-- مستخرَجٌ من `revoke_position` (آخرُ تعريفٍ لها: `20261017100000_notifications_03_positions`) بلا تغيير:
-- القائدُ والنائبُ يعودان عضوين في لجنتهما، ومن لا لجنةَ لمقعده (المنسّق) يعود إلى آخر لجنةٍ كان
-- عضوًا فيها. ويُعيد اللجنةَ التي عاد إليها، أو فارغًا إن لم يجد.
-- و`p_to` لجنةٌ يختارها قائدُ الموارد لمنسّقٍ مستبعَدٍ لا لجنةَ سابقةَ له (المسألة ٤).

create or replace function public._return_to_member_seat(p_user uuid, p_role_name text, p_committee integer,
                                                         p_actor uuid, p_note text, p_to integer default null)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_back integer;
  v_seat text;
  v_row  integer;
begin
  if p_to is not null then
    select c.id, c.member_role_name into v_back, v_seat
    from committees c
    where c.id = p_to and c.is_active and c.council_id = 'executive';
  elsif not exists (
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

  if v_back is null or v_seat is null then
    return null;
  end if;

  select id into v_row from user_roles
  where user_id = p_user and role_name = v_seat and committee_id = v_back and not is_acting
  limit 1;

  if v_row is not null then
    update user_roles set is_active = true, assigned_by = p_actor, assigned_at = now(), notes = p_note
    where id = v_row;
  else
    insert into user_roles (user_id, role_name, committee_id, department_id, is_active, assigned_by, notes)
    values (p_user, v_seat, v_back, null, true, p_actor, p_note);
  end if;

  return v_back;
end;
$function$;
comment on function public._return_to_member_seat(uuid, text, integer, uuid, text, integer) is
  'يُعيد صاحبَ منصبٍ أُطفئ عضوًا: في لجنته، أو في آخر لجنةٍ كان عضوًا فيها، أو في لجنةٍ تُسمّى. ينادِيه revoke_position وتنفيذُ تقييم القيادات.';

-- revoke_position: كما كانت، والعودةُ عضوًا صارت نداءً لـ _return_to_member_seat
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

  -- العودةُ عضوًا: منطقُها في `_return_to_member_seat` (٢٠٢٦-١٠-٢٠)، يناديها هذا البابُ وتنفيذُ
  -- تقييم القيادات معًا، فلا تُنسخ. والسلوكُ هنا كما كان حرفًا بحرف.
  v_back := _return_to_member_seat(p_user, p_role_name, p_committee, p_actor, 'عاد عضوًا بعد نزع منصبه.');
  if v_back is not null then
    select c.member_role_name into v_seat from committees c where c.id = v_back;

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


-- ══ المجاميع ═════════════════════════════════════════════════════════════
-- لكلّ مقيَّمٍ لم يُحكم فيه بعد (أو لمقيَّمٍ واحدٍ في التصحيح): مجموعُ كلّ شقّ، وأوراقُه، ومؤهّلوه.
-- لا تُعدّ ورقةٌ أُبطلت، ولا مؤهَّلٌ أُخرج بالتصحيح.

create or replace function public.evaluation_tally(p_cycle integer, p_target integer default null)
returns table(target_id integer, m_sum integer, m_ballots integer, m_eligible integer,
              c_sum integer, c_ballots integer, c_eligible integer)
language sql
stable
security definer
set search_path to 'public'
as $$
  select t.id,
         coalesce((select sum(s)::integer from evaluation_ballots b, unnest(b.scores) s
                   where b.target_id = t.id and b.part = 'members' and b.voided_at is null), 0),
         (select count(*)::integer from evaluation_ballots b
          where b.target_id = t.id and b.part = 'members' and b.voided_at is null),
         (select count(*)::integer from evaluation_electorate e
          where e.target_id = t.id and e.part = 'members' and e.removed_at is null),
         coalesce((select sum(s)::integer from evaluation_ballots b, unnest(b.scores) s
                   where b.target_id = t.id and b.part = 'council' and b.voided_at is null), 0),
         (select count(*)::integer from evaluation_ballots b
          where b.target_id = t.id and b.part = 'council' and b.voided_at is null),
         (select count(*)::integer from evaluation_electorate e
          where e.target_id = t.id and e.part = 'council' and e.removed_at is null)
  from evaluation_targets t
  where t.cycle_id = p_cycle and t.excluded is null and t.cancelled is null
    and ((p_target is null and t.verdict is null) or t.id = p_target)
  order by t.id;
$$;
comment on function public.evaluation_tally(integer, integer) is
  'مجاميعُ الشقّين لكلّ مقيَّم، يقرؤها منفذُ التنفيذ وبابُ التصحيح ليحكم فيها `lib/evaluation/score.ts`. للخدمة وحدها.';

-- يكتب حكمًا واحدًا بعد أن يطابق مجاميعَه الحاضرة: فلا يُكتب حكمٌ حُسب على أوراقٍ تغيّرت بعده.
-- `p_r` ما أعادته دالّةُ الكود: { targetId, tally:{…}, branch, membersQuorum, members:[n,d]|null,
-- council:[n,d]|null, final:[n,d]|null, verdict }. وقيودُ الجدول تحرس الباقي.
create or replace function public._evaluation_write_result(p_r jsonb)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_t   evaluation_targets%rowtype;
  v_now record;
begin
  select * into v_t from evaluation_targets where id = (p_r->>'targetId')::integer for update;
  if v_t.id is null then raise exception 'EVAL_TARGET: مقيَّمٌ غير موجود'; end if;

  select * into v_now from evaluation_tally(v_t.cycle_id, v_t.id);
  if v_now.m_sum      is distinct from (p_r->'tally'->>'mSum')::integer
  or v_now.m_ballots  is distinct from (p_r->'tally'->>'mBallots')::integer
  or v_now.m_eligible is distinct from (p_r->'tally'->>'mEligible')::integer
  or v_now.c_sum      is distinct from (p_r->'tally'->>'cSum')::integer
  or v_now.c_ballots  is distinct from (p_r->'tally'->>'cBallots')::integer
  or v_now.c_eligible is distinct from (p_r->'tally'->>'cEligible')::integer then
    raise exception 'EVAL_STALE: تغيّرت المجاميعُ بعد الحساب، فأعِد الحساب';
  end if;

  update evaluation_targets set
    members_sum = v_now.m_sum, members_ballots = v_now.m_ballots, members_eligible = v_now.m_eligible,
    council_sum = v_now.c_sum, council_ballots = v_now.c_ballots, council_eligible = v_now.c_eligible,
    members_quorum = (p_r->>'membersQuorum')::boolean,
    branch = p_r->>'branch',
    members_num = (p_r->'members'->>0)::bigint, members_den = (p_r->'members'->>1)::bigint,
    council_num = (p_r->'council'->>0)::bigint, council_den = (p_r->'council'->>1)::bigint,
    final_num = (p_r->'final'->>0)::bigint, final_den = (p_r->'final'->>1)::bigint,
    verdict = p_r->>'verdict',
    decided_at = now()
  where id = v_t.id;
end;
$$;

-- ══ الاستبعاد (م٩) ═══════════════════════════════════════════════════════

create or replace function public._evaluation_remove(p_target integer)
returns text
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_t     evaluation_targets%rowtype;
  v_back  integer;
  v_seat  text;
  v_hold  date;
  v_note  constant text := 'عاد عضوًا باستبعاده وفق لائحة تقييم القيادات.';
begin
  select * into v_t from evaluation_targets where id = p_target for update;
  if v_t.verdict is distinct from 'removed' or v_t.removed_at is not null then return 'skip'; end if;

  -- المقعدُ نفسُه ما زال حيًّا لصاحبه؟ وإلّا فلا شيءَ يُطفأ (ترك منصبه بعد الإغلاق)
  if not exists (select 1 from user_roles ur
                 where ur.id = v_t.seat_id and ur.is_active and not ur.is_acting
                   and ur.user_id = v_t.user_id and ur.role_name = v_t.role_name) then
    insert into evaluation_audit_log (cycle_id, target_id, event, details)
    values (v_t.cycle_id, v_t.id, 'removal_executed', jsonb_build_object('skipped', 'seat_gone'));
    return 'seat_gone';
  end if;

  -- الإطفاءُ والعودةُ معًا أو لا شيء: منسّقٌ لا لجنةَ سابقةَ له يُعاد كما كان، وينتظر لجنةً يختارها
  -- قائدُ الموارد (المسألة ٤). ولا يُترك عضوٌ بلا مقعد (`guard_live_member_has_seat`).
  begin
    update user_roles set is_active = false where id = v_t.seat_id;
    v_back := _return_to_member_seat(v_t.user_id, v_t.role_name, v_t.committee_id, null, v_note, v_t.returned_to);
    if v_back is null then
      raise exception using errcode = 'ADEEB', message = 'NO_RETURN';
    end if;
  exception when sqlstate 'ADEEB' then
    if not v_t.awaiting_return then
      update evaluation_targets set awaiting_return = true where id = v_t.id;
      insert into evaluation_audit_log (cycle_id, target_id, event)
      values (v_t.cycle_id, v_t.id, 'removal_awaiting_return');
      perform notify_event('evaluation.awaiting_return',
        _position_facts(v_t.role_name, v_t.committee_id, v_t.department_id)
          || jsonb_build_object('targetId', v_t.id, 'cycleId', v_t.cycle_id, 'name', v_t.full_name), null);
    end if;
    return 'awaiting_return';
  end;

  v_hold := (now() at time zone 'Asia/Riyadh')::date + 7;
  update evaluation_targets set removed_at = now(), returned_to = v_back, awaiting_return = false where id = v_t.id;
  select c.member_role_name into v_seat from committees c where c.id = v_back;

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (null, 'evaluation_removal', 'user_role', v_t.seat_id::text, jsonb_build_object(
    'user_id', v_t.user_id, 'role_name', v_t.role_name, 'committee_id', v_t.committee_id,
    'department_id', v_t.department_id, 'cycle_id', v_t.cycle_id, 'target_id', v_t.id,
    'final', jsonb_build_array(v_t.final_num, v_t.final_den), 'returned_to', v_back));

  insert into evaluation_audit_log (cycle_id, target_id, event, details)
  values (v_t.cycle_id, v_t.id, 'removal_executed', jsonb_build_object('returned_to', v_back));

  perform notify_event('evaluation.removed',
    _position_facts(v_t.role_name, v_t.committee_id, v_t.department_id)
      || jsonb_build_object('userId', v_t.user_id, 'name', v_t.full_name, 'targetId', v_t.id,
                            'cycleId', v_t.cycle_id, 'final', jsonb_build_array(v_t.final_num, v_t.final_den),
                            'back', _position_facts(v_seat, v_back, null), 'holdUntil', v_hold), null);
  return 'removed';
end;
$$;

-- ══ كتابةُ الأحكام وتنفيذُها ══════════════════════════════════════════════

create or replace function public.evaluation_record(p_cycle integer, p_results jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_c       evaluation_cycles%rowtype;
  v_r       jsonb;
  v_t       evaluation_targets%rowtype;
  v_prev    integer;
  v_removed integer := 0;
  v_waiting integer := 0;
  v_out     text;
  v_unit    record;
begin
  select * into v_c from evaluation_cycles where id = p_cycle for update;
  if v_c.status is distinct from 'closed' then
    return jsonb_build_object('ok', false, 'message', 'الدورةُ ليست مغلقةً تنتظر الحكم.');
  end if;

  for v_r in select * from jsonb_array_elements(p_results) loop
    perform _evaluation_write_result(v_r);
  end loop;

  -- لا يبقى مقيَّمٌ بلا حكم: أحكامٌ ناقصةٌ تُرفض كلُّها
  if exists (select 1 from evaluation_targets where cycle_id = p_cycle and excluded is null and verdict is null) then
    raise exception 'EVAL_INCOMPLETE: بقي مقيَّمٌ بلا حكم';
  end if;

  update evaluation_cycles set status = 'executed', executed_at = now() where id = p_cycle;
  insert into evaluation_audit_log (cycle_id, event, details)
  select p_cycle, 'results_recorded', jsonb_build_object(
    'kept', count(*) filter (where verdict = 'kept'),
    'removed', count(*) filter (where verdict = 'removed'),
    'no_result', count(*) filter (where verdict = 'no_result'))
  from evaluation_targets where cycle_id = p_cycle and excluded is null;

  -- الاستبعادُ في اليوم التالي للإغلاق (م٩/2)، في المعاملة نفسِها
  for v_t in select * from evaluation_targets where cycle_id = p_cycle and verdict = 'removed' order by id loop
    v_out := _evaluation_remove(v_t.id);
    if v_out = 'removed' then v_removed := v_removed + 1; end if;
    if v_out = 'awaiting_return' then v_waiting := v_waiting + 1; end if;
  end loop;

  -- نتيجةُ كلّ مقيَّمٍ له وحده (م١٠/2). والمستبعَدُ خبرُه في إشعار الاستبعاد.
  for v_t in select * from evaluation_targets
             where cycle_id = p_cycle and excluded is null and verdict in ('kept', 'no_result') and user_id is not null loop
    perform notify_event('evaluation.result',
      _position_facts(v_t.role_name, v_t.committee_id, v_t.department_id)
        || jsonb_build_object('userId', v_t.user_id, 'targetId', v_t.id, 'cycleId', p_cycle,
                              'verdict', v_t.verdict, 'final',
                              case when v_t.final_num is null then null
                                   else jsonb_build_array(v_t.final_num, v_t.final_den) end), null);
  end loop;

  -- م٥/4: وحدةٌ لم يكتمل نصابُ أعضائها دورتين متتاليتين يثبتها قائدُ الضمان في تقريره.
  -- الوحدةُ لجنةُ القائد والنائب أو قسمُ المنسّق، ويكفي أن يسقط النصابُ لأحد مقيَّميها وفيها مؤهَّل.
  select id into v_prev from evaluation_cycles
  where status = 'executed' and due_on < v_c.due_on order by due_on desc limit 1;
  if v_prev is not null then
    for v_unit in
      select distinct t.committee_id, case when t.committee_id is null then t.department_id end as department_id,
             t.unit_name
      from evaluation_targets t
      where t.cycle_id = p_cycle and t.members_quorum = false and t.members_eligible > 0
        and exists (select 1 from evaluation_targets p
                    where p.cycle_id = v_prev and p.members_quorum = false and p.members_eligible > 0
                      and p.committee_id is not distinct from t.committee_id
                      and (t.committee_id is not null or p.department_id = t.department_id))
    loop
      perform notify_event('evaluation.quorum_missed', jsonb_build_object(
        'unit', v_unit.unit_name, 'cycleId', p_cycle, 'dueOn', v_c.due_on), null);
    end loop;
  end if;

  return jsonb_build_object('ok', true, 'removed', v_removed, 'awaitingReturn', v_waiting);
end;
$$;
comment on function public.evaluation_record(integer, jsonb) is
  'يكتب أحكامَ دورةٍ مغلقة كما حسبها `lib/evaluation/score.ts`، وينفّذ الاستبعاد في المعاملة نفسِها. للخدمة وحدها (منفذ /api/evaluation/execute).';

-- ══ التصحيح (م١٠/3) ══════════════════════════════════════════════════════
-- بيد صاحب `manage_leader_evaluation` وحده، بسببٍ مكتوب، وكلُّه في السجلّ. ولا باب تظلّم (م١٠/1).
-- الدوالُّ للخدمة وحدها: الإجراءُ الخادميّ يقرأ الفاعلَ من الجلسة، والقاعدةُ تتحقّق من قدرته ثانيةً.

create or replace function public._evaluation_can_manage(p_actor uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (select 1 from get_user_permissions(p_actor) g where g.permission_key = 'manage_leader_evaluation');
$$;

-- يُخرج من اللقطة من دخلها خطأً (وتُبطل ورقتُه إن كانت)، أو يُدخل من سقط منها خطأً
create or replace function public.evaluation_correct_rater(p_actor uuid, p_target integer, p_rater uuid,
                                                           p_action text, p_part text, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_t    evaluation_targets%rowtype;
  v_c    evaluation_cycles%rowtype;
  v_why  text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not _evaluation_can_manage(p_actor) then
    return jsonb_build_object('ok', false, 'message', 'لا تملك تصحيح تقييم القيادات.');
  end if;
  if v_why is null or char_length(v_why) < 3 then
    return jsonb_build_object('ok', false, 'message', 'اكتب سبب التصحيح.');
  end if;

  select * into v_t from evaluation_targets where id = p_target for update;
  if v_t.id is null or v_t.excluded is not null or v_t.cancelled is not null then
    return jsonb_build_object('ok', false, 'message', 'هذا التقييم لا يُصحَّح.');
  end if;
  select * into v_c from evaluation_cycles where id = v_t.cycle_id;
  if v_c.status = 'scheduled' then
    return jsonb_build_object('ok', false, 'message', 'الدورةُ لم تُفتح بعد.');
  end if;
  if p_rater = v_t.user_id then
    return jsonb_build_object('ok', false, 'message', 'لا يقيّم أحدٌ نفسه.');
  end if;

  if p_action = 'remove' then
    update evaluation_electorate set removed_at = now()
    where target_id = p_target and rater_id = p_rater and removed_at is null;
    if not found then
      return jsonb_build_object('ok', false, 'message', 'ليس في مقيِّمي هذا التقييم.');
    end if;
    update evaluation_ballots set voided_at = now()
    where target_id = p_target and rater_id = p_rater and voided_at is null;
    -- لا يُكتب في السجلّ أكانت له ورقةٌ أم لا: ذاك خبرُ مشاركته
    insert into evaluation_audit_log (cycle_id, target_id, actor_id, event, reason, details)
    values (v_t.cycle_id, p_target, p_actor, 'rater_removed', v_why, jsonb_build_object('rater', p_rater));
  elsif p_action = 'add' then
    if p_part not in ('members', 'council') then
      return jsonb_build_object('ok', false, 'message', 'اختر الشقّ.');
    end if;
    if not exists (select 1 from profiles where id = p_rater) then
      return jsonb_build_object('ok', false, 'message', 'العضو غير موجود.');
    end if;
    insert into evaluation_electorate (target_id, rater_id, part, added_by_correction)
    values (p_target, p_rater, p_part, true)
    on conflict on constraint evaluation_electorate_once
      do update set removed_at = null, part = excluded.part, added_by_correction = true
      where evaluation_electorate.removed_at is not null;
    if not found then
      return jsonb_build_object('ok', false, 'message', 'هو في مقيِّمي هذا التقييم أصلًا.');
    end if;
    -- من أُخرج ثمّ أُعيد تعود ورقتُه إن كانت
    update evaluation_ballots set voided_at = null where target_id = p_target and rater_id = p_rater;
    insert into evaluation_audit_log (cycle_id, target_id, actor_id, event, reason, details)
    values (v_t.cycle_id, p_target, p_actor, 'rater_added', v_why,
            jsonb_build_object('rater', p_rater, 'part', p_part));
  else
    return jsonb_build_object('ok', false, 'message', 'فعلٌ غير معروف.');
  end if;

  -- عددُ المؤهّلين يتبع اللقطةَ المصحَّحة (يُعرض في الغرفة قبل الحكم)
  update evaluation_targets t set
    members_eligible = (select count(*) from evaluation_electorate e where e.target_id = t.id and e.part = 'members' and e.removed_at is null),
    council_eligible = (select count(*) from evaluation_electorate e where e.target_id = t.id and e.part = 'council' and e.removed_at is null)
  where t.id = p_target and t.verdict is null;

  return jsonb_build_object('ok', true, 'message', 'صُحّحت الأهليّة.', 'needsRecompute', v_t.verdict is not null);
end;
$$;

-- يُعيد المستبعَدَ إلى مقعده إن أمكن (م١٠/3)، ويقول لماذا إن لم يمكن (المسألة ١)
create or replace function public._evaluation_restore(p_target integer, p_actor uuid)
returns text
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_t      evaluation_targets%rowtype;
  v_seat   user_roles%rowtype;
  v_uniq   text;
  v_member integer;
  v_why    text;
begin
  select * into v_t from evaluation_targets where id = p_target for update;

  -- لم يُنفَّذ استبعادُه أصلًا (ينتظر لجنة): يسقط الانتظار ولا شيءَ يُعاد
  if v_t.removed_at is null then
    update evaluation_targets set awaiting_return = false where id = p_target;
    return 'not_executed';
  end if;
  if v_t.restored_at is not null then return 'already'; end if;

  select * into v_seat from user_roles where id = v_t.seat_id;
  select r.holder_uniqueness into v_uniq from roles r where r.role_name = v_t.role_name;

  if v_seat.id is null or not public.is_adeeb_member(v_t.user_id) then
    v_why := 'gone';
  elsif exists (
    select 1 from user_roles o
    where o.role_name = v_t.role_name and o.is_active and o.user_id <> v_t.user_id
      and (v_uniq <> 'per_committee'  or o.committee_id  is not distinct from v_t.committee_id)
      and (v_uniq <> 'per_department' or o.department_id is not distinct from v_t.department_id)
      and v_uniq <> 'multi') then
    v_why := 'occupied';
  elsif exists (
    select 1 from elections e
    where e.archived_at is null and e.status in ('candidacy_open', 'candidacy_closed', 'voting_open', 'voting_closed')
      and e.target_role_name = v_t.role_name
      and e.target_committee_id is not distinct from v_t.committee_id
      and (v_t.committee_id is not null or e.target_department_id = v_t.department_id)) then
    v_why := 'election';
  else
    -- يعود من المقعد الذي عاد إليه عضوًا، لا من غيره: من انتقل بعدها إلى منصبٍ آخر لا يُنتزع منه
    select ur.id into v_member from user_roles ur
    where ur.user_id = v_t.user_id and ur.is_active and not ur.is_acting
      and ur.committee_id is not distinct from v_t.returned_to
      and ur.role_name = (select c.member_role_name from committees c where c.id = v_t.returned_to);
    if v_member is null then
      v_why := 'moved';
    end if;
  end if;

  if v_why is not null then
    insert into evaluation_audit_log (cycle_id, target_id, actor_id, event, details)
    values (v_t.cycle_id, p_target, p_actor, 'restore_skipped', jsonb_build_object('why', v_why));
    return v_why;
  end if;

  update user_roles set is_active = false where id = v_member;
  update user_roles set is_active = true, assigned_by = p_actor,
         notes = 'أُعيد إلى منصبه بتصحيح تقييم القيادات.'
  where id = v_t.seat_id;
  update evaluation_targets set restored_at = now() where id = p_target;
  insert into evaluation_audit_log (cycle_id, target_id, actor_id, event) values (v_t.cycle_id, p_target, p_actor, 'restored');
  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (p_actor, 'evaluation_restore', 'user_role', v_t.seat_id::text,
          jsonb_build_object('user_id', v_t.user_id, 'target_id', p_target));
  return 'restored';
end;
$$;

-- يكتب حكمًا مصحَّحًا ويعمل بما يترتّب عليه: إعادةٌ (م١٠/3)، أو استبعادٌ (المسألة ٥)
create or replace function public.evaluation_apply_correction(p_actor uuid, p_result jsonb, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_t      evaluation_targets%rowtype;
  v_after  evaluation_targets%rowtype;
  v_why    text := nullif(btrim(coalesce(p_reason, '')), '');
  v_out    text;
begin
  if not _evaluation_can_manage(p_actor) then
    return jsonb_build_object('ok', false, 'message', 'لا تملك تصحيح تقييم القيادات.');
  end if;
  if v_why is null or char_length(v_why) < 3 then
    return jsonb_build_object('ok', false, 'message', 'اكتب سبب التصحيح.');
  end if;

  select * into v_t from evaluation_targets where id = (p_result->>'targetId')::integer for update;
  if v_t.id is null or v_t.verdict is null or v_t.cancelled is not null then
    return jsonb_build_object('ok', false, 'message', 'لا حكمَ في هذا التقييم يُصحَّح.');
  end if;

  perform _evaluation_write_result(p_result);
  select * into v_after from evaluation_targets where id = v_t.id;

  insert into evaluation_audit_log (cycle_id, target_id, actor_id, event, reason, details)
  values (v_t.cycle_id, v_t.id, p_actor, 'result_corrected', v_why, jsonb_build_object(
    'from', jsonb_build_object('verdict', v_t.verdict, 'final', jsonb_build_array(v_t.final_num, v_t.final_den)),
    'to', jsonb_build_object('verdict', v_after.verdict, 'final', jsonb_build_array(v_after.final_num, v_after.final_den))));

  if v_t.verdict = 'removed' and v_after.verdict <> 'removed' then
    v_out := _evaluation_restore(v_t.id, p_actor);
  elsif v_t.verdict <> 'removed' and v_after.verdict = 'removed' then
    -- قد يكون أُعيد قبلُ بتصحيحٍ سابق: الاستبعادُ يقع من جديد على مقعده الحيّ
    update evaluation_targets set removed_at = null, restored_at = null where id = v_t.id;
    v_out := _evaluation_remove(v_t.id);
  else
    v_out := 'unchanged';
  end if;

  perform notify_event('evaluation.corrected',
    _position_facts(v_t.role_name, v_t.committee_id, v_t.department_id)
      || jsonb_build_object('userId', v_t.user_id, 'name', v_t.full_name, 'targetId', v_t.id,
                            'from', v_t.verdict, 'to', v_after.verdict, 'outcome', v_out,
                            'final', case when v_after.final_num is null then null
                                          else jsonb_build_array(v_after.final_num, v_after.final_den) end),
    p_actor);

  return jsonb_build_object('ok', true, 'outcome', v_out, 'verdict', v_after.verdict);
end;
$$;

-- يختار قائدُ الموارد لجنةً لمنسّقٍ مستبعَدٍ لا لجنةَ سابقةَ له، فيُنفَّذ استبعادُه (المسألة ٤)
create or replace function public.evaluation_choose_return(p_actor uuid, p_target integer, p_committee integer)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_t   evaluation_targets%rowtype;
  v_out text;
begin
  if not _evaluation_can_manage(p_actor) then
    return jsonb_build_object('ok', false, 'message', 'لا تملك إدارة تقييم القيادات.');
  end if;
  select * into v_t from evaluation_targets where id = p_target for update;
  if v_t.id is null or not v_t.awaiting_return then
    return jsonb_build_object('ok', false, 'message', 'لا ينتظر هذا الاستبعادُ لجنة.');
  end if;
  if not exists (select 1 from committees c where c.id = p_committee and c.is_active and c.council_id = 'executive') then
    return jsonb_build_object('ok', false, 'message', 'اختر لجنةً قائمة.');
  end if;

  update evaluation_targets set returned_to = p_committee where id = p_target;
  insert into evaluation_audit_log (cycle_id, target_id, actor_id, event, details)
  values (v_t.cycle_id, p_target, p_actor, 'return_chosen', jsonb_build_object('committee_id', p_committee));
  v_out := _evaluation_remove(p_target);
  if v_out <> 'removed' then
    raise exception 'EVAL_RETURN: تعذّر تنفيذ الاستبعاد (%)', v_out;
  end if;
  return jsonb_build_object('ok', true, 'message', 'نُفّذ الاستبعاد.');
end;
$$;

-- ══ قراءاتُ الغرفة (للخدمة وحدها، والقدرةُ في الخادم) ══════════════════════
-- أعدادٌ لا أسماء: من شارك لا يُعرف، ولا ورقةَ تُقرأ.

create or replace function public.evaluation_admin_cycles()
returns table(id integer, due_on date, opens_at timestamptz, closes_at timestamptz, status text,
              executed_at timestamptz, blocked boolean, targets integer, excluded integer, raters integer,
              ballots integer, kept integer, removed integer, no_result integer)
language sql
stable
security definer
set search_path to 'public'
as $$
  select c.id, c.due_on, c.opens_at, c.closes_at, c.status, c.executed_at, c.blocked_noted_at is not null,
         (select count(*)::integer from evaluation_targets t where t.cycle_id = c.id and t.excluded is null),
         (select count(*)::integer from evaluation_targets t where t.cycle_id = c.id and t.excluded is not null),
         (select count(distinct e.rater_id)::integer from evaluation_electorate e
            join evaluation_targets t on t.id = e.target_id where t.cycle_id = c.id and e.removed_at is null),
         (select count(*)::integer from evaluation_ballots b
            join evaluation_targets t on t.id = b.target_id where t.cycle_id = c.id and b.voided_at is null),
         (select count(*)::integer from evaluation_targets t where t.cycle_id = c.id and t.verdict = 'kept'),
         (select count(*)::integer from evaluation_targets t where t.cycle_id = c.id and t.verdict = 'removed'),
         (select count(*)::integer from evaluation_targets t where t.cycle_id = c.id and t.verdict = 'no_result')
  from evaluation_cycles c
  order by c.due_on desc;
$$;

create or replace function public.evaluation_admin_targets(p_cycle integer)
returns table(id integer, user_id uuid, full_name text, gender text, role_name text, committee_id integer,
              department_id integer, unit_name text, seat_assigned_at timestamptz, excluded text, cancelled text,
              members_eligible integer, members_ballots integer, council_eligible integer, council_ballots integer,
              members_quorum boolean, branch text, members_num bigint, members_den bigint,
              council_num bigint, council_den bigint, final_num bigint, final_den bigint, verdict text,
              removed_at timestamptz, returned_to integer, awaiting_return boolean, restored_at timestamptz)
language sql
stable
security definer
set search_path to 'public'
as $$
  select t.id, t.user_id, t.full_name, t.gender, t.role_name, t.committee_id, t.department_id, t.unit_name,
         t.seat_assigned_at, t.excluded, t.cancelled,
         (select count(*)::integer from evaluation_electorate e where e.target_id = t.id and e.part = 'members' and e.removed_at is null),
         (select count(*)::integer from evaluation_ballots b where b.target_id = t.id and b.part = 'members' and b.voided_at is null),
         (select count(*)::integer from evaluation_electorate e where e.target_id = t.id and e.part = 'council' and e.removed_at is null),
         (select count(*)::integer from evaluation_ballots b where b.target_id = t.id and b.part = 'council' and b.voided_at is null),
         t.members_quorum, t.branch, t.members_num, t.members_den, t.council_num, t.council_den,
         t.final_num, t.final_den, t.verdict, t.removed_at, t.returned_to, t.awaiting_return, t.restored_at
  from evaluation_targets t
  where t.cycle_id = p_cycle
  order by t.excluded nulls first, t.unit_name, t.role_name, t.full_name;
$$;

-- مقيِّمو مقيَّمٍ واحد لباب التصحيح: من هم وشقُّهم، **ولا شيءَ عن مشاركتهم**
create or replace function public.evaluation_admin_electorate(p_target integer)
returns table(rater_id uuid, full_name text, part text, added_by_correction boolean, removed boolean)
language sql
stable
security definer
set search_path to 'public'
as $$
  select e.rater_id, p.full_name, e.part, e.added_by_correction, e.removed_at is not null
  from evaluation_electorate e
  left join profiles p on p.id = e.rater_id
  where e.target_id = p_target
  order by e.part desc, p.full_name;
$$;

create or replace function public.evaluation_admin_log(p_cycle integer)
returns table(at timestamptz, event text, target_id integer, actor_name text, reason text, details jsonb)
language sql
stable
security definer
set search_path to 'public'
as $$
  select l.created_at, l.event, l.target_id, p.full_name, l.reason, l.details
  from evaluation_audit_log l
  left join profiles p on p.id = l.actor_id
  where l.cycle_id = p_cycle
  order by l.created_at desc, l.id desc;
$$;

-- ══ مهلةُ الانتخاب (المسألة ١) ═══════════════════════════════════════════
-- لا يُفتح انتخابٌ على مقعدٍ خلا بالاستبعاد قبل ٧ أيامٍ منه، لتتّسع مهلةُ التصحيح. ورسالتُه تصل
-- مديرَ الانتخابات كما هي (`mapCreateError` يمرّر رسائل P0001 العربيّة).

create or replace function public.evaluation_hold_election()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_until date;
begin
  select max((t.removed_at at time zone 'Asia/Riyadh')::date + 7) into v_until
  from evaluation_targets t
  where t.verdict = 'removed' and t.removed_at is not null and t.restored_at is null
    and t.role_name = new.target_role_name
    and t.committee_id is not distinct from new.target_committee_id
    and (new.target_committee_id is not null or t.department_id = new.target_department_id);

  if v_until is not null and (now() at time zone 'Asia/Riyadh')::date < v_until then
    raise exception 'خلا هذا المقعدُ بتقييم القيادات، ولا يُفتح انتخابُه قبل % لتتّسع مهلةُ التصحيح.',
      to_char(v_until, 'YYYY-MM-DD');
  end if;
  return new;
end;
$$;

create trigger elections_evaluation_hold
  before insert on public.elections
  for each row execute function public.evaluation_hold_election();

-- ══ منفذُ التنفيذ ═════════════════════════════════════════════════════════
-- بعد الإغلاق ينادي `/api/evaluation/execute` كلَّ عشر دقائق ما دامت دورةٌ مغلقةٌ تنتظر حكمها، بسرٍّ
-- مشتقٍّ من مفتاح الخدمة (`lib/cronGuard.ts`) محفوظٍ في Vault باسم `evaluation_execute_secret`.
-- والمنفذُ يُكرَّر بلا ضرر: الدورةُ المنفَّذة لا تُنفَّذ ثانية.

select cron.unschedule('evaluation-execute') where exists (select 1 from cron.job where jobname = 'evaluation-execute');
select cron.schedule(
  'evaluation-execute',
  '*/10 * * * *',
  $job$
  select net.http_post(
    url := 'https://adeeb.club/api/evaluation/execute',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select s.decrypted_secret from vault.decrypted_secrets s
                         where s.name = 'evaluation_execute_secret' limit 1)),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000)
  where exists (select 1 from public.evaluation_cycles c where c.status = 'closed');
  $job$
);
