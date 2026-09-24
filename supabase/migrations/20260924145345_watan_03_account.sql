-- «ركضة وطن» — حسابُ أدِيب يحفظ التقدّم: العب ضيفًا، واحفظ تقدّمك بحسابك متى شئت
--
-- **طُبِّق ٢٠٢٦-٠٩-٢٤** (النسخةُ في السجلّ الحيّ 20260924145345)، وما طُبِّق هذا النصُّ نفسُه بلا
-- ترويسته وبلا begin/commit. وجُرِّب في القاعدة الحيّة داخل كتلةٍ مُتراجَعٍ عنها (ضيفٌ يُضمّ،
-- وجهازٌ جديدٌ بالحساب، وجهازٌ مشتركٌ لحسابٍ ثانٍ) فلم يبقَ منها صفّ.
--
-- قرارُ المالك ٢٠٢٦-٠٩-٢٤: «الربط ممتاز… حسابه بيحفظ له تقدّمه وين ما
-- راح، وما راح يحتاج رمز، ومن لا يريد حساب الرمز يكفيه»، ثمّ «نعم» على ظهور أدِيب في موضعين
-- (زرّ الحفظ بالحساب، وسطرُ «من تصميم نادي أدِيب») وعلى العودة إلى اللعبة بعد الدخول بلا
-- إكمال بيانات.
--
-- ## الهويّةُ الآن من طريقين، والحسابُ يغلب
-- اللاعبُ يُعرَف **بحسابه** إن كان داخلًا في الموقع، وإلّا **برمز متصفّحه** كما كان. فالدوالُّ
-- كلُّها تأخذ الاثنين (`p_token_hash` و`p_user`) وتسأل `watan_pid` عن اللاعب.
--
-- ## والضيفُ يُضمّ إلى الحساب عند أوّل طلبٍ بعد الدخول
-- من لعب ضيفًا ثمّ ضغط «احفظ تقدّمك» فدخل، يعود إلى اللعبة فيجد اسمَه ونتائجَه في حسابه:
-- `watan_pid` يرى حسابًا بلا لاعبٍ ومتصفّحًا له ضيفٌ غيرُ مربوط، فيربطهما. وإن كان للحساب
-- لاعبٌ من قبل **فالحسابُ يغلب**، ويبقى الضيفُ لاعبًا مستقلًّا برمز متصفّحه ورمز استرجاعه.
--
-- ## وحذفُ الحساب لا يحذف الاسم من اللوحة
-- `on delete set null`: يبقى اللاعبُ باسمه المستعار ونتائجه بلا رابطٍ بشخص، كأيّ ضيف.

begin;

alter table public.watan_players
  add column if not exists user_id uuid unique references auth.users(id) on delete set null;
-- لاعبُ الحساب قد لا يملك رمزَ متصفّح: من دخل بحسابه في متصفّحٍ رمزُه لضيفٍ مربوطٍ بحسابٍ
-- آخر (جهازٌ مشترك)، يُنشأ لاعبُه بلا رمز، فالحسابُ وحدَه يعرّفه.
alter table public.watan_players alter column token_hash drop not null;

