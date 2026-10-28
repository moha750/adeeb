-- تقييمُ القيادات الربعيّ (٢): الأهليّةُ والتوقيتُ وورقةُ المقيِّم.
--
-- المؤقّت `evaluation-tick` كلَّ ساعة: يُنشئ الدورةَ التالية، ويفتحها يومَ 21 بلقطةٍ تُحفظ، ويذكّر
-- قبل الإغلاق بيوم، ويغلقها بعد ثلاثة أيام. والحكمُ والاستبعادُ بعد الإغلاق في الترحيل ٠٣.
-- والمقيِّمُ يرى أوراقَه ويُرسلها بدالّتين تقرآن `auth.uid()` وحده («الجلسة هي الحقيقة»).

-- ══ الموعد ═══════════════════════════════════════════════════════════════

-- أوّلُ موعدٍ ربعيٍّ (21 من يناير وأبريل ويوليو وأكتوبر) في هذا اليوم أو بعده، ولا قبل 21 يناير 2027 (م٢)
create or replace function public._evaluation_next_due(p_from date)
returns date
language sql
immutable
set search_path to 'public'
as $$
  -- بالتاريخ وحده لا بالطابع الزمنيّ: لا تتبع النتيجةُ منطقةَ الجلسة
  select min(make_date(y, m, 21))
  from generate_series(extract(year from greatest(p_from, date '2027-01-21'))::int,
                       extract(year from greatest(p_from, date '2027-01-21'))::int + 1) as y,
       unnest(array[1, 4, 7, 10]) as m
  where make_date(y, m, 21) >= greatest(p_from, date '2027-01-21');
$$;

-- ══ مَن يُقيَّم ومن يقيّم ════════════════════════════════════════════════════
--
-- م١: المنسّق والقائد والنائب، كلٌّ على حدة، أصيلًا لا مكلَّفًا، ولا مجمَّدًا (صفُّه غيرُ حيّ أصلًا).
-- م٣: الأعضاء (70%). للقائد والنائب في لجنةٍ: كلُّ من له فيها مقعدٌ حيّ بأيّ دور (أصيلًا أو مكلَّفًا)،
--     ومنسّقُ قسمها. وللمنسّق: كلُّ من له مقعدٌ حيٌّ في لجان قسمه. ولا يقيّم أحدٌ نفسه.
-- م٤: المجلس (30%). للقائد والنائب: الرئيسان وقائدا الإدارتين (ومن كُلّف بمقاعدهم)، والمشرفان على
--     اللجنة ما داما في إدارتهما. وللمنسّق: الأربعةُ وحدهم.
-- م٤/3: من اجتمع له الشقّان فله ورقةٌ واحدة، في المجلس.
-- ولا يدخل اللقطةَ إلّا عضوٌ حيّ (`is_adeeb_member`)، ولا حسابُ النادي `adeeb_admin`.

create or replace function public._evaluation_raters(p_user uuid, p_role text, p_committee integer, p_department integer)
returns table(rater_id uuid, part text)
language sql
stable
security definer
set search_path to 'public'
as $$
  with council as (
    select ur.user_id
    from user_roles ur
    where ur.is_active
      and ur.role_name in ('club_president', 'executive_council_president', 'hr_committee_leader', 'qa_committee_leader')
    union
    select cs.supervisor_id
    from committee_supervision cs
    join committees u on u.id = cs.unit_id
    where p_role <> 'department_head'
      and cs.committee_id = p_committee
      and u.supervises
      and exists (select 1 from user_roles s
                  where s.user_id = cs.supervisor_id and s.is_active and s.committee_id = u.id)
  ),
  members as (
    select ur.user_id
    from user_roles ur
    where p_role <> 'department_head' and ur.is_active and ur.committee_id = p_committee
    union
    select ur.user_id
    from user_roles ur
    join committees c on c.id = p_committee
    where p_role <> 'department_head' and ur.is_active
      and ur.role_name = 'department_head' and ur.department_id = c.department_id
    union
    select ur.user_id
    from user_roles ur
    join committees c on c.id = ur.committee_id
    where p_role = 'department_head' and ur.is_active
      and c.department_id = p_department and c.is_active and c.council_id = 'executive'
  ),
  everyone as (
    select user_id, 'council'::text as part from council
    union all
    select user_id, 'members' from members where user_id not in (select user_id from council)
  )
  select e.user_id, e.part
  from everyone e
  where e.user_id <> p_user
    and public.is_adeeb_member(e.user_id)
    and not exists (select 1 from user_roles a where a.user_id = e.user_id and a.is_active and a.role_name = 'adeeb_admin');
