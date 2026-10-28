-- ✅ مطبَّق ٢٠٢٦-١٠-١٧ (games_06_days)
-- غرفةُ الألعاب الجديدة (٢٠٢٦-١٠-١٧): أرقامُ كلّ لعبةٍ يومًا بيوم بتوقيت الرياض، فتُقرأ منها
-- «آخر سبعة أيام» ومقارنتُها بالسبعة قبلها، ورسمُ الثلاثين يومًا. لمفتاح الخدمة وحده كـbank_stats.
--   darbak-khadar: الجولاتُ ولاعبوها، و`score` تمرُ الجولات المكتملة (بقاعدة game_contest_board: لا cap ولا نواةَ أكواب).
--   bank-adeeb: العمليّاتُ والأسماءُ المختلفة، و`hits` من أصاب و`answered` من بلغ السؤال (أصاب أو أخطأ أو نفد وقته).
--   visitors: زوّارُ صفحات اللعبة الفريدون (site_pageviews، بلا الروبوتات).
-- ولعبةٌ جديدةٌ تُضاف بفرعٍ في الاتّحاد أدناه، كما تُضاف دالّةُ إحصائيّاتها.
create or replace function public.game_days(p_days integer default 30)
returns table(game_slug text, day date, runs integer, players integer, visitors integer, score integer, hits integer, answered integer)
language sql stable security definer set search_path to 'public'
as $$
  with d as (
    select gs::date as day
      from generate_series(
             (now() at time zone 'Asia/Riyadh')::date - (least(greatest(coalesce(p_days, 30), 1), 120) - 1),
             (now() at time zone 'Asia/Riyadh')::date, interval '1 day') gs
  ),
  lo as (select (min(day)::timestamp at time zone 'Asia/Riyadh') as t from d),
  pv as (
    select case when v.page_path like '/games/darbak-khadar%' then 'darbak-khadar' else 'bank-adeeb' end as slug,
           (v.visited_at at time zone 'Asia/Riyadh')::date as day, v.visitor_id
      from site_pageviews v, lo
     where (v.page_path like '/games/darbak-khadar%' or v.page_path like '/games/bank-adeeb%')
       and not coalesce(v.is_bot, false)
       and v.visited_at >= lo.t
  ),
  dr as (
    select (r.issued_at at time zone 'Asia/Riyadh')::date as day, r.player_id,
           case when r.status = 'done' and coalesce(r.flag, '') <> 'cap' and k.core is null then coalesce(r.candies, 0) else 0 end as tamr
      from darb_runs r
      left join darb_cup_cores k on k.core = r.core, lo
     where r.issued_at >= lo.t
  ),
  bp as (
    select (b.played_at at time zone 'Asia/Riyadh')::date as day, lower(btrim(b.name)) as who, b.result
      from bank_plays b, lo
     where b.played_at >= lo.t
  )
  select 'darbak-khadar'::text, d.day,
         (select count(*) from dr where dr.day = d.day)::int,
         (select count(distinct player_id) from dr where dr.day = d.day)::int,
         (select count(distinct visitor_id) from pv where pv.slug = 'darbak-khadar' and pv.day = d.day)::int,
         (select coalesce(sum(tamr), 0) from dr where dr.day = d.day)::int,
         null::int, null::int
    from d
  union all
  select 'bank-adeeb'::text, d.day,
         (select count(*) from bp where bp.day = d.day)::int,
         (select count(distinct who) from bp where bp.day = d.day)::int,
         (select count(distinct visitor_id) from pv where pv.slug = 'bank-adeeb' and pv.day = d.day)::int,
         null::int,
         (select count(*) from bp where bp.day = d.day and bp.result = 'correct')::int,
         (select count(*) from bp where bp.day = d.day and bp.result in ('correct', 'wrong', 'timeout'))::int
    from d
  order by 1, 2;
$$;

revoke all on function public.game_days(integer) from public, anon, authenticated;
grant execute on function public.game_days(integer) to service_role;
