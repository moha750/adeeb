-- خمّن الكلمة — تحصينُ البابِ المفتوح (م٠أ)
--
-- ⚠️ مكتوبٌ ينتظر إذن المالك. لا يُنفَّذ إلّا بكلمته (قاعدةُ DDL).
--
-- ## لماذا الآن
-- بُنيت اللعبةُ في ٢٠٢٦-٠٥-١٠ لعميل V1، وV1 تقاعد ولم يبقَ لها مستعمِل. وقبل أن تُبنى
-- واجهةُ V2 عليها فُحصت القاعدةُ الحيّة، فوُجدت ثلاثُ ثغرات: واحدةٌ حيّةٌ تُستغَلّ اليوم،
-- واثنتان كامنتان. وهذا الترحيلُ يسدّها قبل أن يُبنى فوقها سطرٌ واحد.
--
-- ## (١) الثغرةُ الحيّة: رمزُ اللاعب سرٌّ في جدولٍ علنيّ
-- `player_token` هو **كلمةُ مرور اللاعب**: من ملكه أرسل الإجاباتِ باسمه. وهو مخزَّنٌ
-- خامًا في عمودٍ لـ`anon` عليه `SELECT`، وسياسةُ `gw_players_select` تُخرج كلَّ صفٍّ
-- `is_kicked = false`، وسياسةُ `gw_sessions_select` قِوامُها `true`. فالسلسلةُ كاملة:
-- غريبٌ يعدّ الغرفَ، فيقرأ لاعبيها، فيسرق رموزَهم، فيلعب بأسمائهم.
--
-- **والعلاجُ جذرٌ لا حراسةُ عمود:** لا يُخزَّن السرُّ أصلًا. يُخزَّن `sha256` منه،
-- والخامُ يبقى في كوكيز `httpOnly` عند اللاعب لا تبلغه سكربتات الصفحة. فلو تسرّب الصفُّ
-- كلُّه لم يكن فيه ما يُنتحَل به. (وحراسةُ العمود بـ`revoke select (col)` لا تكفي هنا:
-- \u200Frealtime يبثّ الصفَّ بحكم RLS لا بحكم امتيازات الأعمدة.)
--
-- ## (٢) الرمزُ يعمل في غرفةٍ ليست غرفتَه
-- `gw_submit_answer(p_token, …)` و`gw_get_player_state(p_token)` تبحثان عن اللاعب
-- **عبر الجداول كلِّها** بلا حصرٍ بجلسة (`WHERE player_token = … LIMIT 1`). فتُحصَران
-- بجلسةٍ صريحة، ويصير المفتاحُ الفريدُ `(session_id, token_hash)` هو مسارَ البحث.
--
-- ## (٣) اللغمُ الكامن: منحُ كتابةٍ بلا سياسة
-- `anon` و`authenticated` يملكان `INSERT`/`UPDATE` على أعمدة الجداول الأربعة. لا يقع
-- ضررٌ اليوم لأنّ RLS بلا سياسةِ كتابةٍ يمنع؛ لكنّ سياسةً تُضاف غدًا لسببٍ وجيه تفتح
-- البابَ كلَّه. وعُرفُ المستودع مستقرّ: **المنحُ صريحٌ لا مفهوم** (درسُ `profiles`)،
-- و**ما دام البابُ الخلفيّ مفتوحًا في القاعدة فالدرعُ زينة** (درسُ التواصل وديبو).
--
-- فالكتابةُ كلُّها تصير عبر دوالَّ `security definer`: دوالُّ المضيف لـ`authenticated`
-- تقرأ `auth.uid()` بنفسها، ودوالُّ اللاعب لـ`service_role` وحده تُستدعى من فعلِ خادم
-- يحمل درعَ Turnstile. والقراءةُ وحدها تبقى لـ`anon` بسياساتها الأربع (وهي صحيحة).
--
-- ## وما لا يُمَسّ
-- السياساتُ الأربعُ الحيّةُ سليمة، وأهمُّها `gw_words_select`: لا يقرأ اللاعبُ من
-- الكلمات إلّا **الجاريةَ** أو ما بعد `finished`. أي أنّ الكلمةَ العاشرة لا تغادر
-- الخادمَ قبل أوانها، ومن فتح أدواتِ المتصفّح لم يجدها. تبقى كما هي.

begin;

