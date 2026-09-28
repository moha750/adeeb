-- «دربك خضر» بعد المسابقة: التمرةُ مكانَ الكوب، واللوحتان دائمتان (قرارُ المالك ٢٠٢٦-٠٩-٢٨).
--
-- ما اعتمده بندًا بندًا:
--   ١) الكوبُ في الطريق يصير تمرة. **والأكوابُ لا تتحوّل تمرًا** («غيرُ منطقيّ: واحدٌ جمع ألفَ كوبٍ يدخل
--      فيجدها تمرًا»): تبقى ذكرى في حساب صاحبها وفي تبويب المسابقة، والتمرُ يبدأ من صفرٍ للجميع.
--   ٢) «أبعد مسافة» و«أكثر تمر» دائمتان بلا تصفير.
--   ٣) جولاتُ ما بعد الإقفال تُحتسَب («فهي حقوقهم»): أمتارُها في لوحة المسافة، وأكوابُها إلى مجموع
--      أكواب صاحبها.
--
-- **والفاصلُ بين الكوب والتمرة نسخةُ اللعبة لا الساعة.** كلُّ جولةٍ تحمل بصمةَ اللبّ الذي لُعبت به
-- (`darb_runs.core`)، والنسخةُ الجديدة ببصمةٍ جديدة، والخادمُ يردّ كلَّ نسخةٍ قديمةٍ مفتوحةٍ في جهاز
-- («حدِّث الصفحة»). فما لُعب بلبٍّ من لبوب الأكواب (`darb_cup_cores`: النسخُ الثلاث التي لُعبت في القاعدة
-- كلُّها، مكتوبةً بأسمائها لا مقروءةً من الجولات) رأى صاحبُه أكوابًا فتُحسب أكوابًا، وما سواه تمر. فلا
-- يُحسب لأحدٍ تمرٌ لم يره، ولا كوبٌ لم يره.
--
-- **ويُطبَّق قبل النشر، ويبقى الموقعُ الحاليّ يعمل بعده:** `darb_board('candy')` و`darb_me.candy` يبقيان
-- (أكوابُ المسابقة كما أُقفلت)، و`darb_finish_run` يعيد `candy_total` كما كان.

-- ── ١) الأعمدة ─────────────────────────────────────────────────────────────
-- `candy_total`/`candy_at` صارا أكوابَ المسابقة وحدَها، ولا يكتب فيهما شيءٌ بعد اليوم.
alter table public.darb_players
  add column tamr_total integer not null default 0 check (tamr_total >= 0),
  add column tamr_at    timestamptz,
  add column cups_after integer not null default 0 check (cups_after >= 0);

comment on column public.darb_players.candy_total is 'أكوابُ مسابقة اليوم الوطنيّ ٢٠٢٦ (داخل نافذتها)، مجمَّدةٌ منذ الإقفال';
comment on column public.darb_players.cups_after  is 'أكوابٌ جُمعت بعد إقفال المسابقة وقبل التمرة: ذكرى في الحساب، لا لوحة';
comment on column public.darb_players.tamr_total  is 'مجموعُ التمر في الجولات كلّها: لوحةُ «أكثر تمر» الدائمة';

create index darb_board_tamr_idx on public.darb_players (tamr_total desc, tamr_at)
  where not hidden and tamr_total > 0;

-- ── ٢) لبوبُ الأكواب ──────────────────────────────────────────────────────
create table public.darb_cup_cores (core text primary key);
comment on table public.darb_cup_cores is 'بصماتُ نسخ اللعبة التي كان فيها الكوب: جولاتُها أكوابٌ لا تمر';
alter table public.darb_cup_cores enable row level security;
revoke all on public.darb_cup_cores from public, anon, authenticated;
insert into public.darb_cup_cores (core) values ('7ed1d976ee02'), ('a406a18800b8'), ('bb585ffc5310');

