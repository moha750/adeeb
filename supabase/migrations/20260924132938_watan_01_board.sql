-- «ركضة وطن» — اللاعبون والجولاتُ ولوحتا الصدارة
--
-- **طُبِّق بإذن المالك ٢٠٢٦-٠٩-٢٤** (النسخةُ في السجلّ الحيّ 20260924132938). وما طُبِّق هو هذا
-- النصُّ نفسُه بلا تعليقات الأسطر وبلا begin/commit (أداةُ الترحيل تلفّه في معاملة).
--
-- ## ما هذا
-- لعبةُ عَدْوٍ لليوم الوطنيّ تُلعَب في الجوّال، ولها لوحتان: **أبعدُ مسافةٍ في جولةٍ
-- واحدة**، و**أكثرُ مصّاصٍ في الجولات كلّها**. والثلاثةُ الأوائل يتميّزون بلا جائزة،
-- والفائزُ يُعلَن باسمه المستعار في منشور (قراراتُ المالك ٢٠٢٦-٠٩-٢٤).
--
-- ## ولا رقمَ جوّالٍ ولا حساب
-- انسحب الراعي فزال الغرضُ الوحيدُ لجمع الأرقام، فلا يُجمع شيءٌ غيرُ الاسم المستعار.
-- واللاعبُ **رمزٌ في جهازه** (كوكيز `httpOnly`) والقاعدةُ لا ترى إلّا بصمتَه، على نمط
-- «خمّن الكلمة» بقراراته (`GAME-SYSTEM.md` §أوّلًا/٤).
--
-- ## والنتيجةُ تُعاد لا تُصدَّق
-- الجهازُ يرسل **بذرةً أعطاه إيّاها الخادم** وضغطاتٍ بلحظاتها، والخادمُ (Next) يُعيد
-- الجولةَ بلبّ اللعبة نفسِه فيحسب المسافةَ والمصّاص. فهذه الدوالُّ **لا تحسب شيئًا**:
-- تحفظ ما حسبه الخادمُ، وتحرس ثلاثة:
--   ١. التذكرةُ تُستعمل مرّةً واحدة: لوحةُ المصّاص مجموع، فجولةٌ تُرسَل مئةَ مرّةٍ تجمع مئةَ ضعف.
--   ٢. زمنُ اللعب لا يسبق الساعة: جولةٌ من عشر دقائق أُرسلت بعد دقيقةٍ من تذكرتها
--      حُسبت ولم تُلعَب (`fast`، تُلغى).
--   ٣. ما بلغ الحدَّ التقنيَّ (١٥ دقيقة لعب) يُحفَظ **ولا يدخل اللوحة** حتّى يُراجَع
--      (`cap`). وإن رُوجع فصحّ: `select watan_approve_run('<id>');`
--
-- ## والحراسة: لا يبلغ المتصفّحُ شيئًا من هنا
-- الجدولان بلا سياسةٍ واحدة تحت RLS، ومنزوعان صراحةً عن `anon` و`authenticated`
-- و`PUBLIC` (درسُ `gw_04`: الجدولُ يولد بامتيازات Supabase الافتراضيّة). والدوالُّ
-- لمفتاح الخدمة وحده (درسُ `gw_05`)، تُنادى من أبواب `app/watan/api/*` بعد فحصها.
--
-- ## والإشراف: حجبُ اسمٍ لا حذفُ لاعب
--   update public.watan_players set hidden = true where nickname = '…';
-- يغيب عن اللوحتين ويبقى صاحبُه يلعب، والرجوعُ عنه `hidden = false`.

begin;