$$;
comment on function public._evaluation_raters(uuid, text, integer, integer) is
  'المقيِّمون لمقيَّمٍ واحد وشقُّ كلٍّ منهم (لائحة تقييم القيادات م٣ وم٤). يُقرأ لحظةَ الفتح ويُحفظ لقطة.';

-- ══ الدورة ═══════════════════════════════════════════════════════════════

-- يُنشئ الدورةَ التالية إن لم تكن دورةٌ منتظِرة
create or replace function public._evaluation_ensure_cycle()
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
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
  values (v_due, v_due::timestamp at time zone 'Asia/Riyadh', (v_due + 3)::timestamp at time zone 'Asia/Riyadh')
  returning id into v_id;

  insert into evaluation_audit_log (cycle_id, event, details)
  values (v_id, 'cycle_created', jsonb_build_object('due_on', v_due));
  return v_id;
end;
$$;

-- الفتح: لقطةُ من يُقيَّم ومن يقيّم، ثمّ إشعارُ المقيِّمين
create or replace function public._evaluation_open(p_cycle integer)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
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
         -- م١/4: شغل منصبه قبل الموعد بأقلّ من 4 أسابيع
         case when ur.assigned_at > v_cycle.opens_at - interval '28 days' then 'recent' end
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
$$;

-- الإغلاق: من ترك منصبَه أو عضويّتَه أثناء الأيام الثلاثة أُلغي تقييمُه (جدول الحالات الحدّيّة)
create or replace function public._evaluation_close(p_cycle integer)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  update evaluation_targets t
  set cancelled = case when not public.is_adeeb_member(t.user_id) then 'membership_ended' else 'seat_ended' end,
      verdict = 'no_result',
      decided_at = now()
  where t.cycle_id = p_cycle and t.excluded is null and t.verdict is null
    and not exists (select 1 from user_roles ur
                    where ur.id = t.seat_id and ur.is_active and ur.user_id = t.user_id
                      and ur.role_name = t.role_name and public.is_adeeb_member(t.user_id));

  update evaluation_cycles set status = 'closed', closed_at = now() where id = p_cycle and status = 'open';

  insert into evaluation_audit_log (cycle_id, event, details)
  select p_cycle, 'cycle_closed', jsonb_build_object(
    'ballots', (select count(*) from evaluation_ballots b join evaluation_targets t on t.id = b.target_id
                where t.cycle_id = p_cycle),
    'cancelled', (select count(*) from evaluation_targets where cycle_id = p_cycle and cancelled is not null));
end;
$$;

-- من لم يُكمل أوراقَه بعد، في دورةٍ مفتوحة
create or replace function public._evaluation_pending_raters(p_cycle integer)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(jsonb_agg(distinct e.rater_id), '[]'::jsonb)
  from evaluation_electorate e
  join evaluation_targets t on t.id = e.target_id
  where t.cycle_id = p_cycle and e.rater_id is not null and e.removed_at is null
    and t.excluded is null and t.verdict is null
    and not exists (select 1 from evaluation_ballots b where b.target_id = t.id and b.rater_id = e.rater_id);
$$;

-- **المؤقّت** — كلَّ ساعة (`evaluation-tick`). لا فاعلَ بشريّ له، ولا منحَ: للخدمة وحدها.
create or replace function public.evaluation_tick()
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
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
        'cycleId', v_c.id, 'closesAt', v_c.closes_at, 'lastDay', v_c.due_on + 2, 'raters', v_pending), null);
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
$$;
comment on function public.evaluation_tick() is
  'مؤقّتُ تقييم القيادات (كلَّ ساعة): يُنشئ الدورة، ويفتحها يومَ 21 بتوقيت الرياض، ويذكّر، ويغلقها بعد ثلاثة أيام.';

-- ══ ورقةُ المقيِّم (للمتصفّح، بالجلسة) ══════════════════════════════════════

-- الورقةُ قائمةٌ؟ دورةٌ مفتوحةٌ لم ينقضِ أجلُها، ومقيَّمٌ لم يُستثنَ، ومقعدُه ما زال حيًّا
create or replace function public._evaluation_sheet_live(p_target integer)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from evaluation_targets t
    join evaluation_cycles c on c.id = t.cycle_id
    join user_roles ur on ur.id = t.seat_id
    where t.id = p_target and t.excluded is null and t.verdict is null
      and c.status = 'open' and now() >= c.opens_at and now() < c.closes_at
      and ur.is_active and ur.user_id = t.user_id and ur.role_name = t.role_name
  );
