-- ══ المكلَّفون يُقيَّمون للتطوير بلا استبعاد (محمد ٢٠٢٦-١١-٢٧) ═══════════════════════════════════
--
-- كان `_evaluation_open` يستثني المكلَّفين (`not ur.is_acting`): فمن كُلِّف بمقعد قائدٍ أو نائبٍ أو منسّق لا يُقيَّم أبدًا،
-- ولا يعرف كيف يراه فريقُه. وقرّر محمد أن يُقيَّموا **للتطوير**: يدخلون اللقطةَ ويقيّمهم الأعضاءُ والمجلسُ كغيرهم، ويرون نتيجتَهم
-- وبنودَهم في «نتيجتي»، **وحكمُهم لا يستبعدهم** مهما كانت نتيجتُهم (فالتكليفُ ليس مقعدًا يُنتزع بحدّ 40%؛ ينتهي بأجله أو بقرار من كلّفه).
-- وتعديلُ اللائحة بيد الرئيسين.
--
-- ما تغيّر:
-- 1. `evaluation_targets.acting`: علامةُ المكلَّف، تُكتب عند الفتح من `user_roles.is_acting`.
-- 2. القيدُ الفريد `(دورة، شخص، دور)` صار `(دورة، مقعد)`: من يشغل مقعدَ قائدِ لجنةٍ ويُكلَّف بمقعد قائدِ لجنةٍ أخرى
--    له هدفان، ولو بقي القيدُ القديمُ لسقط فتحُ الدورة كلُّه على تعارضٍ في الإدخال (والفتحُ يجري من المؤقّت لا من يد).
-- 3. `evaluation_targets_verdict_matches`: «باقٍ» يقبل مكلَّفًا نتيجتُه 40% أو أقلّ، و«مستبعَد» لا يقبل مكلَّفًا أبدًا.
-- 4. `evaluation_tally` تعيد `acting` فيحكم الكودُ (`recordFor`) بلا استبعاد، و`_evaluation_remove` تتجاوز المكلَّفَ حزامًا ثانيًا.
-- 5. `evaluation_my_results` و`evaluation_admin_targets` تعيدان `acting` فتقول «نتيجتي» وغرفةُ الإدارة إنّه تقييمُ تطوير.
-- 6. إشعارُ النتيجة يحمل `acting`، فيقول لصاحبه إنّ تقييمه للتطوير ولا أثرَ له على تكليفه.
--
-- لم يُمسّ شيءٌ حيٌّ: دورةُ نوفمبر مُنفَّذة بلا مكلَّفين، ودورةُ ديسمبر مجدولةٌ بلا مقيَّمين (تُفتح 22 ديسمبر).
-- جُرّبت في معاملةٍ أُرجعت: فتحُ الدورة بمكلَّفٍ فيها، وحكمُ «باقٍ» بـ20% على مكلَّف (يُقبل) وعلى غيره (يُرفض)،
-- وحكمُ «مستبعَد» على مكلَّف (يُرفض) وعلى غيره (يُقبل)، و`_evaluation_remove` على مكلَّف (تتجاوز).

alter table public.evaluation_targets add column acting boolean not null default false;
comment on column public.evaluation_targets.acting is
  'مكلَّفٌ بالمقعد (user_roles.is_acting): يُقيَّم للتطوير، وحكمُه لا يستبعده مهما كانت نتيجتُه.';

alter table public.evaluation_targets drop constraint evaluation_targets_once;
alter table public.evaluation_targets add constraint evaluation_targets_seat_once unique (cycle_id, seat_id);

alter table public.evaluation_targets drop constraint evaluation_targets_verdict_matches;
alter table public.evaluation_targets add constraint evaluation_targets_verdict_matches check (
  verdict is null
  or (verdict = 'no_result' and final_num is null and (branch = 'none' or cancelled is not null))
  or (verdict = 'removed' and not acting and cancelled is null and final_num is not null and (final_num * 5) <= (final_den * 2))
  or (verdict = 'kept' and cancelled is null and final_num is not null and (acting or (final_num * 5) > (final_den * 2)))
);

create or replace function public._evaluation_open(p_cycle integer)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_cycle evaluation_cycles%rowtype;
  v_raters jsonb;