-- ═══ (١) اللاعبون ═══════════════════════════════════════════════════════════
create table if not exists public.watan_players (
  id            uuid primary key default gen_random_uuid(),
  -- الاسمُ كما كتبه صاحبُه بعد التنظيف، والمفتاحُ ما يُقارَن به: بلا تشكيلٍ ولا
  -- تطويلٍ ولا مسافات، والهمزاتُ موحَّدة (`lib/watan/rules.ts` ‹nameKey›). فلا يأخذ
  -- اثنان «صقرُ الأحساء» و«صقر الاحساء».
  nickname      text not null check (char_length(nickname) between 2 and 20),
  nickname_key  text not null unique check (char_length(nickname_key) between 2 and 40),
  token_hash    text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  -- اللوحتان محفوظتان في صفّ اللاعب لا محسوبتان من الجولات في كلّ قراءة. وزمنُ
  -- بلوغ القيمة يفصل التعادل: من بلغها أوّلًا يسبق.
  best_dist     integer not null default 0 check (best_dist >= 0),
  best_at       timestamptz,
  candy_total   integer not null default 0 check (candy_total >= 0),
  candy_at      timestamptz,
  runs          integer not null default 0 check (runs >= 0),
  hidden        boolean not null default false,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

comment on table public.watan_players is
  'ركضة وطن — لاعبٌ باسمٍ مستعار وبصمةِ رمزِ جهازه. لا رقمَ جوّالٍ ولا حساب.';

create index if not exists watan_board_dist_idx
  on public.watan_players (best_dist desc, best_at) where not hidden and best_dist > 0;
create index if not exists watan_board_candy_idx
  on public.watan_players (candy_total desc, candy_at) where not hidden and candy_total > 0;

-- ═══ (٢) الجولات ════════════════════════════════════════════════════════════
create table if not exists public.watan_runs (
  id         uuid primary key default gen_random_uuid(),
  player_id  uuid not null references public.watan_players(id) on delete cascade,
  seed       bigint not null check (seed between 0 and 4294967295),
  -- بصمةُ اللبّ الذي لُعبت به (`lib/watan/core.js` ‹CORE_VERSION›).
  core       text not null,
  status     text not null default 'open' check (status in ('open', 'done', 'void')),
  issued_at  timestamptz not null default now(),
  ended_at   timestamptz,
  ticks      integer check (ticks >= 0),
  dist       integer check (dist >= 0),
  candies    integer check (candies >= 0),
  -- السجلُّ المرمَّز يُحفَظ ليُعاد عرضُ الجولة عند المراجعة.
  input      text,
  flag       text check (flag in ('cap', 'cap_ok', 'mismatch', 'fast', 'expired'))
);

comment on table public.watan_runs is
  'ركضة وطن — جولةٌ من تذكرتها إلى نهايتها. النتيجةُ ما حسبه الخادمُ بإعادتها.';

create index if not exists watan_runs_player_idx on public.watan_runs (player_id, issued_at desc);
create index if not exists watan_runs_flag_idx on public.watan_runs (flag) where flag is not null;

-- ═══ (٣) الحراسة ════════════════════════════════════════════════════════════
alter table public.watan_players enable row level security;
alter table public.watan_runs enable row level security;
revoke all on public.watan_players from public, anon, authenticated;
revoke all on public.watan_runs from public, anon, authenticated;

-- ═══ (٤) الدوالّ ════════════════════════════════════════════════════════════

-- التسجيلُ وتبديلُ الاسم بنداءٍ واحد. والتفرّدُ من القيد لا من فحصٍ يسبقه.
create or replace function public.watan_register(p_token_hash text, p_nickname text, p_key text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  update watan_players
     set nickname = p_nickname, nickname_key = p_key, last_seen_at = now()
   where token_hash = p_token_hash
  returning id into v_id;
  if v_id is null then
    insert into watan_players (nickname, nickname_key, token_hash)
    values (p_nickname, p_key, p_token_hash)
    returning id into v_id;
  end if;
  return v_id;
exception when unique_violation then
  raise exception 'watan_name_taken';
end $$;

-- التذكرة: البذرةُ من الخادم، وستّون جولةً في عشر دقائق سقفٌ لا يبلغه لاعب.
create or replace function public.watan_start_run(p_token_hash text, p_seed bigint, p_core text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_player uuid; v_n integer; v_id uuid;
begin
  select id into v_player from watan_players where token_hash = p_token_hash;
  if v_player is null then raise exception 'watan_no_player'; end if;

  select count(*) into v_n from watan_runs
   where player_id = v_player and issued_at > now() - interval '10 minutes';
  if v_n >= 60 then raise exception 'watan_too_many'; end if;

  insert into watan_runs (player_id, seed, core) values (v_player, p_seed, p_core)
  returning id into v_id;
  update watan_players set last_seen_at = now() where id = v_player;
  return v_id;
end $$;

-- البذرةُ لإعادة الجولة، ولصاحبها وحده.
create or replace function public.watan_run_ticket(p_token_hash text, p_run uuid)
returns table (seed bigint, status text)
language sql stable security definer set search_path = public
as $$
  select r.seed, r.status
    from watan_runs r join watan_players p on p.id = r.player_id
   where r.id = p_run and p.token_hash = p_token_hash;
$$;

-- الإغلاق: تُعيد حالةً ولا ترفع استثناءً، لأنّ الاستثناءَ يمحو ما كُتب قبله
-- (والإلغاءُ مكتوبٌ يجب أن يبقى).
create or replace function public.watan_finish_run(
  p_token_hash text, p_run uuid, p_ticks integer, p_dist integer,
  p_candies integer, p_input text, p_flag text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_player uuid; v_issued timestamptz; v_status text;
  v_counted boolean; v_best integer; v_total integer;
begin
  select r.player_id, r.issued_at, r.status into v_player, v_issued, v_status
    from watan_runs r join watan_players p on p.id = r.player_id
   where r.id = p_run and p.token_hash = p_token_hash
     for update of r;
  if v_player is null then return jsonb_build_object('status', 'missing'); end if;
  if v_status <> 'open' then return jsonb_build_object('status', 'closed'); end if;

  -- ثلاثُ ساعات: جولةٌ أُوقفت ونُسي الجوّالُ ساعةً ثمّ أُكملت تبقى صالحة.
  if now() - v_issued > interval '3 hours' then
    update watan_runs set status = 'void', flag = 'expired', ended_at = now() where id = p_run;
    return jsonb_build_object('status', 'expired');
  end if;

  -- زمنُ اللعب لا يسبق الساعة. والسماحُ ثانيتان و٢٪ لفارق الشبكة ودقّة العدّاد.
  if extract(epoch from (now() - v_issued)) * 1.02 + 2 < p_ticks / 60.0 then
    update watan_runs
       set status = 'void', flag = 'fast', ended_at = now(),
           ticks = p_ticks, dist = p_dist, candies = p_candies, input = p_input
     where id = p_run;
    return jsonb_build_object('status', 'fast');
  end if;

  v_counted := p_flag is distinct from 'cap';
  update watan_runs
     set status = 'done', ended_at = now(), ticks = p_ticks, dist = p_dist,
         candies = p_candies, input = p_input, flag = p_flag
   where id = p_run;

  -- في UPDATE تقرأ العباراتُ كلُّها القيمَ القديمة، فـ`best_at` يقارن بالأفضل السابق.
  update watan_players
     set runs = runs + 1,
         best_at     = case when v_counted and p_dist > best_dist then now() else best_at end,
         best_dist   = case when v_counted then greatest(best_dist, p_dist) else best_dist end,
         candy_at    = case when v_counted and p_candies > 0 then now() else candy_at end,
         candy_total = case when v_counted then candy_total + p_candies else candy_total end,
         last_seen_at = now()
   where id = v_player
  returning best_dist, candy_total into v_best, v_total;

  return jsonb_build_object('status', 'ok', 'counted', v_counted,
                            'best_dist', v_best, 'candy_total', v_total);
end $$;

-- اعتمادُ جولةٍ بلغت الحدَّ بعد مراجعتها (يدويٌّ من المحرّر، لا بابَ له في الموقع).
create or replace function public.watan_approve_run(p_run uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare r watan_runs;
begin
  select * into r from watan_runs where id = p_run and flag = 'cap' for update;
  if not found then raise exception 'watan_not_held'; end if;
  update watan_runs set flag = 'cap_ok' where id = p_run;
  update watan_players
     set best_at     = case when r.dist > best_dist then now() else best_at end,
         best_dist   = greatest(best_dist, r.dist),
         candy_at    = case when r.candies > 0 then now() else candy_at end,
         candy_total = candy_total + r.candies
   where id = r.player_id;
end $$;

-- اللوحة: الاسمُ والقيمةُ والترتيب. والتعادلُ لمن بلغ أوّلًا.
create or replace function public.watan_board(p_kind text, p_limit integer default 50)
returns table (rank bigint, nickname text, value integer)
language sql stable security definer set search_path = public
as $$
  select row_number() over (order by x.v desc, x.t asc nulls last, x.id), x.nickname, x.v
    from (
      select id, nickname,
             case when p_kind = 'candy' then candy_total else best_dist end as v,
             case when p_kind = 'candy' then candy_at else best_at end as t
        from watan_players
       where not hidden
    ) x
   where x.v > 0
   order by x.v desc, x.t asc nulls last, x.id
   limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

-- حالُ لاعبٍ واحد: ترتيبُه في اللوحتين وقيمةُ من يسبقه مباشرةً.
create or replace function public.watan_me(p_token_hash text)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  p watan_players;
  d_rank bigint; d_above integer; c_rank bigint; c_above integer;
begin
  select * into p from watan_players where token_hash = p_token_hash;
  if not found then return null; end if;

  if not p.hidden and p.best_dist > 0 then
    select count(*) + 1, min(q.best_dist) into d_rank, d_above
      from watan_players q
     where not q.hidden and q.best_dist > 0 and q.id <> p.id
       and (q.best_dist > p.best_dist
            or (q.best_dist = p.best_dist and (q.best_at, q.id) < (p.best_at, p.id)));
  end if;

  if not p.hidden and p.candy_total > 0 then
    select count(*) + 1, min(q.candy_total) into c_rank, c_above
      from watan_players q
     where not q.hidden and q.candy_total > 0 and q.id <> p.id
       and (q.candy_total > p.candy_total
            or (q.candy_total = p.candy_total and (q.candy_at, q.id) < (p.candy_at, p.id)));
  end if;

  return jsonb_build_object(
    'name', p.nickname,
    'runs', p.runs,
    'dist',  jsonb_build_object('value', p.best_dist,   'rank', d_rank, 'above', d_above),
    'candy', jsonb_build_object('value', p.candy_total, 'rank', c_rank, 'above', c_above)
  );
end $$;

-- ═══ (٥) التنفيذ لمفتاح الخدمة وحده ═══════════════════════════════════════
revoke execute on function
  public.watan_register(text, text, text),
  public.watan_start_run(text, bigint, text),
  public.watan_run_ticket(text, uuid),
  public.watan_finish_run(text, uuid, integer, integer, integer, text, text),
  public.watan_approve_run(uuid),
  public.watan_board(text, integer),
  public.watan_me(text)
from public, anon, authenticated;

grant execute on function
  public.watan_register(text, text, text),
  public.watan_start_run(text, bigint, text),
  public.watan_run_ticket(text, uuid),
  public.watan_finish_run(text, uuid, integer, integer, integer, text, text),
  public.watan_board(text, integer),
  public.watan_me(text)
to service_role;

commit;
