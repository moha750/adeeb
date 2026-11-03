-- ✅ مطبَّق ٢٠٢٦-١٠-٢٩ (games_08_month)
-- نافذةُ الغرفة شهرٌ لا أسبوع (المالك ٢٠٢٦-١٠-٢٩: «تحتسب في ٧ أيام، احتسب في شهر»).
-- game_periods(p_days): اللاعبون والزوّارُ الفريدون في آخر p_days يومًا (wk = 0) والمدّةِ نفسِها قبلها (wk = 1)،
-- بتوقيت الرياض. يحلّ محلَّ game_weeks (أسبوعٌ ثابت) فيُحذف. لمفتاح الخدمة وحده.
-- ولعبةٌ جديدةٌ تُضاف بفرعٍ في `pl` و`pv` وسطرٍ في `g`، كما في game_days.
create or replace function public.game_periods(p_days integer default 30)
returns table(game_slug text, wk integer, players integer, visitors integer)
language sql stable security definer set search_path to 'public'
as $$
  with n as (select least(greatest(coalesce(p_days, 30), 1), 120) as d),
  b as (select ((now() at time zone 'Asia/Riyadh')::date - (2 * n.d - 1))::timestamp at time zone 'Asia/Riyadh' as t,
               ((now() at time zone 'Asia/Riyadh')::date - (n.d - 1))::timestamp at time zone 'Asia/Riyadh' as m
          from n),
  pv as (
    select case when v.page_path like '/games/darbak-khadar%' then 'darbak-khadar' else 'bank-adeeb' end as slug,
           case when v.visited_at >= b.m then 0 else 1 end as wk, v.visitor_id
      from site_pageviews v, b
     where (v.page_path like '/games/darbak-khadar%' or v.page_path like '/games/bank-adeeb%')
       and not coalesce(v.is_bot, false) and v.visited_at >= b.t
  ),
  pl as (
    select 'darbak-khadar'::text as slug, case when r.issued_at >= b.m then 0 else 1 end as wk, r.player_id::text as who
      from darb_runs r, b where r.issued_at >= b.t
    union all
    select 'bank-adeeb', case when p.played_at >= b.m then 0 else 1 end, lower(btrim(p.name))
      from bank_plays p, b where p.played_at >= b.t
  ),
  g as (select s.slug, w.wk from (values ('darbak-khadar'), ('bank-adeeb')) s(slug), (values (0), (1)) w(wk))
  select g.slug, g.wk,
         (select count(distinct who) from pl where pl.slug = g.slug and pl.wk = g.wk)::int,
         (select count(distinct visitor_id) from pv where pv.slug = g.slug and pv.wk = g.wk)::int
    from g order by 1, 2;
$$;

revoke all on function public.game_periods(integer) from public, anon, authenticated;
grant execute on function public.game_periods(integer) to service_role;

drop function if exists public.game_weeks();