-- ── ٣) جولاتُ ما بعد الإقفال ───────────────────────────────────────────────
-- كانت تُحفَظ بعلامة `out` ولا تُحسَب. والتي انتهت بعد الإقفال تُحسب الآن: علامتُها `after`، وأمتارُها
-- في لوحة المسافة، وأكوابُها في `cups_after`. وجولاتُ التجربة قبل الافتتاح تبقى `out` كما أُعلن.
alter table public.darb_runs drop constraint darb_runs_flag_check;
alter table public.darb_runs add constraint darb_runs_flag_check
  check (flag = any (array['cap', 'cap_ok', 'mismatch', 'fast', 'expired', 'out', 'after']));

with c as (select ends_at as e from public.darb_contest where id = 1),
late as (
  select r.* from public.darb_runs r, c
   where r.status = 'done' and r.flag = 'out' and r.ended_at >= c.e
),
tot as (select player_id, sum(candies) as cups, count(*) as n from late group by player_id),
top as (
  select distinct on (player_id) player_id, dist, ended_at
    from late order by player_id, dist desc, ended_at asc
)
update public.darb_players p
   set cups_after = p.cups_after + tot.cups,
       runs       = p.runs + tot.n,
       best_at    = case when top.dist > p.best_dist then top.ended_at else p.best_at end,
       best_dist  = greatest(p.best_dist, top.dist)
  from tot join top using (player_id)
 where p.id = tot.player_id;

update public.darb_runs r
   set flag = 'after'
  from public.darb_contest c
 where c.id = 1 and r.status = 'done' and r.flag = 'out' and r.ended_at >= c.ends_at;

