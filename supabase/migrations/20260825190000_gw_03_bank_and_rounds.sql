-- خمّن الكلمة — بنكُ الكلمات وأفعالُ الجولة (م٠ب)
--
-- ⚠️ مكتوبٌ ينتظر إذن المالك. لا يُنفَّذ إلّا بكلمته (قاعدةُ DDL).
-- ويُطبَّق **بعد** `20260825180000_gw_02_hardening.sql` لا قبله.
--
-- ## ما ينقص اللعبةَ الحيّة
-- بُنيت في ٢٠٢٦-٠٥-١٠ على أبسط تصوّر: تُلصَق الكلماتُ نصًّا عند الإنشاء، وتُلعَب
-- بالترتيب، ولا رجعةَ في شيء. والمطلوبُ اليوم خمسةٌ لا وجودَ لها:
--
-- ١. **بنكُ كلماتٍ يبقى** — تُكتَب مرّةً وتُلعَب مواسم، بدل لصقِها في كلّ حفل.
-- ٢. **ثلاثةُ أوضاعٍ للاختيار** — كلُّها، أو ما يؤشّر عليه، أو عددٌ عشوائيّ.
-- ٣. **إيقافُ الجولةِ واستئنافُها** — يقاطَع المضيفُ في قاعةٍ حقيقيّة.
-- ٤. **إعادةُ الجولة** — تُلبَس الكلمةُ وتُعاد من الصفر.
-- ٥. **إرجاعُ من أُخرِج** — بنقاطه وإجاباته، لا لاعبًا جديدًا.
--
-- ## والكلماتُ تُنسَخ لا يُشار إليها
-- عند إنشاء الغرفة يُنسَخ **نصُّ** كلّ كلمةٍ إلى `guess_word_words`، ويبقى
-- `source_word_id` أثرًا يُقرأ. فتصحيحُ كلمةٍ في البنك غدًا لا يغيّر ما لُعِب أمس،
-- وحذفُها لا يفرّغ غرفةً منتهية. (سابقةُ لقطة شهادة الخبرة: الوثيقةُ تحفظ حالَها
-- ساعةَ صدورها، لا حالَ مصدرِها اليوم.)
--
-- ## والإيقافُ على الجولة لا على الغرفة — عمدًا
-- `guess_word_sessions.status` محروسٌ بقيدِ فحصٍ ثلاثيّ (waiting/active/finished)،
-- وإضافةُ `paused` إليه تعني توسيعَ القيد وتبديلَ مفرداتٍ يقرؤها الكودُ في مواضع.
-- والوقفُ في حقيقته حالُ **الكلمة الجارية** لا حالُ الغرفة: الغرفةُ ما زالت جارية،
-- والناسُ فيها، والمقفَلُ حقلُ الإجابة وحده. فلا تُمَسّ مفرداتُ `status` أصلًا.

begin;

-- ═══ (١) بنكُ الكلمات ═══════════════════════════════════════════════════════
-- القدرةُ `manage_games` قائمةٌ في `permissions` منذ بناء اللعبة، فلا تُنشأ هنا.
create table if not exists public.guess_word_bank (
  id          uuid primary key default gen_random_uuid(),
  word        text not null check (length(btrim(word)) between 1 and 100),
  -- تلميحٌ يقرؤه **المضيفُ وحده** في مِقوَده: مرجعٌ يُعينه على الحكم حين يجيء
  -- الجوابُ بالمعنى لا بالحرف. ولا يبلغ اللاعبَ أبدًا (سياسةُ القراءة أدناه).
  hint        text check (hint is null or length(btrim(hint)) between 1 and 200),
  category    text not null default 'عامّة' check (length(btrim(category)) between 1 and 40),
  -- التعطيلُ لا الحذف: كلمةٌ لُعِب بها لها تاريخٌ في غرفٍ منتهية، وحذفُها يقطع أثرَها.
  active      boolean not null default true,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- التكرارُ داخل التصنيف الواحد عبثٌ، وعبرَ التصنيفات قد يكون قصدًا.
  unique (category, word)
);

-- السحبُ العشوائيّ والفرزُ بالتصنيف هما كلُّ ما يُسأل عنه هذا الجدول.
create index if not exists guess_word_bank_pick_idx
  on public.guess_word_bank (category, active) where active;

