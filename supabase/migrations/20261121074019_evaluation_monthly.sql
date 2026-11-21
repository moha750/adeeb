-- تقييمُ القيادات الشهريّ (قرار المجلس الإداريّ، بلّغه محمد ٢٠٢٦-١١-٢١): من ربعيٍّ إلى شهريّ.
--
-- الأيّامُ الثابتة كلَّ شهر (محمد ٢٠٢٦-١١-٢١): يُفتح يومَ 22 (00:00 بتوقيت الرياض)، وآخرُ يومٍ 25 — أربعةُ أيّام، فالدورةُ
-- تقع كلَّ شهرٍ في أيّامٍ مختلفة من الأسبوع — ويُغلق بانتهائه (00:00 من 26)، ويصدر الحكمُ ويُنفَّذ صباحَ 26 بلا يومٍ فارغ. وأوّلُ دورةٍ شهريّة 22 نوفمبر 2026 (الدورةُ المجدولة كانت 21 يناير 2027، فتُنقل إليها).
-- والمستثنى من الدورة صار من شغل منصبه قبل الموعد بأقلّ من أسبوعين (كان أربعة أسابيع: تقارب الشهرَ كلَّه).
-- وما سوى ذلك باقٍ: البنودُ والوزنان والنصفُ وحدُّ الاستبعاد ومهلةُ الانتخاب.

-- ١) الموعد: يومُ 22 من كلّ شهر، لا قبل 22 نوفمبر 2026. والنافذةُ أربعةُ أيّام: الإغلاقُ 00:00 من اليوم الخامس (كانت ثلاثة)
alter table public.evaluation_cycles drop constraint evaluation_cycles_due_quarter;
alter table public.evaluation_cycles drop constraint evaluation_cycles_window;

comment on table public.evaluation_cycles is
  'دوراتُ تقييم القيادات الشهريّ (لائحة تقييم القيادات، م٢، بتعديل ٢٠٢٦-١١-٢١): تُفتح يومَ 22 من كلّ شهر وآخرُ أيّامها 25، تُنشأ وتُفتح وتُغلق بالمؤقّت `evaluation-tick`، ويُحكم فيها صباحَ 26.';

create or replace function public._evaluation_next_due(p_from date)
returns date
language sql
immutable
set search_path to 'public'
as $$
  -- أوّلُ يومِ 22 في هذا اليوم أو بعده، ولا قبل 22 نوفمبر 2026. بالتاريخ وحده: لا تتبع النتيجةُ منطقةَ الجلسة
  select case when extract(day from d) <= 22
              then make_date(extract(year from d)::int, extract(month from d)::int, 22)
              else (date_trunc('month', d) + interval '1 month')::date + 21 end
  from (select greatest(p_from, date '2026-11-22') as d) x;
$$;

-- ٢) سجلُّ الدورة يقول إنّ موعدها نُقل
alter table public.evaluation_audit_log drop constraint evaluation_audit_log_event_known;
alter table public.evaluation_audit_log add constraint evaluation_audit_log_event_known
  check (event = any (array['cycle_created', 'cycle_opened', 'cycle_closed', 'cycle_blocked', 'results_recorded',
    'removal_executed', 'removal_awaiting_return', 'return_chosen', 'rater_removed', 'rater_added',
    'result_corrected', 'restored', 'restore_skipped', 'cycle_rescheduled']));

-- الدورةُ المجدولة (21 يناير 2027، لم تُفتح ولا أهدافَ لها) تصير أوّلَ دورةٍ شهريّة
do $$
declare v_id integer; v_old date;
begin
  select id, due_on into v_id, v_old from public.evaluation_cycles where status = 'scheduled' order by due_on limit 1;
  if v_id is not null and v_old <> date '2026-11-22'
     and not exists (select 1 from public.evaluation_targets where cycle_id = v_id) then
    update public.evaluation_cycles
    set due_on = date '2026-11-22',
        opens_at = (date '2026-11-22')::timestamp at time zone 'Asia/Riyadh',
        closes_at = (date '2026-11-26')::timestamp at time zone 'Asia/Riyadh'
    where id = v_id;
    insert into public.evaluation_audit_log (cycle_id, event, details)
    values (v_id, 'cycle_rescheduled', jsonb_build_object('from', v_old, 'to', date '2026-11-22', 'why', 'التقييم صار شهريًّا'));
  end if;
end $$;

-- القيدان الجديدان بعد نقل الدورة: قبلها كانت تخالفهما
alter table public.evaluation_cycles add constraint evaluation_cycles_due_monthly
  check (extract(day from due_on) = 22 and due_on >= date '2026-11-22');
alter table public.evaluation_cycles add constraint evaluation_cycles_window
  check (opens_at = (due_on::timestamp at time zone 'Asia/Riyadh')
         and closes_at = ((due_on + 4)::timestamp at time zone 'Asia/Riyadh'));

-- الدورةُ التالية تُنشأ بنافذتها الجديدة
create or replace function public._evaluation_ensure_cycle()
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_due date;
  v_id  integer;