-- ═══ (١) السرُّ يصير بصمة ═══════════════════════════════════════════════════
-- الصفوفُ القائمة (خمسةُ لاعبين في جلستَي تجربةٍ منتهيتين) تحمل رموزًا خامًا لا بصمات.
-- لا تُحذَف ولا تُحوَّل: جلستاهما `finished` فلا لعبَ فيهما، وقيمُها لن تطابق كوكيزًا
-- أبدًا فتصير حبرًا ميّتًا لا بابًا. ولذلك **لا قيدَ شكلٍ على العمود** — قيدُ ٦٤ محرفًا
-- ستّةَ عشريًّا كان يُسقط الترحيلَ على صفوفٍ لا ضررَ منها.
alter table public.guess_word_players
  rename column player_token to token_hash;

alter table public.guess_word_players
  rename constraint guess_word_players_session_id_player_token_key
  to guess_word_players_session_id_token_hash_key;

comment on column public.guess_word_players.token_hash is
  'بصمةُ رمز اللاعب: sha256(الرمز ‖ VISITOR_SALT). الخامُ في كوكيز httpOnly عند اللاعب ولا يُخزَّن هنا أبدًا.';

-- ═══ (٢) شكلُ الرمز يُفرَض في القاعدة ═══════════════════════════════════════
-- الرمزُ يُملى بالصوت في قاعةٍ ويُقرأ عن بُعدٍ على بروجكتر، فأبجديّتُه **بلا زوجٍ ملتبِس**:
-- تسقط `0` و`O` معًا، وتسقط `1` و`I` معًا. و`L` **باقيةٌ عمدًا** — التباسُها إنّما هو
-- بـ`1` وقد سقطت الأرقامُ دون الاثنين، فلا يبقى لها شبيه.
-- اثنان وثلاثون محرفًا في ستّة مواضع = مليارٌ وسبع مئة مليون احتمال.
-- (الرمزان القائمان يجتازانه — فُحِصا قبل الكتابة.)
alter table public.guess_word_sessions
  drop constraint if exists guess_word_sessions_code_shape;
