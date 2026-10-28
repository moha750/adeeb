-- ✅ مطبَّق ٢٠٢٦-١٠-١٧ (games_07_weeks)
-- «آخرُ سبعة أيام» والسبعةُ قبلها بعدٍّ فريد: اللاعبُ الذي لعب ثلاثةَ أيّامٍ واحدٌ لا ثلاثة (game_days يعدّ كلَّ يومٍ وحدَه).
-- wk = 0 الأسبوعُ الأخير (اليومُ وستّةٌ قبله بتوقيت الرياض)، و1 الذي قبله. لمفتاح الخدمة وحده.
-- ولعبةٌ جديدةٌ تُضاف بفرعٍ في `pl` و`pv` وسطرٍ في `g`، كما في game_days.
create or replace function public.game_weeks()
returns table(game_slug text, wk integer, players integer, visitors integer)
language sql stable security definer set search_path to 'public'
as $$
  with b as (select ((now() at time zone 'Asia/Riyadh')::date - 13)::timestamp at time zone 'Asia/Riyadh' as t,
                    ((now() at time zone 'Asia/Riyadh')::date - 6)::timestamp at time zone 'Asia/Riyadh' as m),
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

revoke all on function public.game_weeks() from public, anon, authenticated;
grant execute on function public.game_weeks() to service_role;