begin
  select id into v_id from evaluation_cycles where status = 'scheduled' limit 1;
  if v_id is not null then return v_id; end if;

  v_due := _evaluation_next_due(coalesce(
    (select max(due_on) + 1 from evaluation_cycles),
    (now() at time zone 'Asia/Riyadh')::date));

  insert into evaluation_cycles (due_on, opens_at, closes_at)
  values (v_due, v_due::timestamp at time zone 'Asia/Riyadh', (v_due + 4)::timestamp at time zone 'Asia/Riyadh')
  returning id into v_id;

  insert into evaluation_audit_log (cycle_id, event, details)
  values (v_id, 'cycle_created', jsonb_build_object('due_on', v_due));
  return v_id;
end;
$function$;

-- ٣) المستثنى: أقلُّ من أسبوعين قبل الموعد (م١/4 بتعديل ٢٠٢٦-١١-٢١). الدالّةُ كما هي إلّا المدّة
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
                                  full_name, gender, unit_name, seat_assigned_at, excluded)
  select p_cycle, ur.user_id, ur.id, ur.role_name,
         case when ur.role_name = 'department_head' then null else ur.committee_id end,
         case when ur.role_name = 'department_head' then ur.department_id else c.department_id end,
         p.full_name, p.gender,
         coalesce(case when ur.role_name = 'department_head' then d.name_ar else c.committee_name_ar end, ''),
         ur.assigned_at,
         -- م١/4: شغل منصبه قبل الموعد بأقلّ من أسبوعين (كان أربعة أسابيع في الربعيّ)
         case when ur.assigned_at > v_cycle.opens_at - interval '14 days' then 'recent' end
  from user_roles ur
  join profiles p on p.id = ur.user_id
  left join committees c on c.id = ur.committee_id
  left join departments d on d.id = ur.department_id
  where ur.is_active and not ur.is_acting and ur.frozen_by is null
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

-- ٤) آخرُ يومٍ صار الرابعَ من أيّام الدورة (due_on + 3): في التذكير وفي أوراق المقيِّم. وما سواه في الدالّتين كما هو.
--    والحكمُ ساعةَ الإغلاق كما كان (المؤقّت `evaluation-execute` لا يتغيّر): صباحَ 26.
create or replace function public.evaluation_tick()
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_c       evaluation_cycles%rowtype;
  v_pending jsonb;
begin
  -- ١) الإغلاق أوّلًا: لا يُفتح جديدٌ قبل أن يُغلق ما قبله
  for v_c in select * from evaluation_cycles where status = 'open' and now() >= closes_at loop
    perform _evaluation_close(v_c.id);
  end loop;

  -- ٢) التذكير قبل الإغلاق بيوم، مرّةً واحدة
  for v_c in select * from evaluation_cycles
             where status = 'open' and reminded_at is null and now() >= closes_at - interval '1 day' loop
    v_pending := _evaluation_pending_raters(v_c.id);
    if jsonb_array_length(v_pending) > 0 then
      perform notify_event('evaluation.reminder', jsonb_build_object(
        'cycleId', v_c.id, 'closesAt', v_c.closes_at, 'lastDay', v_c.due_on + 3, 'raters', v_pending), null);
    end if;
    update evaluation_cycles set reminded_at = now() where id = v_c.id;
  end loop;

  -- ٣) الفتح يومَ الموعد، إلّا أن تكون دورةٌ سابقةٌ لم تُنفَّذ (جدول الحالات الحدّيّة)
  perform _evaluation_ensure_cycle();
  for v_c in select * from evaluation_cycles where status = 'scheduled' and now() >= opens_at loop
    if exists (select 1 from evaluation_cycles p where p.status in ('open', 'closed') and p.id <> v_c.id) then
      if v_c.blocked_noted_at is null then
        update evaluation_cycles set blocked_noted_at = now() where id = v_c.id;
        insert into evaluation_audit_log (cycle_id, event) values (v_c.id, 'cycle_blocked');
        perform notify_event('evaluation.blocked', jsonb_build_object('cycleId', v_c.id, 'dueOn', v_c.due_on), null);
      end if;
    else
      perform _evaluation_open(v_c.id);
      -- دورةٌ فات موعدُها كلُّه (توقّف المؤقّت) تُغلق في الحال: لا تُمدّ ولا يُعاد فتحُها (المواصفة ٢-٦)
      if now() >= v_c.closes_at then perform _evaluation_close(v_c.id); end if;
    end if;
  end loop;
end;
$function$;

create or replace function public.evaluation_my_sheets()
returns table(target_id integer, cycle_id integer, closes_at timestamp with time zone, last_day date, part text,
              full_name text, gender text, role_name text, unit_name text, done boolean)
language sql
stable security definer
set search_path to 'public'
as $function$
  select t.id, c.id, c.closes_at, c.due_on + 3, e.part, t.full_name, t.gender, t.role_name, t.unit_name,
         exists (select 1 from evaluation_ballots b where b.target_id = t.id and b.rater_id = auth.uid())
  from evaluation_electorate e
  join evaluation_targets t on t.id = e.target_id
  join evaluation_cycles c on c.id = t.cycle_id
  where e.rater_id = auth.uid() and e.removed_at is null
    and public._evaluation_sheet_live(t.id)
  order by e.part desc, t.unit_name, t.role_name, t.full_name;
$function$;

update public.permissions
set description = 'دوراتُ التقييم الشهريّ ومشاركتُها، وتصحيحُ الأهليّة والحساب، واختيارُ لجنة المنسّق المستبعَد'
where permission_key = 'manage_leader_evaluation';
