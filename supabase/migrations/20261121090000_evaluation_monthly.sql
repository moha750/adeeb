-- تقييمُ القيادات الشهريّ (قرار المجلس الإداريّ، بلّغه محمد ٢٠٢٦-١١-٢١): من ربعيٍّ إلى شهريّ.
--
-- الأيّامُ الثابتة كلَّ شهر: يُفتح يومَ 22 (00:00 بتوقيت الرياض)، وآخرُ يومٍ 24، ويُغلق بانتهائه (00:00 من 25)،
-- ويصدر الحكمُ ويُنفَّذ يومَ 26. وأوّلُ دورةٍ شهريّة 22 نوفمبر 2026 (الدورةُ المجدولة كانت 21 يناير 2027، فتُنقل إليها).
-- والمستثنى من الدورة صار من شغل منصبه قبل الموعد بأقلّ من أسبوعين (كان أربعة أسابيع: تقارب الشهرَ كلَّه).
-- وما سوى ذلك باقٍ: البنودُ والوزنان والنصفُ وحدُّ الاستبعاد ومهلةُ الانتخاب.

-- ١) الموعد: يومُ 22 من كلّ شهر، لا قبل 22 نوفمبر 2026. ونافذةُ الأيّام الثلاثة كما هي (`evaluation_cycles_window`).
alter table public.evaluation_cycles drop constraint evaluation_cycles_due_quarter;
alter table public.evaluation_cycles add constraint evaluation_cycles_due_monthly
  check (extract(day from due_on) = 22 and due_on >= date '2026-11-22');

comment on table public.evaluation_cycles is
  'دوراتُ تقييم القيادات الشهريّ (لائحة تقييم القيادات، م٢، بتعديل ٢٠٢٦-١١-٢١): يومَ 22 من كلّ شهر، تُنشأ وتُفتح وتُغلق بالمؤقّت `evaluation-tick`، ويُحكم فيها يومَ 26.';

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
        closes_at = (date '2026-11-25')::timestamp at time zone 'Asia/Riyadh'
    where id = v_id;
    insert into public.evaluation_audit_log (cycle_id, event, details)
    values (v_id, 'cycle_rescheduled', jsonb_build_object('from', v_old, 'to', date '2026-11-22', 'why', 'التقييم صار شهريًّا'));
  end if;
end $$;

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
      'cycleId', p_cycle, 'closesAt', v_cycle.closes_at, 'lastDay', v_cycle.due_on + 2, 'raters', v_raters), null);
  end if;
end;
$function$;

-- ٤) الحكمُ يومَ 26 لا ساعةَ الإغلاق: المنفذُ لا يُطرق قبل منتصف ليل 26 بتوقيت الرياض (يومٌ بين الإغلاق والحكم).
--    والمنفذُ نفسُه يتحقّق من اليوم أيضًا (`lib/evaluation/execute.ts`)، فلا يكفي طرقُه وحده.
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
  where exists (select 1 from public.evaluation_cycles c
                where c.status = 'closed'
                  and now() >= ((c.due_on + 4)::timestamp at time zone 'Asia/Riyadh'));
  $job$
);

update public.permissions
set description = 'دوراتُ التقييم الشهريّ ومشاركتُها، وتصحيحُ الأهليّة والحساب، واختيارُ لجنة المنسّق المستبعَد'
where permission_key = 'manage_leader_evaluation';
