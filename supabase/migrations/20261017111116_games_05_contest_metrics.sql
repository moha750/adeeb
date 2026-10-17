-- ═══════════════════════════════════════════════════════════════════════════
-- مسابقاتُ الألعاب على ما تقيسه كلُّ لعبة (قرارُ المالك ٢٠٢٦-١٠-١٧).
--
-- كانت المسابقةُ في اللوحة إعلانًا وحدَه (عنوانٌ وجوائزُ وموعدان)، فقال المالك: «طريقةُ احتسابها غيرُ
-- مفهومة»، وأُعلنت لـ«بنك أدِيب» مسابقةٌ لا تستطيع اللعبةُ حسابَها. فصارت المسابقةُ ثلاثة:
--  ١) **على ماذا يُتنافس**: مقياسٌ تعلنه اللعبةُ في `game_metrics` (أبعدُ مسافة، أكثرُ تمر…). ولعبةٌ بلا
--     مقياسٍ لا مسابقةَ لها (البنكُ: لاعبُه اسمٌ يُكتب بيده، ولا رصيدَ يتجمّع لأحد).
--  ٢) **من يُحسب له**: لاعبُ اللعبة كما يعرفه خادمُها (`darb_players`)، والمخفيُّ لا يُحسب.
--  ٣) **من فاز**: `game_contest_board` تحسب الصدارةَ من جولات النافذة وحدَها، حيّةً أثناءها وفائزين بعدها.
--
-- والمقياسُ الجديدُ لعبةٍ ما = سطرٌ في `game_metrics` وفرعٌ في `game_contest_board`، بترحيل.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ✅ مطبَّقٌ على الإنتاج ٢٠٢٦-١٠-١٧ بتفويض المالك (بأداة Supabase باسم `games_05_contest_metrics`، الإصدار 20261017111116).

create table public.game_metrics (
  game_slug  text not null references public.games(slug) on update cascade on delete cascade,
  metric     text not null check (metric ~ '^[a-z_]+$' and char_length(metric) <= 30),
  label      text not null check (char_length(btrim(label)) between 2 and 40),
  -- وحدةُ العدد في الصدارة (`ScoreUnit` في `app/games/_components/hall.ts`): مترٌ أو تمر.
  unit       text not null check (unit in ('m', 'tamr')),
  sort_order integer not null default 0,
  primary key (game_slug, metric)
);
comment on table public.game_metrics is
  'ما تستطيع كلُّ لعبةٍ أن يُتنافس عليه في مسابقاتها. لعبةٌ بلا صفٍّ هنا لا مسابقةَ لها.';
alter table public.game_metrics enable row level security;
revoke insert, update, delete, truncate on public.game_metrics from anon, authenticated;
create policy game_metrics_read on public.game_metrics for select to anon, authenticated using (true);

insert into public.game_metrics (game_slug, metric, label, unit, sort_order) values
  ('darbak-khadar', 'dist', 'أبعد مسافة في جولة', 'm', 0),
  ('darbak-khadar', 'tamr', 'أكثر تمر', 'tamr', 1)
on conflict do nothing;

alter table public.game_events add column metric text;
alter table public.game_events
  add constraint game_events_metric_fk foreign key (game_slug, metric)
  references public.game_metrics (game_slug, metric) on update cascade;
-- كلُّ مسابقةٍ جديدةٍ بمقياسها. و`not valid` يُبقي مسابقةَ أكواب oos (٢٠٢٦-٠٩) بلا مقياس: حكمُها
-- كان `darb_contest` ومنطقُ الأكواب، وهي ذكرى في السجلّ لا تُعدَّل.
alter table public.game_events
  add constraint game_events_metric_required check (metric is not null) not valid;
grant select (metric) on public.game_events to anon, authenticated;

/**
 * صدارةُ مسابقةٍ من جولات نافذتها وحدَها. الجولةُ تُحسب إن بدأت داخل النافذة واكتملت صادقةً
 * (`status = 'done'`، وليست مقطوعةً عند الحدّ `cap`). والتعادلُ لمن بلغ رقمَه أوّلًا.
 *
 * علنيّة (anon وauthenticated): صفحةُ المسابقة في الصالة تقرؤها، ولا تعيد إلّا الاسمَ المستعار
 * والرقم، وهما ظاهران أصلًا في لوحتي «دربك خضر».
 */
create or replace function public.game_contest_board(p_event uuid, p_limit integer default 10)
returns table(rank bigint, nickname text, value integer)
language plpgsql stable security definer set search_path = public
as $$
declare
  e record;
  lim integer := least(greatest(coalesce(p_limit, 10), 1), 100);
begin
  select g.game_slug, g.metric, g.starts_at, g.ends_at into e from game_events g where g.id = p_event;
  if not found or e.metric is null then return; end if;

  if e.game_slug = 'darbak-khadar' and e.metric in ('dist', 'tamr') then
    return query
    with runs as (
      select r.player_id, r.dist, r.ended_at,
             case when k.core is null then r.candies else 0 end as tamr
        from darb_runs r
        left join darb_cup_cores k on k.core = r.core
       where r.status = 'done'
         and coalesce(r.flag, '') <> 'cap'
         and r.issued_at >= e.starts_at and r.issued_at < e.ends_at
    ),
    agg as (
      select x.player_id,
             case e.metric when 'dist' then max(x.dist) else sum(x.tamr)::integer end as v,
             case e.metric
               when 'dist' then (array_agg(x.ended_at order by x.dist desc, x.ended_at))[1]
               else max(x.ended_at) filter (where x.tamr > 0)
             end as t
        from runs x
       group by x.player_id
    )
    select row_number() over (order by a.v desc, a.t asc nulls last, a.player_id),
           p.nickname, a.v
      from agg a
      join darb_players p on p.id = a.player_id
     where not p.hidden and a.v > 0
     order by a.v desc, a.t asc nulls last, a.player_id
     limit lim;
  end if;
end;
$$;
revoke all on function public.game_contest_board(uuid, integer) from public;
grant execute on function public.game_contest_board(uuid, integer) to anon, authenticated;

commit;
