-- «دربك خضر»: الفائزون بإحصائيّاتهم (طلبُ المالك ٢٠٢٦-٠٩-٢٧ بعد الإقفال: «في لوحة المسابقة يُضاف الفائزون
-- مع إحصائيّاتهم»). قراءةٌ خالصة لمفتاح الخدمة وحده، تُنادى بعد إقفال المسابقة فقط.
--
-- الترتيبُ ترتيبُ `darb_board('candy')` نفسُه (الأكوابُ ثمّ من بلغها أوّلًا ثمّ المعرّف)، فلا يفترق الفائزون عن
-- اللوحة. والإحصائيّاتُ من الجولات المحسوبة داخل النافذة: عددُها، ودقائقُ لعبها (من التكّات لا من الساعة، فالتوقّفُ
-- لا يُحسب)، مع الأكواب وأبعد مسافة. ولا شيءَ غيرُ الاسم المستعار: لا اسمٌ حقيقيٌّ ولا جوّالٌ ولا بريد.
create or replace function public.darb_winners(p_limit integer default 3)
returns table(rank bigint, nickname text, cups integer, best_dist integer, runs bigint, minutes integer)
language sql
stable
security definer
set search_path to 'public'
as $$
  with c as (select starts_at as s, ends_at as e from darb_contest where id = 1),
  top as (
    select p.id, p.nickname, p.candy_total, p.best_dist, p.candy_at
      from darb_players p
     where not p.hidden and p.candy_total > 0
     order by p.candy_total desc, p.candy_at asc nulls last, p.id
     limit least(greatest(coalesce(p_limit, 3), 1), 10)
  ),
  played as (
    select r.player_id, count(*) as n, coalesce(sum(r.ticks), 0) as t
      from darb_runs r, c
     where r.player_id in (select id from top)
       and r.status = 'done' and (r.flag is null or r.flag = 'cap_ok')
       and r.issued_at >= c.s and r.issued_at < c.e
     group by r.player_id
  )
  select row_number() over (order by t.candy_total desc, t.candy_at asc nulls last, t.id),
         t.nickname, t.candy_total, t.best_dist,
         coalesce(pl.n, 0), (coalesce(pl.t, 0) / 3600)::integer
    from top t left join played pl on pl.player_id = t.id
   order by t.candy_total desc, t.candy_at asc nulls last, t.id;
$$;

revoke execute on function public.darb_winners(integer) from public, anon, authenticated;
grant execute on function public.darb_winners(integer) to service_role;