alter table public.guess_word_bank enable row level security;

-- **قراءةُ البنكِ لصاحب القدرة وحده.** ولها علّةٌ في اللعبة لا في السرّيّة: من قرأ
-- البنكَ عرف ما قد يجيء، فبطلت المفاجأةُ التي هي اللعبةُ كلُّها.
drop policy if exists gw_bank_read on public.guess_word_bank;
create policy gw_bank_read on public.guess_word_bank
  for select to authenticated
  using (public.check_user_permission((select auth.uid()), 'manage_games'));

-- والكتابةُ بالقدرة نفسِها، بعميل الجلسة لا بمفتاح الخدمة: هذه غرفةُ لوحةٍ لصاحب
-- حساب، فـ`auth.uid()` قائمٌ وRLS تحكم بطبعها (سابقةُ `tools/qr`).
drop policy if exists gw_bank_write on public.guess_word_bank;
create policy gw_bank_write on public.guess_word_bank
  for all to authenticated
  using (public.check_user_permission((select auth.uid()), 'manage_games'))
  with check (public.check_user_permission((select auth.uid()), 'manage_games'));

-- والمنحُ صريحٌ لا مفهوم: سياسةٌ سليمةٌ بلا امتيازٍ على الجدول تُردّ بـ403 قبل النظر
-- في الصفّ (درسُ `profiles`).
grant select, insert, update, delete on table public.guess_word_bank to authenticated;

create or replace function public.gw_bank_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists gw_bank_touch_trg on public.guess_word_bank;
create trigger gw_bank_touch_trg before update on public.guess_word_bank
  for each row execute function public.gw_bank_touch();

-- ═══ (٢) أعمدةُ الوقفِ والمصدر ══════════════════════════════════════════════
alter table public.guess_word_words
  add column if not exists paused_at     timestamptz,
  add column if not exists paused_ms     integer not null default 0 check (paused_ms >= 0),
  add column if not exists source_word_id uuid references public.guess_word_bank(id) on delete set null;

comment on column public.guess_word_words.paused_ms is
  'مجموعُ ما وقفت فيه الجولة. المنقضي = now() − started_at − paused_ms، فوقفةُ المضيف لا تأكل مهلةَ اللاعب.';
comment on column public.guess_word_words.source_word_id is
  'أثرُ المصدر: صفٌّ في البنك، أو null لكلمةٍ خاصّةٍ بهذه الغرفة. والنصُّ منسوخٌ لا مُشار إليه.';

-- ═══ (٣) العنوانُ يتفرّد بين الأحياء لا بين الأموات ═════════════════════════
-- كان `gw_create_session` يمنع أيَّ عنوانٍ سبق **في تاريخ الجدول كلِّه**. والنادي
-- يقيم «حفل قطوف» كلَّ فصل، فكان العنوانُ يُحرق باستعماله مرّةً واحدة. والقيدُ الصحيح:
-- لا غرفتان **جاريتان** بعنوانٍ واحد (كي لا يلتبسا على المضيف)، وأمّا المنتهيةُ فتاريخ.
create unique index if not exists guess_word_sessions_live_title_key
  on public.guess_word_sessions (lower(btrim(title)))
  where status <> 'finished';

-- ═══ (٤) الإنشاء: يسحب من البنك بثلاثة أوضاع ═══════════════════════════════
drop function if exists public.gw_create_session(text, text[], integer);

/**
 * `p_pick_mode`:
 *   'all'    ← كلُّ كلمات التصنيفات المختارة النشطة، بترتيبٍ عشوائيّ
 *   'chosen' ← ما أشّر عليه المضيف (`p_word_ids`)، بترتيب تأشيره
 *   'random' ← عددٌ (`p_pick_count`) يُسحَب عشوائيًّا من النشطات
 *
 * و`p_categories` فارغةً أو null تعني التصنيفاتِ كلَّها.
 * و`p_custom_words` كلماتٌ خاصّةٌ بهذه الغرفة تُلحَق بالمسحوب (`source_word_id` = null).
 *
 * **والسحبُ هنا لا في المتصفّح**: عشوائيّةُ المتصفّح تختار من قائمةٍ وصلته، أي أنّ
 * الكلماتِ كلَّها تكون قد غادرت الخادمَ قبل أوانها. وهذا نقضُ اللعبة من أصلها.
 */