$$;

-- أوراقي في الدورة المفتوحة. الاسمُ والجنسُ والمنصبُ لمن أقيّمه، ولا شيءَ عن غيري.
create or replace function public.evaluation_my_sheets()
returns table(target_id integer, cycle_id integer, closes_at timestamptz, last_day date, part text,
              full_name text, gender text, role_name text, unit_name text, done boolean)
language sql
stable
security definer
set search_path to 'public'
as $$
  select t.id, c.id, c.closes_at, c.due_on + 2, e.part, t.full_name, t.gender, t.role_name, t.unit_name,
         exists (select 1 from evaluation_ballots b where b.target_id = t.id and b.rater_id = auth.uid())
  from evaluation_electorate e
  join evaluation_targets t on t.id = e.target_id
  join evaluation_cycles c on c.id = t.cycle_id
  where e.rater_id = auth.uid() and e.removed_at is null
    and public._evaluation_sheet_live(t.id)
  order by e.part desc, t.unit_name, t.role_name, t.full_name;
$$;
-- منحٌ مقصود: صفحةُ المقيِّم تقرأ أوراقَ صاحب الجلسة وحده (`auth.uid()`)، ولا معاملَ يُسمّي غيره.
grant execute on function public.evaluation_my_sheets() to authenticated;

-- إرسالُ الورقة (م٢/4: من المنصّة، بحساب المقيِّم، وتقييمًا واحدًا لكلّ مقيَّم)
create or replace function public.evaluation_submit(p_target integer, p_scores integer[],
                                                    p_keep text default null, p_change text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_me    uuid := auth.uid();
  v_part  text;
  v_items integer;
  v_keep  text := nullif(btrim(coalesce(p_keep, '')), '');
  v_change text := nullif(btrim(coalesce(p_change, '')), '');
begin
  if v_me is null then
    return jsonb_build_object('ok', false, 'message', 'سجّل الدخول ثمّ أعِد المحاولة.');
  end if;

  select e.part into v_part from evaluation_electorate e
  where e.target_id = p_target and e.rater_id = v_me and e.removed_at is null;
  if v_part is null then
    return jsonb_build_object('ok', false, 'message', 'ليس لك تقييمٌ لهذا المنصب.');
  end if;

  if not public._evaluation_sheet_live(p_target) then
    return jsonb_build_object('ok', false, 'message', 'لم يعد هذا التقييم مفتوحًا.');
  end if;

  v_items := case v_part when 'members' then 7 else 5 end;
  if p_scores is null or array_ndims(p_scores) <> 1 or cardinality(p_scores) <> v_items
     or exists (select 1 from unnest(p_scores) s where s is null or s < 1 or s > 5) then
    return jsonb_build_object('ok', false, 'message', 'قيّم كلَّ البنود من 1 إلى 5.');
  end if;

  if v_part = 'council' then
    v_keep := null;
    v_change := null;
  end if;
  if char_length(coalesce(v_keep, '')) > 1000 or char_length(coalesce(v_change, '')) > 1000 then
    return jsonb_build_object('ok', false, 'message', 'الإجابةُ أطولُ من ألف حرف.');
  end if;

  insert into evaluation_ballots (target_id, rater_id, part, scores, keep_text, change_text)
  values (p_target, v_me, v_part, p_scores::smallint[], v_keep, v_change)
  on conflict on constraint evaluation_ballots_once do nothing;
  if not found then
    return jsonb_build_object('ok', false, 'message', 'قيّمتَ هذا المنصب من قبل، والتقييمُ لا يُعاد.');
  end if;

  return jsonb_build_object('ok', true, 'message', 'وصل تقييمُك.');
end;
$$;
-- منحٌ مقصود: المقيِّمُ يُرسل ورقتَه بجلسته، والمقيِّمُ يُقرأ من `auth.uid()` لا من معامل.
grant execute on function public.evaluation_submit(integer, integer[], text, text) to authenticated;

-- إشاراتُ البابين: «قيّم» لمن له أوراقٌ قائمة، و«نتيجتي» لمن قُيّم في دورةٍ نُفّذت. يقرؤها شريطُ اللوحة
-- (`lib/myScope.ts`) بعميل الخدمة ومعرّفِ صاحب الجلسة، كإشارات الانتخابات (`get_member_election_signals`).
create or replace function public.evaluation_signals_for(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select jsonb_build_object(
    'canRate', exists (
      select 1 from evaluation_electorate e
      where e.rater_id = p_user and e.removed_at is null and public._evaluation_sheet_live(e.target_id)),
    'pending', (
      select count(*) from evaluation_electorate e
      where e.rater_id = p_user and e.removed_at is null and public._evaluation_sheet_live(e.target_id)
        and not exists (select 1 from evaluation_ballots b where b.target_id = e.target_id and b.rater_id = p_user)),
    'hasResults', exists (
      select 1 from evaluation_targets t join evaluation_cycles c on c.id = t.cycle_id
      where t.user_id = p_user and t.excluded is null and c.status = 'executed'));
$$;
comment on function public.evaluation_signals_for(uuid) is
  'إشاراتُ بابَي «قيّم» و«نتيجتي» لشخص. للخدمة وحدها: لا منحَ، فلا يسأل المتصفّحُ عن غيره.';

-- ══ نتيجتي (م١٠/2، وقرار محمد في المسألة ٣) ═════════════════════════════════
-- النهائيّة وكلُّ شقّ، **ويُخفى الشقُّ إن كانت فيه أقلُّ من ثلاث أوراق**: شقُّ المجلس بورقةٍ واحدة
-- يكشف تقييمَ صاحبها، وأحكامُ السرّيّة تمنع أن يرى أحدٌ تقييمَ غيره.

create or replace function public.evaluation_my_results()
returns table(target_id integer, due_on date, role_name text, unit_name text, verdict text, branch text,
              final_num bigint, final_den bigint,
              members_num bigint, members_den bigint, members_ballots integer, members_eligible integer,
              council_num bigint, council_den bigint, council_ballots integer,
              comments integer, removed_at timestamptz, restored_at timestamptz, cancelled text)
language sql
stable
security definer
set search_path to 'public'
as $$
  select t.id, c.due_on, t.role_name, t.unit_name, t.verdict, t.branch, t.final_num, t.final_den,
         case when t.members_ballots >= 3 then t.members_num end,
         case when t.members_ballots >= 3 then t.members_den end,
         t.members_ballots, t.members_eligible,
         case when t.council_ballots >= 3 then t.council_num end,
         case when t.council_ballots >= 3 then t.council_den end,
         t.council_ballots,
         (select count(*)::integer from evaluation_ballots b
          where b.target_id = t.id and b.voided_at is null and (b.keep_text is not null or b.change_text is not null)),
         t.removed_at, t.restored_at, t.cancelled
  from evaluation_targets t
  join evaluation_cycles c on c.id = t.cycle_id
  where t.user_id = auth.uid() and t.excluded is null and c.status = 'executed'
  order by c.due_on desc, t.id;
$$;
-- منحٌ مقصود: نتيجةُ صاحب الجلسة وحده (أحكامٌ عامّة: «يتسلّم كلُّ مقيَّمٍ نتيجتَه وحده»).
grant execute on function public.evaluation_my_results() to authenticated;

-- إجاباتُ السؤال المفتوح بلا أسماء وبترتيبٍ عشوائيّ (م١٠/2)، لصاحبها وحده بعد التنفيذ
create or replace function public.evaluation_my_comments(p_target integer)
returns table(keep_text text, change_text text)
language sql
volatile
security definer
set search_path to 'public'
as $$
  select b.keep_text, b.change_text
  from evaluation_ballots b
  join evaluation_targets t on t.id = b.target_id
  join evaluation_cycles c on c.id = t.cycle_id
  where t.id = p_target and t.user_id = auth.uid() and c.status = 'executed'
    and b.voided_at is null and (b.keep_text is not null or b.change_text is not null)
  order by random();
$$;
-- منحٌ مقصود: صاحبُ الجلسة يقرأ إجاباتِ تقييمه هو وحده، بلا عمودٍ يدلّ على صاحب الإجابة.
grant execute on function public.evaluation_my_comments(integer) to authenticated;

-- ══ المؤقّت ══════════════════════════════════════════════════════════════
-- الدقيقةُ الثالثة من كلّ ساعة (UTC): فيُفتح التقييمُ 00:03 من يوم 21 بتوقيت الرياض، ويُغلق 00:03 من يوم 24.

select cron.unschedule('evaluation-tick') where exists (select 1 from cron.job where jobname = 'evaluation-tick');
select cron.schedule('evaluation-tick', '3 * * * *', $cron$select public.evaluation_tick();$cron$);

-- الدورةُ الأولى (21 يناير 2027) تُكتب الآن، فتظهر في الغرفة قبل موعدها
select public._evaluation_ensure_cycle();