alter table public.guess_word_sessions
  add constraint guess_word_sessions_code_shape
  check (code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$');

-- ═══ (٣) مولّدُ الرمز من عشوائيّةٍ تعمويّة ═══════════════════════════════════
-- كان `random()`، وهي تُتوقَّع من مخرجاتها: من رأى رمزًا استنتج التالي فدخل غرفةً لم
-- يُدعَ إليها. و`gen_random_bytes` من pgcrypto لا تُتوقَّع.
--
-- **ولماذا في القاعدة لا في التطبيق** (خلافًا لرمز الباركود): التفرّدُ هنا يُفحَص
-- ويُثبَت في معاملةٍ واحدة مع الإدراج، فلا سباقَ بين قارئٍ وكاتب. أمّا رمزُ الباركود
-- فيُولَّد في التطبيق لأنّه جزءٌ من وصفةِ رسمٍ تُبنى قبل أيّ نداءِ قاعدة.
create or replace function public.gw_generate_session_code()
returns text
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- ٣٢ محرفًا، بلا الزوجين 0/O و1/I
  v_code  text;
  v_bytes bytea;
  v_tries integer := 0;
begin
  loop
    v_bytes := gen_random_bytes(6);
    v_code := '';
    for i in 0..5 loop
      -- الباقي من ٣٢ لا يُميل الاحتمال: ٢٥٦ تقبل القسمة على ٣٢ بلا كسر.
      v_code := v_code || substr(v_chars, (get_byte(v_bytes, i) % 32) + 1, 1);
    end loop;

    if not exists (select 1 from guess_word_sessions where code = v_code) then
      return v_code;
    end if;

    v_tries := v_tries + 1;
    if v_tries > 50 then
      raise exception 'GW_CODE_GEN_FAILED: تعذّر توليد رمزٍ فريد';
    end if;
  end loop;
end;
$$;

revoke all on function public.gw_generate_session_code() from public, anon, authenticated;

-- ═══ (٤) دوالُّ اللاعب: تُحصَر بجلسة، وتأخذ البصمة، ولا يبلغها متصفّح ═══════
-- التوقيعاتُ تتبدّل، فتُسقَط القديمةُ باسمها ونوعِها كي لا يبقى حِملٌ زائدٌ منسيّ
-- يُنادى من حيث لا ندري.
drop function if exists public.gw_join_session(text, text, text);
drop function if exists public.gw_submit_answer(text, text);
drop function if exists public.gw_get_player_state(text);
-- ولوحُ النتائج لا يحتاج دالّةً: اللاعبُ يقرأ `name`/`score` من `guess_word_players`
-- بسياستها، وrealtime يدفعهما إليه. دالّةٌ لا تزيد على ما تُخرجه السياسةُ حِملٌ يُصان.
drop function if exists public.gw_get_leaderboard(uuid);

/**
 * الانضمام. يُنادى من فعلِ خادمٍ بعد Turnstile، بمفتاح الخدمة.
 * والبصمةُ تُحسَب في التطبيق (`lib/games/playerToken.ts`) لا هنا: الملحُ في بيئة
 * التطبيق ولا يُودَع القاعدةَ، فمن قرأ صفًّا لم يقرأ ما يُعيد به الحساب.
 */
create or replace function public.gw_join_session(
  p_code       text,
  p_name       text,
  p_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session guess_word_sessions;
  v_player  guess_word_players;
  v_name    text;
  v_hash    text;
begin
  -- محارفُ الاتّجاه الخفيّة تلتصق باللصق العربيّ فتُفسد العرض والمقارنة معًا.
  -- والنطاقُ بالإفلات لا بالمحارف نفسِها: محرفٌ غيرُ مرئيٍّ في ملفِّ ترحيلٍ لا يُراجَع.
  v_name := btrim(regexp_replace(coalesce(p_name, ''), E'[\u200E\u200F\u202A-\u202E]', '', 'g'));
  v_hash := btrim(coalesce(p_token_hash, ''));

  if length(v_name) < 2 or length(v_name) > 24 then
    raise exception 'GW_INVALID_NAME: الاسم من حرفين إلى أربعةٍ وعشرين';
  end if;

  if v_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'GW_INVALID_TOKEN';
  end if;

  select * into v_session from guess_word_sessions where code = upper(btrim(coalesce(p_code, '')));
  if not found then
    raise exception 'GW_SESSION_NOT_FOUND: لا غرفةَ بهذا الرمز';
  end if;

  if v_session.status = 'finished' then
    raise exception 'GW_SESSION_FINISHED: انتهت هذه اللعبة';
  end if;

  -- الاسمُ المكرَّر يُردّ: المضيفُ يحكم بالنظر إلى الأسماء، واسمان متطابقان يجعلان
  -- حُكمَه قرعةً. والاستثناءُ صاحبُ البصمة نفسِها — فهو يعود لا ينتحل.
  if exists (
    select 1 from guess_word_players
    where session_id = v_session.id
      and lower(name) = lower(v_name)
      and token_hash <> v_hash
  ) then
    raise exception 'GW_NAME_TAKEN: هذا الاسم مأخوذ، اختر غيره';
  end if;

  insert into guess_word_players (session_id, name, token_hash)
  values (v_session.id, v_name, v_hash)
  on conflict (session_id, token_hash) do update set name = excluded.name
  returning * into v_player;

  if v_player.is_kicked then
    raise exception 'GW_PLAYER_KICKED: أُخرِجتَ من هذه الغرفة';
  end if;

  return jsonb_build_object(
    'session_id',     v_session.id,
    'session_code',   v_session.code,
    'session_title',  v_session.title,
    'session_status', v_session.status,
    'player_id',      v_player.id,
    'player_name',    v_player.name,
    'player_score',   v_player.score
  );
end;
$$;

/**
 * إرسالُ الإجابة. الزمنُ يُقاس **في الخادم** من `started_at` مطروحًا منه ما وقفت فيه
 * الجولة — فلا يُؤتمن المتصفّحُ على ساعته، ولا تأكل وقفةُ المضيفِ من مهلة اللاعب.
 */
create or replace function public.gw_submit_answer(
  p_session_id uuid,
  p_token_hash text,
  p_answer     text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_player      guess_word_players;
  v_session     guess_word_sessions;
  v_word        guess_word_words;
  v_answer      text;
  v_now         timestamptz := now();
  v_elapsed_ms  integer;
  v_row         guess_word_answers;
begin
  v_answer := btrim(regexp_replace(coalesce(p_answer, ''), E'[\u200E\u200F\u202A-\u202E]', '', 'g'));
  if length(v_answer) = 0 or length(v_answer) > 500 then
    raise exception 'GW_INVALID_ANSWER: الإجابة مطلوبة (حتى ٥٠٠ حرف)';
  end if;

  -- ← الحصرُ بالجلسة: بصمةُ غرفةٍ لا تعمل في غرفةٍ أخرى (الثغرة ٢).
  select * into v_player from guess_word_players
  where session_id = p_session_id and token_hash = btrim(coalesce(p_token_hash, ''));
  if not found then
    raise exception 'GW_PLAYER_NOT_FOUND';
  end if;

  if v_player.is_kicked then
    raise exception 'GW_PLAYER_KICKED: أُخرِجتَ من هذه الغرفة';
  end if;

  select * into v_session from guess_word_sessions where id = v_player.session_id;
  if v_session.status <> 'active' or v_session.current_word_id is null then
    raise exception 'GW_NO_ACTIVE_ROUND: لا جولةَ جارية';
  end if;

  select * into v_word from guess_word_words where id = v_session.current_word_id;
  if v_word.started_at is null or v_word.ended_at is not null then
    raise exception 'GW_ROUND_NOT_OPEN';
  end if;

  -- الجولةُ الموقوفةُ تُقفِل الحقل: `paused_at` يُضاف في م٠ب، ويُقرأ هنا بـ`to_jsonb`
  -- كي يبقى هذا الترحيلُ قابلًا للتنفيذ وحدَه قبل أخيه.
  if (to_jsonb(v_word) ? 'paused_at') and (to_jsonb(v_word) ->> 'paused_at') is not null then
    raise exception 'GW_ROUND_PAUSED: الجولةُ موقوفة';
  end if;

  v_elapsed_ms := extract(epoch from (v_now - v_word.started_at)) * 1000
                  - coalesce((to_jsonb(v_word) ->> 'paused_ms')::integer, 0);

  -- نصفُ ثانيةٍ سماحًا لزمن الشبكة: من ضغط في الثانية الأخيرة لا يُظلَم بالرحلة.
  if v_elapsed_ms > v_session.time_per_word * 1000 + 500 then
    raise exception 'GW_TIME_UP: انتهى وقتُ الجولة';
  end if;

  insert into guess_word_answers (word_id, player_id, answer, submitted_at, response_ms)
  values (v_word.id, v_player.id, v_answer, v_now, greatest(v_elapsed_ms, 0))
  on conflict (word_id, player_id) do nothing
  returning * into v_row;

  if v_row.id is null then
    raise exception 'GW_ALREADY_ANSWERED: أرسلتَ إجابتَك بالفعل';
  end if;

  return jsonb_build_object(
    'answer_id',   v_row.id,
    'response_ms', v_row.response_ms
  );
end;
$$;

/**
 * حالُ اللاعب. شبكةُ الأمان تحت اشتراك realtime: قاعةٌ فيها خمسون هاتفًا على واي‑فاي
 * ضعيف تُسقِط مقابس، فتُقرأ الحالُ دوريًّا ما دامت الغرفةُ جارية.
 * ولا تُخرج إجاباتِ الآخرين أبدًا — من قرأ سطرَ من سبقه نسخه.
 */
create or replace function public.gw_get_player_state(
  p_session_id uuid,
  p_token_hash text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_player   guess_word_players;
  v_session  guess_word_sessions;
  v_word     guess_word_words;
  v_answered boolean := false;
  v_winner   text;
  v_wj       jsonb;
begin
  select * into v_player from guess_word_players
  where session_id = p_session_id and token_hash = btrim(coalesce(p_token_hash, ''));
  if not found then
    return null;
  end if;

  select * into v_session from guess_word_sessions where id = v_player.session_id;

  if v_session.current_word_id is not null then
    select * into v_word from guess_word_words where id = v_session.current_word_id;
    select exists (
      select 1 from guess_word_answers where word_id = v_word.id and player_id = v_player.id
    ) into v_answered;

    if v_word.winner_player_id is not null then
      select name into v_winner from guess_word_players where id = v_word.winner_player_id;
    end if;
  end if;

  v_wj := coalesce(to_jsonb(v_word), '{}'::jsonb);

  return jsonb_build_object(
    'session_id',      v_session.id,
    'session_status',  v_session.status,
    'time_per_word',   v_session.time_per_word,
    'server_now',      now(),               -- ← يُعايَر به فارقُ الساعتين مرّةً
    'word_id',         v_word.id,
    'word',            v_word.word,
    'word_started_at', v_word.started_at,
    'word_ended_at',   v_word.ended_at,
    'word_paused_at',  v_wj ->> 'paused_at',
    'word_paused_ms',  coalesce((v_wj ->> 'paused_ms')::integer, 0),
    'winner_name',     v_winner,
    'player_id',       v_player.id,
    'player_name',     v_player.name,
    'player_score',    v_player.score,
    'player_kicked',   v_player.is_kicked,
    'already_answered', v_answered
  );
end;
$$;

-- ═══ (٥) ولا تُرسَل البصمةُ إلى متصفّح المضيف ═══════════════════════════════
-- `gw_get_admin_session_data` تُخرج `to_jsonb(p.*)` فتحمل معها عمودَ الرمز كلَّه إلى
-- الشاشة. وليست ثغرةً — الدالّةُ محروسةٌ بـ`gw_is_admin` — لكنّها إرسالُ سرٍّ إلى حيث
-- لا يُنتفَع به: يسكن في حالة React وفي أدوات المطوّر وفي أيّ لقطةِ شاشة. **وأسلمُ
-- سرٍّ ما لم يُرسَل.** فيُنزَع بالاسم، ويبقى الباقي كما هو (وأعمدةُ م٠ب تلتحق تلقائيًّا
-- إذ `to_jsonb` تقرأ الصفَّ لا قائمةً محفورة).
create or replace function public.gw_get_admin_session_data(p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_session jsonb;
  v_words   jsonb;
  v_players jsonb;
  v_answers jsonb;
  v_current uuid;
begin
  if not gw_is_admin(auth.uid()) then
    raise exception 'GW_FORBIDDEN';
  end if;

  select to_jsonb(s.*) into v_session from guess_word_sessions s where s.id = p_session_id;
  if v_session is null then
    raise exception 'GW_SESSION_NOT_FOUND';
  end if;

  v_current := (v_session ->> 'current_word_id')::uuid;

  select coalesce(jsonb_agg(to_jsonb(w.*) order by w.position), '[]'::jsonb) into v_words
  from guess_word_words w where w.session_id = p_session_id;

  select coalesce(jsonb_agg((to_jsonb(p.*) - 'token_hash') order by p.joined_at), '[]'::jsonb)
    into v_players
  from guess_word_players p where p.session_id = p_session_id;

  -- إجاباتُ الجولة الجارية وحدها، مرتَّبةً بالأسرع: الترتيبُ هو نصفُ حُكم المضيف.
  if v_current is not null then
    select coalesce(jsonb_agg(
             jsonb_build_object(
               'id', a.id, 'player_id', a.player_id, 'player_name', pl.name,
               'answer', a.answer, 'response_ms', a.response_ms, 'submitted_at', a.submitted_at
             ) order by a.response_ms asc), '[]'::jsonb)
      into v_answers
    from guess_word_answers a
    join guess_word_players pl on pl.id = a.player_id
    where a.word_id = v_current;
  else
    v_answers := '[]'::jsonb;
  end if;

  return jsonb_build_object(
    'session', v_session,
    'words',   v_words,
    'players', v_players,
    'answers', v_answers,
    -- ساعةُ الخادم تُرسَل مع البيانات فيُعايَر بها العدُّ التنازليّ مرّةً
    -- (درسُ محاكي الانتخابات: ساعةُ العالم تفارق ساعةَ المتصفّح).
    'server_now', now()
  );
end;
$$;

revoke all on function public.gw_get_admin_session_data(uuid) from public, anon;
grant execute on function public.gw_get_admin_session_data(uuid) to authenticated, service_role;

-- ═══ (٦) المنحُ صريحٌ لا مفهوم ══════════════════════════════════════════════
-- دوالُّ اللاعبِ الثلاثُ لا يبلغها متصفّح: تُنادى من فعلِ خادمٍ بمفتاح الخدمة، بعد
-- درعِ Turnstile على الانضمام. ولو بقيت لـ`anon` لكان الدرعُ زينةً تُتخطّى بنداءٍ مباشر.
revoke all on function public.gw_join_session(text, text, text)      from public, anon, authenticated;
revoke all on function public.gw_submit_answer(uuid, text, text)     from public, anon, authenticated;
revoke all on function public.gw_get_player_state(uuid, text)        from public, anon, authenticated;

grant execute on function public.gw_join_session(text, text, text)   to service_role;
grant execute on function public.gw_submit_answer(uuid, text, text)  to service_role;
grant execute on function public.gw_get_player_state(uuid, text)     to service_role;

-- والكتابةُ المباشرةُ على الجداول تُنزَع من الطرفين (الثغرة ٣). القراءةُ تبقى، فهي
-- عينُ ما تحكمه السياساتُ الأربع وعينُ ما يبثّه realtime.
revoke insert, update, delete, truncate on table
  public.guess_word_sessions,
  public.guess_word_words,
  public.guess_word_players,
  public.guess_word_answers
from anon, authenticated;

commit;