create or replace function public.gw_create_session(
  p_title         text,
  p_time_per_word integer default 60,
  p_pick_mode     text    default 'random',
  p_categories    text[]  default null,
  p_word_ids      uuid[]  default null,
  p_pick_count    integer default 10,
  p_custom_words  text[]  default null
)
returns guess_word_sessions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session guess_word_sessions;
  v_title   text;
  v_code    text;
  v_count   integer;
begin
  if not gw_is_admin(auth.uid()) then
    raise exception 'GW_FORBIDDEN: تحتاج قدرةَ إدارة الألعاب';
  end if;

  v_title := btrim(regexp_replace(coalesce(p_title, ''), E'[\u200E\u200F\u202A-\u202E]', '', 'g'));
  if length(v_title) = 0 then
    raise exception 'GW_TITLE_REQUIRED: عنوانُ الغرفة مطلوب';
  end if;
  if length(v_title) > 100 then
    raise exception 'GW_TITLE_TOO_LONG: العنوان طويل (الحدّ مئةُ حرف)';
  end if;

  if p_pick_mode not in ('all', 'chosen', 'random') then
    raise exception 'GW_BAD_PICK_MODE';
  end if;
  if p_pick_mode = 'random' and coalesce(p_pick_count, 0) < 1 then
    raise exception 'GW_BAD_PICK_COUNT: العددُ واحدٌ فأكثر';
  end if;

  v_code := gw_generate_session_code();

  -- الفهرسُ الفريدُ على الأحياء هو الحارس؛ ويُترجَم عطلُه إلى عربيّةٍ يفهمها المضيف.
  begin
    insert into guess_word_sessions (code, title, time_per_word, created_by)
    values (v_code, v_title, p_time_per_word, auth.uid())
    returning * into v_session;
  exception when unique_violation then
    raise exception 'GW_TITLE_DUPLICATE: توجد غرفةٌ جاريةٌ بهذا العنوان';
  end;

  -- المسحوبُ من البنك. `row_number` يعطي المواضعَ متّصلةً مهما كان مصدرُ الترتيب.
  with picked as (
    select b.id, b.word,
           row_number() over (
             order by
               case when p_pick_mode = 'chosen'
                    then array_position(p_word_ids, b.id)
                    else null end nulls last,
               -- والعشوائيّةُ للوضعين الآخرين: المفاجأةُ جزءٌ من اللعبة.
               case when p_pick_mode = 'chosen' then 0 else random() end
           ) - 1 as pos
    from guess_word_bank b
    where b.active
      and (p_categories is null or cardinality(p_categories) = 0
           or b.category = any (p_categories))
      and (p_pick_mode <> 'chosen'
           or (p_word_ids is not null and b.id = any (p_word_ids)))
    limit case when p_pick_mode = 'random' then p_pick_count else null end
  )
  insert into guess_word_words (session_id, word, position, source_word_id)
  select v_session.id, picked.word, picked.pos, picked.id from picked;

  -- والخاصّةُ بالغرفة تلتحق بعد المسحوب، بترتيب كتابتها، ومنقّاةً من الفارغ والمكرَّر.
  with cleaned as (
    select distinct on (lower(btrim(w)))
           btrim(regexp_replace(w, E'[\u200E\u200F\u202A-\u202E]', '', 'g')) as word,
           ordinality
    from unnest(coalesce(p_custom_words, '{}'::text[])) with ordinality as t(w, ordinality)
    where length(btrim(w)) > 0
    order by lower(btrim(w)), ordinality
  ),
  base as (select coalesce(max(position), -1) as top from guess_word_words where session_id = v_session.id)
  insert into guess_word_words (session_id, word, position, source_word_id)
  select v_session.id,
         cleaned.word,
         base.top + row_number() over (order by cleaned.ordinality),
         null
  from cleaned, base
  -- ولا تُضاف خاصّةٌ تطابق ما سُحِب: كلمةٌ مرّتين في غرفةٍ واحدةٍ خطأٌ لا خيار.
  where not exists (
    select 1 from guess_word_words gw
    where gw.session_id = v_session.id and lower(gw.word) = lower(cleaned.word)
  );

  select count(*) into v_count from guess_word_words where session_id = v_session.id;

  if v_count = 0 then
    raise exception 'GW_NO_WORDS: لم تُختَر كلمةٌ واحدة';
  end if;
  if v_count > 200 then
    raise exception 'GW_TOO_MANY_WORDS: الحدُّ الأقصى مئتا كلمة';
  end if;

  return v_session;
