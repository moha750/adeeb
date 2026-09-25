-- «دربك خضر»: إحصائيّاتُ اللعبة للوحة التحكّم (طلبُ المالك ٢٠٢٦-٠٩-٢٥: «كم شخص قعد يلعب وكم مرّة،
-- وكم شخص أنشأ حسابًا لعيون اللعبة»). قراءةٌ خالصة لا تكتب شيئًا، لمفتاح الخدمة وحده، وتُعرض في
-- `/dashboard/analytics/darb` لمن يملك قدرةَ إحصائيّات الموقع.
--
-- المقاييسُ منذ افتتاح المسابقة (`darb_contest.starts_at`)، ومعناها:
--   visitors  زوّارُ صفحة اللعبة الفريدون (من متتبّع الموقع؛ شاشةُ اللعب نفسُها ملفٌّ ثابتٌ لا يتتبّعه)
--   players   من بدأ جولةً واحدةً على الأقلّ. واللاعبُ متصفّحٌ أو حساب، لا شخص
--   runs      الجولاتُ التي بدأت، و runsDone ما اكتمل منها وأُعيد على الخادم
--   cups      مجموعُ الأكواب المحسوبة في اللوحة
--   accounts  حساباتُ أدِيب التي أُنشئت ثمّ رُبطت بلاعب (أُنشئ الحسابُ بعد اللاعب أو قبله بخمس دقائق
--             على الأكثر، أي من أجل اللعبة). و accountsAll مثلُها منذ أوّل لاعبٍ في اللعبة
create or replace function public.darb_stats()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
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
    select h from c, generate_series(date_trunc('hour', c.s), date_trunc('hour', least(now(), c.e)), interval '1 hour') h
  ),
  days as (
    select d from c, generate_series(date_trunc('day', c.s at time zone 'Asia/Riyadh'),
                                     date_trunc('day', least(now(), c.e) at time zone 'Asia/Riyadh'), interval '1 day') d
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
    'cups',        (select coalesce(sum(candy_total), 0) from darb_players where not hidden),
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
$$;

revoke execute on function public.darb_stats() from public, anon, authenticated;
grant execute on function public.darb_stats() to service_role;