begin
  select * into v_cycle from evaluation_cycles where id = p_cycle for update;
  if v_cycle.status <> 'scheduled' then return; end if;

  insert into evaluation_targets (cycle_id, user_id, seat_id, role_name, committee_id, department_id,
                                  full_name, gender, unit_name, seat_assigned_at, excluded, acting)
  select p_cycle, ur.user_id, ur.id, ur.role_name,
         case when ur.role_name = 'department_head' then null else ur.committee_id end,
         case when ur.role_name = 'department_head' then ur.department_id else c.department_id end,
         p.full_name, p.gender,
         coalesce(case when ur.role_name = 'department_head' then d.name_ar else c.committee_name_ar end, ''),
         ur.assigned_at,
         -- م١/4: شغل منصبه قبل الموعد بأقلّ من أسبوعين (كان أربعة أسابيع في الربعيّ)
         case when ur.assigned_at > v_cycle.opens_at - interval '14 days' then 'recent' end,
         -- المكلَّفُ يُقيَّم للتطوير بلا استبعاد (محمد ٢٠٢٦-١١-٢٧)
         ur.is_acting
  from user_roles ur
  join profiles p on p.id = ur.user_id
  left join committees c on c.id = ur.committee_id
  left join departments d on d.id = ur.department_id
  where ur.is_active and ur.frozen_by is null
    and public.is_adeeb_member(ur.user_id)
    and ((ur.role_name in ('committee_leader', 'deputy_committee_leader')
          and c.is_active and c.council_id = 'executive')
      or (ur.role_name = 'department_head' and ur.department_id is not null and coalesce(d.is_active, true)));

  insert into evaluation_electorate (target_id, rater_id, part)
  select t.id, r.rater_id, r.part
  from evaluation_targets t
  cross join lateral _evaluation_raters(t.user_id, t.role_name, t.committee_id, t.department_id) r
  where t.cycle_id = p_cycle and t.excluded is null;

  update evaluation_targets t
  set members_eligible = (select count(*) from evaluation_electorate e where e.target_id = t.id and e.part = 'members'),
      council_eligible = (select count(*) from evaluation_electorate e where e.target_id = t.id and e.part = 'council')
  where t.cycle_id = p_cycle;

  update evaluation_cycles set status = 'open', opened_at = now() where id = p_cycle;

  insert into evaluation_audit_log (cycle_id, event, details)
  select p_cycle, 'cycle_opened', jsonb_build_object(
    'targets', count(*) filter (where excluded is null),
    'excluded', count(*) filter (where excluded is not null),
    'acting', count(*) filter (where acting and excluded is null),
    'raters', (select count(distinct e.rater_id) from evaluation_electorate e
               join evaluation_targets x on x.id = e.target_id where x.cycle_id = p_cycle))
  from evaluation_targets where cycle_id = p_cycle;

  select coalesce(jsonb_agg(distinct e.rater_id), '[]'::jsonb) into v_raters
  from evaluation_electorate e join evaluation_targets t on t.id = e.target_id
  where t.cycle_id = p_cycle and e.rater_id is not null;

  if jsonb_array_length(v_raters) > 0 then
    perform notify_event('evaluation.opened', jsonb_build_object(
      'cycleId', p_cycle, 'closesAt', v_cycle.closes_at, 'lastDay', v_cycle.due_on + 3, 'raters', v_raters), null);
  end if;
end;
$function$;

create or replace function public._evaluation_remove(p_target integer)
returns text
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_t     evaluation_targets%rowtype;
  v_back  integer;
  v_seat  text;
  v_hold  date;
  v_note  constant text := 'عاد عضوًا باستبعاده وفق لائحة تقييم القيادات.';
begin
  select * into v_t from evaluation_targets where id = p_target for update;
  if v_t.verdict is distinct from 'removed' or v_t.removed_at is not null then return 'skip'; end if;
  if v_t.acting then return 'skip'; end if;

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
$function$;

drop function public.evaluation_tally(integer, integer);
create function public.evaluation_tally(p_cycle integer, p_target integer default null)
returns table(target_id integer, m_sum integer, m_ballots integer, m_eligible integer,
              c_sum integer, c_ballots integer, c_eligible integer, acting boolean)