end;
$$;

revoke all on function public.gw_create_session(text, integer, text, text[], uuid[], integer, text[])
  from public, anon;
grant execute on function public.gw_create_session(text, integer, text, text[], uuid[], integer, text[])
  to authenticated;

-- ═══ (٥) بدءُ جولةٍ بعينها ══════════════════════════════════════════════════
-- `gw_start_next_round` تفترض التاليةَ حتمًا، وتُنهي اللعبةَ من نفسها حين تنفد الكلمات.
-- والمضيفُ يريد أن **يختار**: يقفز كلمةً لا تناسب الحضور، ويعود إلى أخرى. فتُسقَط
-- ويحلّ محلَّها فعلٌ يُسمّي جولتَه. والإنهاءُ يبقى فعلًا صريحًا (`gw_close_session`):
-- لعبةٌ تنتهي من تلقائها تسلب المضيفَ ختامَه.
drop function if exists public.gw_start_next_round(uuid);

create or replace function public.gw_start_round(p_session_id uuid, p_word_id uuid)
returns guess_word_words
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session guess_word_sessions;
  v_word    guess_word_words;
  v_now     timestamptz := now();
begin
  if not gw_is_admin(auth.uid()) then
    raise exception 'GW_FORBIDDEN';
  end if;

  select * into v_session from guess_word_sessions where id = p_session_id for update;
  if not found then raise exception 'GW_SESSION_NOT_FOUND'; end if;
  if v_session.status = 'finished' then
    raise exception 'GW_SESSION_FINISHED: انتهت هذه اللعبة';
  end if;

  select * into v_word from guess_word_words
  where id = p_word_id and session_id = p_session_id for update;
  if not found then raise exception 'GW_WORD_NOT_IN_SESSION'; end if;

  -- جولةٌ لُعِبت لا تُبدأ ثانيةً بالخطأ: فيها إجاباتٌ وربّما فائزٌ ونقطة. من أرادها
  -- من جديدٍ فليقل «أعِد» صراحةً — والمحوُ يُطلَب ولا يقع عرَضًا.
  if exists (select 1 from guess_word_answers where word_id = v_word.id)
     or v_word.winner_player_id is not null then
    raise exception 'GW_ROUND_PLAYED: لُعِبت هذه الجولة، أعِدها أوّلًا';
  end if;

  -- الجاريةُ تُغلَق قبل أن تُفتَح غيرُها: كلمتان مفتوحتان معًا حالٌ لا معنى لها.
  if v_session.current_word_id is not null and v_session.current_word_id <> v_word.id then
    update guess_word_words set ended_at = v_now, paused_at = null
    where id = v_session.current_word_id and ended_at is null;
  end if;

  update guess_word_words
  set started_at = v_now, ended_at = null, paused_at = null, paused_ms = 0
  where id = v_word.id
  returning * into v_word;

  update guess_word_sessions
  set status = 'active',
      current_word_id = v_word.id,
      started_at = coalesce(v_session.started_at, v_now)
  where id = p_session_id;

  return v_word;
end;
$$;

revoke all on function public.gw_start_round(uuid, uuid) from public, anon;
grant execute on function public.gw_start_round(uuid, uuid) to authenticated;