-- ── ٤) نهايةُ الجولة ───────────────────────────────────────────────────────
-- لا نافذةَ بعد اليوم: كلُّ جولةٍ صادقةٍ تُحسب. ويبقى ما قبلها كما هو (المهلةُ، والأسرعُ من الساعة، والحدّ).
create or replace function public.darb_finish_run(
  p_token_hash text, p_user uuid, p_run uuid, p_ticks integer, p_dist integer,
  p_candies integer, p_input text, p_flag text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_player uuid; v_issued timestamptz; v_status text; v_core text;
  v_counted boolean; v_cup boolean;
  v_best integer; v_tamr integer; v_cups integer;
begin
  v_player := darb_pid(p_token_hash, p_user);
  select r.issued_at, r.status, r.core into v_issued, v_status, v_core
    from darb_runs r
   where r.id = p_run and r.player_id = v_player
     for update;
  if v_issued is null then return jsonb_build_object('status', 'missing'); end if;
  if v_status <> 'open' then return jsonb_build_object('status', 'closed'); end if;

  if now() - v_issued > interval '3 hours' then
    update darb_runs set status = 'void', flag = 'expired', ended_at = now() where id = p_run;
    return jsonb_build_object('status', 'expired');
  end if;

  if extract(epoch from (now() - v_issued)) * 1.02 + 2 < p_ticks / 60.0 then
    update darb_runs
       set status = 'void', flag = 'fast', ended_at = now(),
           ticks = p_ticks, dist = p_dist, candies = p_candies, input = p_input
     where id = p_run;
    return jsonb_build_object('status', 'fast');
  end if;

  v_counted := p_flag is distinct from 'cap';
  v_cup := exists (select 1 from darb_cup_cores k where k.core = v_core);
  update darb_runs
     set status = 'done', ended_at = now(), ticks = p_ticks, dist = p_dist,
         candies = p_candies, input = p_input, flag = p_flag
   where id = p_run;

  update darb_players
     set runs = runs + 1,
         best_at    = case when v_counted and p_dist > best_dist then now() else best_at end,
         best_dist  = case when v_counted then greatest(best_dist, p_dist) else best_dist end,
         tamr_at    = case when v_counted and not v_cup and p_candies > 0 then now() else tamr_at end,
         tamr_total = case when v_counted and not v_cup then tamr_total + p_candies else tamr_total end,
         cups_after = case when v_counted and v_cup then cups_after + p_candies else cups_after end,
         last_seen_at = now()
   where id = v_player
  returning best_dist, tamr_total, candy_total + cups_after into v_best, v_tamr, v_cups;

  -- `candy_total` لنسخة الموقع التي تسبق النشر، وهو مجموعُ الأكواب كلّها
  return jsonb_build_object('status', 'ok', 'counted', v_counted, 'best_dist', v_best,
                            'tamr_total', v_tamr, 'cups_total', v_cups, 'candy_total', v_cups);
end $function$;

-- جولةٌ بلغت حدَّ الخادم ثمّ اعتُمدت بعد المراجعة: تُحسب كما تُحسب نظيرتُها
create or replace function public.darb_approve_run(p_run uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare r darb_runs; v_cup boolean;
begin
  select * into r from darb_runs where id = p_run and flag = 'cap' for update;
  if not found then raise exception 'darb_not_held'; end if;
  v_cup := exists (select 1 from darb_cup_cores k where k.core = r.core);
  update darb_runs set flag = 'cap_ok' where id = p_run;
  update darb_players
     set best_at    = case when r.dist > best_dist then now() else best_at end,
         best_dist  = greatest(best_dist, r.dist),
         tamr_at    = case when not v_cup and r.candies > 0 then now() else tamr_at end,
         tamr_total = case when not v_cup then tamr_total + r.candies else tamr_total end,
         cups_after = case when v_cup then cups_after + r.candies else cups_after end
   where id = r.player_id;
end $function$;

-- ── ٥) اللوحات ─────────────────────────────────────────────────────────────
-- `dist` أبعدُ مسافة، و`tamr` أكثرُ تمر، و`candy` أكوابُ المسابقة كما أُقفلت (للموقع قبل النشر).
create or replace function public.darb_board(p_kind text, p_limit integer default 50)
returns table(rank bigint, nickname text, value integer)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select row_number() over (order by x.v desc, x.t asc nulls last, x.id), x.nickname, x.v
    from (
      select id, nickname,
             case p_kind when 'tamr' then tamr_total when 'candy' then candy_total else best_dist end as v,
             case p_kind when 'tamr' then tamr_at    when 'candy' then candy_at    else best_at   end as t
        from darb_players
       where not hidden
    ) x
   where x.v > 0
   order by x.v desc, x.t asc nulls last, x.id
   limit least(greatest(coalesce(p_limit, 50), 1), 100);
$function$;

-- حالُ اللاعب: المسافةُ والتمرُ بترتيبهما، وأكوابُه ذكرى: `candy` ترتيبُه في المسابقة و`cupsTotal`
-- أكوابُه كلُّها (المسابقةُ وما بعدها)، و`contestOf` عددُ من جمع أكوابًا في المسابقة.
create or replace function public.darb_me(p_token_hash text, p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  p darb_players; v uuid;
  d_rank bigint; d_above integer; t_rank bigint; t_above integer;
  c_rank bigint; c_above integer; c_of bigint;
begin
  v := darb_pid(p_token_hash, p_user);
  if v is null then return null; end if;
  select * into p from darb_players where id = v;

  if not p.hidden and p.best_dist > 0 then
    select count(*) + 1, min(q.best_dist) into d_rank, d_above
      from darb_players q
     where not q.hidden and q.best_dist > 0 and q.id <> p.id
       and (q.best_dist > p.best_dist
            or (q.best_dist = p.best_dist and (q.best_at, q.id) < (p.best_at, p.id)));
  end if;

  if not p.hidden and p.tamr_total > 0 then
    select count(*) + 1, min(q.tamr_total) into t_rank, t_above
      from darb_players q
     where not q.hidden and q.tamr_total > 0 and q.id <> p.id
       and (q.tamr_total > p.tamr_total
            or (q.tamr_total = p.tamr_total and (q.tamr_at, q.id) < (p.tamr_at, p.id)));
  end if;

  if not p.hidden and p.candy_total > 0 then
    select count(*) + 1, min(q.candy_total) into c_rank, c_above
      from darb_players q
     where not q.hidden and q.candy_total > 0 and q.id <> p.id
       and (q.candy_total > p.candy_total
            or (q.candy_total = p.candy_total and (q.candy_at, q.id) < (p.candy_at, p.id)));
  end if;
  select count(*) into c_of from darb_players where not hidden and candy_total > 0;

  return jsonb_build_object(
    'name', p.nickname,
    'runs', p.runs,
    'account', p.user_id is not null,
    'dist',  jsonb_build_object('value', p.best_dist,   'rank', d_rank, 'above', d_above),
    'tamr',  jsonb_build_object('value', p.tamr_total,  'rank', t_rank, 'above', t_above),
    'candy', jsonb_build_object('value', p.candy_total, 'rank', c_rank, 'above', c_above),
    'cupsTotal', p.candy_total + p.cups_after,
    'contestOf', c_of
  );
end $function$;

-- ── ٦) المسابقةُ ذكرى ─────────────────────────────────────────────────────
-- جولاتُ المسابقة: داخل نافذتها، وقد حُسبت يومها. ومنها الفائزون وأرقامُ المسابقة كلُّها، فلا يمسّها
-- ما يُلعب بعدها (أبعدُ مسافةٍ للفائز أبعدُ ما قطعه في المسابقة، لا ما قطعه بعدها).
create or replace function public.darb_winners(p_limit integer default 3)
returns table(rank bigint, nickname text, cups integer, best_dist integer, runs bigint, minutes integer)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with c as (select starts_at as s, ends_at as e from darb_contest where id = 1),
  top as (
    select p.id, p.nickname, p.candy_total, p.candy_at
      from darb_players p
     where not p.hidden and p.candy_total > 0
     order by p.candy_total desc, p.candy_at asc nulls last, p.id
     limit least(greatest(coalesce(p_limit, 3), 1), 10)
  ),
  played as (
    select r.player_id, count(*) as n, coalesce(sum(r.ticks), 0) as t, max(r.dist) as d
      from darb_runs r, c
     where r.player_id in (select id from top)
       and r.status = 'done' and coalesce(r.flag, '') in ('', 'mismatch', 'cap_ok')
       and r.issued_at >= c.s and r.issued_at < c.e
     group by r.player_id
  )
  select row_number() over (order by t.candy_total desc, t.candy_at asc nulls last, t.id),
         t.nickname, t.candy_total, coalesce(pl.d, 0),
         coalesce(pl.n, 0), (coalesce(pl.t, 0) / 3600)::integer
    from top t left join played pl on pl.player_id = t.id
   order by t.candy_total desc, t.candy_at asc nulls last, t.id;
$function$;

-- أرقامُ المسابقة لتبويبها: من لعب، وكم جولة، وكم كوبًا جُمع، وكم دقيقةً لُعبت (من التكّات).
create or replace function public.darb_contest_recap()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  with c as (select starts_at as s, ends_at as e from darb_contest where id = 1),
  w as (
    select r.player_id, r.candies, r.ticks
      from darb_runs r, c
     where r.status = 'done' and coalesce(r.flag, '') in ('', 'mismatch', 'cap_ok')
       and r.issued_at >= c.s and r.issued_at < c.e
  )
  select jsonb_build_object(
    'players', (select count(distinct player_id) from w),
    'runs',    (select count(*) from w),
    'cups',    (select coalesce(sum(candies), 0) from w),
    'minutes', (select (coalesce(sum(ticks), 0) / 3600)::integer from w)
  );
$function$;

-- ── ٧) الإحصائيّات ───────────────────────────────────────────────────────
-- اللعبةُ دائمة: الأيّامُ من الافتتاح إلى اليوم، والساعاتُ آخرُ ثمانٍ وأربعين، والتمرُ مكانَ الأكواب.
create or replace function public.darb_stats()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  with c as (
    select starts_at as s, ends_at as e from darb_contest where id = 1
  ),
  born as (
    select min(created_at) as t from darb_players
  ),
  pv as (
    select v.visitor_id, v.visited_at
      from site_pageviews v, c
     where v.page_path like '/games/darbak-khadar%'
       and not coalesce(v.is_bot, false)
       and v.visited_at >= c.s
  ),
  r as (
    select x.player_id, x.issued_at, x.status
      from darb_runs x, c
     where x.issued_at >= c.s
  ),
  acc as (
    select u.created_at
      from darb_players p
      join auth.users u on u.id = p.user_id
     where u.created_at >= p.created_at - interval '5 minutes'
  ),
  hours as (
    select h from c, generate_series(date_trunc('hour', greatest(c.s, now() - interval '47 hours')),
                                     date_trunc('hour', now()), interval '1 hour') h
  ),
  days as (
    select d from c, generate_series(date_trunc('day', c.s at time zone 'Asia/Riyadh'),
                                     date_trunc('day', now() at time zone 'Asia/Riyadh'), interval '1 day') d
  )
  select jsonb_build_object(
    'startsAt',    (select s from c),
    'endsAt',      (select e from c),
    'now',         now(),
    'visitors',    (select count(distinct visitor_id) from pv),
    'views',       (select count(*) from pv),
    'players',     (select count(distinct player_id) from r),
    'newPlayers',  (select count(*) from darb_players p, c where p.created_at >= c.s),
    'runs',        (select count(*) from r),
    'runsDone',    (select count(*) from r where status = 'done'),
    'tamr',        (select coalesce(sum(tamr_total), 0) from darb_players where not hidden),
    'accounts',    (select count(*) from acc, c where acc.created_at >= c.s),
    'accountsAll', (select count(*) from acc, born where acc.created_at >= born.t),
    'hourly', coalesce((
      select jsonb_agg(jsonb_build_object(
               'hour',    hours.h,
               'runs',    (select count(*) from r where date_trunc('hour', r.issued_at) = hours.h),
               'players', (select count(distinct player_id) from r where date_trunc('hour', r.issued_at) = hours.h)
             ) order by hours.h)
        from hours), '[]'::jsonb),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object(
               'day',      to_char(days.d, 'YYYY-MM-DD'),
               'visitors', (select count(distinct visitor_id) from pv
                             where date_trunc('day', pv.visited_at at time zone 'Asia/Riyadh') = days.d),
               'players',  (select count(distinct player_id) from r
                             where date_trunc('day', r.issued_at at time zone 'Asia/Riyadh') = days.d),
               'runs',     (select count(*) from r
                             where date_trunc('day', r.issued_at at time zone 'Asia/Riyadh') = days.d),
               'accounts', (select count(*) from acc, c
                             where acc.created_at >= c.s
                               and date_trunc('day', acc.created_at at time zone 'Asia/Riyadh') = days.d)
             ) order by days.d)
        from days), '[]'::jsonb)
  );
$function$;

-- ── ٨) الصلاحيّات: مفتاحُ الخدمة وحدَه، كسائر دوالّ اللعبة ───────────────────────
revoke execute on function public.darb_finish_run(text, uuid, uuid, integer, integer, integer, text, text) from public, anon, authenticated;
revoke execute on function public.darb_approve_run(uuid) from public, anon, authenticated;
revoke execute on function public.darb_board(text, integer) from public, anon, authenticated;
revoke execute on function public.darb_me(text, uuid) from public, anon, authenticated;
revoke execute on function public.darb_winners(integer) from public, anon, authenticated;
revoke execute on function public.darb_contest_recap() from public, anon, authenticated;
revoke execute on function public.darb_stats() from public, anon, authenticated;
grant execute on function public.darb_finish_run(text, uuid, uuid, integer, integer, integer, text, text) to service_role;
grant execute on function public.darb_approve_run(uuid) to service_role;
grant execute on function public.darb_board(text, integer) to service_role;
grant execute on function public.darb_me(text, uuid) to service_role;
grant execute on function public.darb_winners(integer) to service_role;
grant execute on function public.darb_contest_recap() to service_role;
grant execute on function public.darb_stats() to service_role;