language sql
stable
security definer
set search_path to 'public'
as $function$
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
          where e.target_id = t.id and e.part = 'council' and e.removed_at is null),
         t.acting
  from evaluation_targets t
  where t.cycle_id = p_cycle and t.excluded is null and t.cancelled is null
    and ((p_target is null and t.verdict is null) or t.id = p_target)
  order by t.id;
$function$;
revoke all on function public.evaluation_tally(integer, integer) from public, anon, authenticated;
grant execute on function public.evaluation_tally(integer, integer) to service_role;

create or replace function public.evaluation_record(p_cycle integer, p_results jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
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
    return jsonb_build_object('ok', false, 'message', 'التقييمُ ليس مغلقًا ينتظر الحكم.');
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
                              'verdict', v_t.verdict, 'acting', v_t.acting, 'final',
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
$function$;

drop function public.evaluation_my_results();
create function public.evaluation_my_results()
returns table(target_id integer, due_on date, role_name text, unit_name text, verdict text, branch text,
              final_num bigint, final_den bigint, members_ballots integer, members_eligible integer,
              council_ballots integer, comments integer, removed_at timestamp with time zone,
              restored_at timestamp with time zone, cancelled text, returned_unit text, awaiting_return boolean,
              acting boolean)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select t.id, c.due_on, t.role_name, t.unit_name, t.verdict, t.branch, t.final_num, t.final_den,
         t.members_ballots, t.members_eligible, t.council_ballots,
         (select count(*)::integer from evaluation_ballots b
          where b.target_id = t.id and b.voided_at is null and (b.keep_text is not null or b.change_text is not null)),
         t.removed_at, t.restored_at, t.cancelled,
         (select u.committee_name_ar from committees u where u.id = t.returned_to),
         t.awaiting_return,
         t.acting
  from evaluation_targets t
  join evaluation_cycles c on c.id = t.cycle_id
  where t.user_id = auth.uid() and t.excluded is null and c.status = 'executed'
  order by c.due_on desc, t.id;
$function$;
revoke all on function public.evaluation_my_results() from public, anon;
grant execute on function public.evaluation_my_results() to authenticated;

drop function public.evaluation_admin_targets(integer);
create function public.evaluation_admin_targets(p_cycle integer)
returns table(id integer, user_id uuid, full_name text, gender text, role_name text, committee_id integer,
              department_id integer, unit_name text, seat_assigned_at timestamp with time zone, excluded text,
              cancelled text, members_eligible integer, members_ballots integer, council_eligible integer,
              council_ballots integer, members_quorum boolean, branch text, members_num bigint, members_den bigint,
              council_num bigint, council_den bigint, final_num bigint, final_den bigint, verdict text,
              removed_at timestamp with time zone, returned_to integer, awaiting_return boolean,
              restored_at timestamp with time zone, acting boolean)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select t.id, t.user_id, t.full_name, t.gender, t.role_name, t.committee_id, t.department_id, t.unit_name,
         t.seat_assigned_at, t.excluded, t.cancelled,
         (select count(*)::integer from evaluation_electorate e where e.target_id = t.id and e.part = 'members' and e.removed_at is null),
         (select count(*)::integer from evaluation_ballots b where b.target_id = t.id and b.part = 'members' and b.voided_at is null),
         (select count(*)::integer from evaluation_electorate e where e.target_id = t.id and e.part = 'council' and e.removed_at is null),
         (select count(*)::integer from evaluation_ballots b where b.target_id = t.id and b.part = 'council' and b.voided_at is null),
         t.members_quorum, t.branch, t.members_num, t.members_den, t.council_num, t.council_den,
         t.final_num, t.final_den, t.verdict, t.removed_at, t.returned_to, t.awaiting_return, t.restored_at,
         t.acting
  from evaluation_targets t
  where t.cycle_id = p_cycle
  order by t.excluded nulls first, t.unit_name, t.role_name, t.full_name;
$function$;
revoke all on function public.evaluation_admin_targets(integer) from public, anon, authenticated;
grant execute on function public.evaluation_admin_targets(integer) to service_role;