-- ═══ (٦) الوقفُ والاستئناف ══════════════════════════════════════════════════
create or replace function public.gw_pause_round(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_word guess_word_words;
begin
  if not gw_is_admin(auth.uid()) then raise exception 'GW_FORBIDDEN'; end if;

  select w.* into v_word from guess_word_words w
  join guess_word_sessions s on s.current_word_id = w.id
  where s.id = p_session_id for update of w;

  if not found or v_word.started_at is null or v_word.ended_at is not null then
    raise exception 'GW_NO_ACTIVE_ROUND: لا جولةَ جارية';
  end if;
  -- الوقفُ مرّتين لا يُخطئ ولا يفعل: الطلبُ مُجاب سلفًا.
  if v_word.paused_at is not null then return; end if;

  update guess_word_words set paused_at = now() where id = v_word.id;
end;
$$;

create or replace function public.gw_resume_round(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_word guess_word_words;
begin
  if not gw_is_admin(auth.uid()) then raise exception 'GW_FORBIDDEN'; end if;

  select w.* into v_word from guess_word_words w
  join guess_word_sessions s on s.current_word_id = w.id
  where s.id = p_session_id for update of w;

  if not found or v_word.paused_at is null then return; end if;

  -- ما وقفته الجولةُ يُضاف إلى رصيدها، فتستأنف من حيث وقفت لا من الصفر.
  update guess_word_words
  set paused_ms = paused_ms + (extract(epoch from (now() - paused_at)) * 1000)::integer,
      paused_at = null
  where id = v_word.id;
end;
$$;

-- ═══ (٧) الإعادة — فعلٌ يمحو ════════════════════════════════════════════════
-- يُلبِس الجولةَ حالَها قبل أن تبدأ: تُحذَف إجاباتُها، ويُنقَض فائزُها ونقطتُه،
-- وتُصفَّر أزمنتُها. والشاشةُ تُصرّح بذلك في نافذة تأكيدٍ قبل النداء — المحوُ الصامت
-- يُكتشَف بعد فوات الأوان.
create or replace function public.gw_replay_round(p_word_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_word guess_word_words;
begin
  if not gw_is_admin(auth.uid()) then raise exception 'GW_FORBIDDEN'; end if;

  select * into v_word from guess_word_words where id = p_word_id for update;
  if not found then raise exception 'GW_WORD_NOT_FOUND'; end if;

  if v_word.winner_player_id is not null then
    update guess_word_players set score = greatest(score - 1, 0)
    where id = v_word.winner_player_id;
  end if;

  delete from guess_word_answers where word_id = v_word.id;

  update guess_word_words
  set started_at = null, ended_at = null, paused_at = null, paused_ms = 0,
      winner_player_id = null
  where id = v_word.id;

  -- كانت هي الجارية، فتعود الغرفةُ بلا كلمةٍ مفتوحة.
  update guess_word_sessions set current_word_id = null
  where id = v_word.session_id and current_word_id = v_word.id;
end;
$$;

-- ═══ (٨) الإرجاع — إخراجُ لاعبٍ ليس حذفَه ═══════════════════════════════════
-- النقاطُ والإجاباتُ لم تُمَسّ ساعةَ الإخراج، فالإرجاعُ يعيده **كما كان** بنصّ الطلب.
create or replace function public.gw_restore_player(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not gw_is_admin(auth.uid()) then raise exception 'GW_FORBIDDEN'; end if;
  update guess_word_players set is_kicked = false where id = p_player_id;
end;
$$;

revoke all on function public.gw_pause_round(uuid)    from public, anon;
revoke all on function public.gw_resume_round(uuid)   from public, anon;
revoke all on function public.gw_replay_round(uuid)   from public, anon;
revoke all on function public.gw_restore_player(uuid) from public, anon;

grant execute on function public.gw_pause_round(uuid)    to authenticated;
grant execute on function public.gw_resume_round(uuid)   to authenticated;
grant execute on function public.gw_replay_round(uuid)   to authenticated;
grant execute on function public.gw_restore_player(uuid) to authenticated;

-- ═══ (٩) اللاعبُ يرى المُخرَجين كي يعلم أنّه أُخرِج ═════════════════════════
-- كانت السياسةُ تُخفي الصفَّ المُخرَج عن `anon` كلَّه، فمن أُخرِج اختفى صفُّه من
-- تحته: شاشتُه تقول «لم تنضمّ» لا «أُخرِجت»، ونداءُ الحالِ يرجع فارغًا. والإخفاءُ
-- لا يحمي شيئًا (الصفُّ اسمٌ ونقاط)، ويمنع رسالةً يحتاجها صاحبُها. فتُفتَح القراءةُ،
-- وإخفاءُ المُخرَجين عن **لوح النتائج** يقع في الشاشة حيث موضعُه.
drop policy if exists gw_players_select on public.guess_word_players;
create policy gw_players_select on public.guess_word_players
  for select to anon, authenticated using (true);

commit;