-- ═══ مَن اللاعب؟ الحسابُ أوّلًا، ثمّ رمزُ المتصفّح — ومعه ضمُّ الضيف ═══════════
create or replace function public.watan_pid(p_token_hash text, p_user uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v uuid;
begin
  if p_user is not null then
    select id into v from watan_players where user_id = p_user;
    if v is not null then return v; end if;
    update watan_players set user_id = p_user
     where token_hash = p_token_hash and user_id is null
    returning id into v;
    return v;
  end if;
  if p_token_hash is null then return null; end if;
  select id into v from watan_players where token_hash = p_token_hash;
  return v;
end $$;

-- ═══ الدوالُّ بتوقيعها الجديد (والقديمُ يسقط) ═══════════════════════════════
drop function if exists public.watan_register(text, text, text, text);
drop function if exists public.watan_start_run(text, bigint, text);
drop function if exists public.watan_run_ticket(text, uuid);
drop function if exists public.watan_finish_run(text, uuid, integer, integer, integer, text, text);
drop function if exists public.watan_me(text);
drop function if exists public.watan_set_code(text, text);

create or replace function public.watan_register(
  p_token_hash text, p_user uuid, p_nickname text, p_key text, p_recovery_hash text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  v_id := watan_pid(p_token_hash, p_user);
  if v_id is not null then
    update watan_players set nickname = p_nickname, nickname_key = p_key, last_seen_at = now()
     where id = v_id;
    return jsonb_build_object('id', v_id, 'created', false);
  end if;
  insert into watan_players (nickname, nickname_key, token_hash, recovery_hash, user_id)
  values (p_nickname, p_key,
          case when p_user is not null and exists (select 1 from watan_players where token_hash = p_token_hash)
               then null else p_token_hash end,
          p_recovery_hash, p_user)
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'created', true);
exception when unique_violation then
  raise exception 'watan_name_taken';
end $$;

create or replace function public.watan_start_run(p_token_hash text, p_user uuid, p_seed bigint, p_core text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_player uuid; v_n integer; v_id uuid;
begin
  v_player := watan_pid(p_token_hash, p_user);
  if v_player is null then raise exception 'watan_no_player'; end if;

  select count(*) into v_n from watan_runs
   where player_id = v_player and issued_at > now() - interval '10 minutes';
  if v_n >= 60 then raise exception 'watan_too_many'; end if;

  insert into watan_runs (player_id, seed, core) values (v_player, p_seed, p_core)
  returning id into v_id;
  update watan_players set last_seen_at = now() where id = v_player;
  return v_id;
end $$;

create or replace function public.watan_run_ticket(p_token_hash text, p_user uuid, p_run uuid)
returns table (seed bigint, status text)
language plpgsql security definer set search_path = public
as $$
declare v_player uuid;
begin
  v_player := watan_pid(p_token_hash, p_user);
  return query select r.seed, r.status from watan_runs r where r.id = p_run and r.player_id = v_player;
end $$;

create or replace function public.watan_finish_run(
  p_token_hash text, p_user uuid, p_run uuid, p_ticks integer, p_dist integer,
  p_candies integer, p_input text, p_flag text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_player uuid; v_issued timestamptz; v_status text;
  v_counted boolean; v_best integer; v_total integer;
begin
  v_player := watan_pid(p_token_hash, p_user);
  select r.issued_at, r.status into v_issued, v_status
    from watan_runs r
   where r.id = p_run and r.player_id = v_player
     for update;
  if v_issued is null then return jsonb_build_object('status', 'missing'); end if;
  if v_status <> 'open' then return jsonb_build_object('status', 'closed'); end if;

  if now() - v_issued > interval '3 hours' then
    update watan_runs set status = 'void', flag = 'expired', ended_at = now() where id = p_run;
    return jsonb_build_object('status', 'expired');
  end if;

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

create or replace function public.watan_me(p_token_hash text, p_user uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  p watan_players; v uuid;
  d_rank bigint; d_above integer; c_rank bigint; c_above integer;
begin
  v := watan_pid(p_token_hash, p_user);
  if v is null then return null; end if;
  select * into p from watan_players where id = v;

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
    'account', p.user_id is not null,
    'dist',  jsonb_build_object('value', p.best_dist,   'rank', d_rank, 'above', d_above),
    'candy', jsonb_build_object('value', p.candy_total, 'rank', c_rank, 'above', c_above)
  );
end $$;

create or replace function public.watan_set_code(p_token_hash text, p_user uuid, p_recovery_hash text)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare v uuid;
begin
  v := watan_pid(p_token_hash, p_user);
  if v is null then return false; end if;
  update watan_players set recovery_hash = p_recovery_hash where id = v;
  return true;
end $$;

revoke execute on function
  public.watan_pid(text, uuid),
  public.watan_register(text, uuid, text, text, text),
  public.watan_start_run(text, uuid, bigint, text),
  public.watan_run_ticket(text, uuid, uuid),
  public.watan_finish_run(text, uuid, uuid, integer, integer, integer, text, text),
  public.watan_me(text, uuid),
  public.watan_set_code(text, uuid, text)
from public, anon, authenticated;

grant execute on function
  public.watan_register(text, uuid, text, text, text),
  public.watan_start_run(text, uuid, bigint, text),
  public.watan_run_ticket(text, uuid, uuid),
  public.watan_finish_run(text, uuid, uuid, integer, integer, integer, text, text),
  public.watan_me(text, uuid),
  public.watan_set_code(text, uuid, text)
to service_role;

commit;
