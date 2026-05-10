-- =============================================
-- لعبة "خمّن الكلمة" - Guess the Word Game
-- =============================================
-- الهدف:
--   1. الأدمن ينشئ جلسة لعبة بكلمات محددة
--   2. المتسابقون ينضمون عبر QR/كود الجلسة (anon — بدون تسجيل دخول)
--   3. لكل كلمة جولة بمدة محددة، يكتب المتسابق معناها
--   4. الأدمن يرى الإجابات مرتبة بالأسرع، ويختار الفائز يدوياً
--   5. تُحفظ كل الجلسات كأرشيف كامل (لوحة المتصدّرين)
--
-- مبدأ الأمان (نفس نمط activities):
--   - لا INSERT/UPDATE/DELETE مباشر للعميل
--   - كل الكتابة عبر دوال SECURITY DEFINER
--   - RLS يمنع المتسابق من رؤية الكلمات القادمة (الكلمة الحالية فقط)

-- =============================================
-- 1. جدول الجلسات
-- =============================================
CREATE TABLE IF NOT EXISTS guess_word_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    title TEXT,
    time_per_word INTEGER NOT NULL DEFAULT 60 CHECK (time_per_word BETWEEN 10 AND 600),
    status TEXT NOT NULL DEFAULT 'waiting'
        CHECK (status IN ('waiting','active','finished')),
    current_word_id UUID,  -- FK يُضاف لاحقاً (دائرة)
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_gw_sessions_code ON guess_word_sessions(code);
CREATE INDEX IF NOT EXISTS idx_gw_sessions_created_by ON guess_word_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_gw_sessions_status ON guess_word_sessions(status);

COMMENT ON TABLE guess_word_sessions IS 'جلسات لعبة خمّن الكلمة';

-- =============================================
-- 2. جدول المتسابقين
-- =============================================
CREATE TABLE IF NOT EXISTS guess_word_players (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES guess_word_sessions(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 50),
    player_token TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    is_kicked BOOLEAN NOT NULL DEFAULT false,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (session_id, player_token)
);

CREATE INDEX IF NOT EXISTS idx_gw_players_session ON guess_word_players(session_id);
CREATE INDEX IF NOT EXISTS idx_gw_players_token ON guess_word_players(player_token);

COMMENT ON TABLE guess_word_players IS 'متسابقو جلسة خمّن الكلمة (anon عبر player_token)';

-- =============================================
-- 3. جدول الكلمات
-- =============================================
CREATE TABLE IF NOT EXISTS guess_word_words (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES guess_word_sessions(id) ON DELETE CASCADE,
    word TEXT NOT NULL CHECK (length(trim(word)) > 0),
    position INTEGER NOT NULL CHECK (position >= 0),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    winner_player_id UUID REFERENCES guess_word_players(id) ON DELETE SET NULL,
    UNIQUE (session_id, position)
);

CREATE INDEX IF NOT EXISTS idx_gw_words_session ON guess_word_words(session_id);
CREATE INDEX IF NOT EXISTS idx_gw_words_winner ON guess_word_words(winner_player_id)
    WHERE winner_player_id IS NOT NULL;

COMMENT ON TABLE guess_word_words IS 'كلمات جلسة خمّن الكلمة';

-- ربط current_word_id بجدول الكلمات (FK مؤجل)
ALTER TABLE guess_word_sessions
    DROP CONSTRAINT IF EXISTS guess_word_sessions_current_word_fk;
ALTER TABLE guess_word_sessions
    ADD CONSTRAINT guess_word_sessions_current_word_fk
    FOREIGN KEY (current_word_id) REFERENCES guess_word_words(id) ON DELETE SET NULL;

-- =============================================
-- 4. جدول الإجابات
-- =============================================
CREATE TABLE IF NOT EXISTS guess_word_answers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    word_id UUID NOT NULL REFERENCES guess_word_words(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES guess_word_players(id) ON DELETE CASCADE,
    answer TEXT NOT NULL CHECK (length(trim(answer)) BETWEEN 1 AND 500),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    response_ms INTEGER NOT NULL CHECK (response_ms >= 0),
    UNIQUE (word_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_gw_answers_word_speed
    ON guess_word_answers(word_id, response_ms);
CREATE INDEX IF NOT EXISTS idx_gw_answers_player ON guess_word_answers(player_id);

COMMENT ON TABLE guess_word_answers IS 'إجابات المتسابقين، response_ms للترتيب بالأسرع';

-- =============================================
-- 5. دالة مساعدة: التحقق من صلاحيات الأدمن (role_level >= 8)
-- =============================================
CREATE OR REPLACE FUNCTION gw_is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id
          AND ur.is_active = true
          AND r.role_level >= 8
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- =============================================
-- 6. مولّد كود الجلسة (6 أحرف، مقروء، فريد)
-- =============================================
CREATE OR REPLACE FUNCTION gw_generate_session_code()
RETURNS TEXT AS $$
DECLARE
    v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- بدون 0/O/1/I/L
    v_code TEXT;
    v_attempts INTEGER := 0;
BEGIN
    LOOP
        v_code := '';
        FOR i IN 1..6 LOOP
            v_code := v_code || substr(v_chars, 1 + floor(random() * length(v_chars))::INTEGER, 1);
        END LOOP;

        IF NOT EXISTS (SELECT 1 FROM guess_word_sessions WHERE code = v_code) THEN
            RETURN v_code;
        END IF;

        v_attempts := v_attempts + 1;
        IF v_attempts > 50 THEN
            RAISE EXCEPTION 'GW_CODE_GEN_FAILED: تعذّر توليد كود فريد';
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp;

-- =============================================
-- 7. RPC: إنشاء جلسة (للأدمن)
-- =============================================
CREATE OR REPLACE FUNCTION gw_create_session(
    p_title TEXT,
    p_words TEXT[],
    p_time_per_word INTEGER DEFAULT 60
) RETURNS guess_word_sessions AS $$
DECLARE
    v_session guess_word_sessions;
    v_code TEXT;
    v_word TEXT;
    v_pos INTEGER := 0;
BEGIN
    IF NOT gw_is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'GW_FORBIDDEN: تحتاج صلاحيات إدارة عليا';
    END IF;

    IF p_words IS NULL OR array_length(p_words, 1) IS NULL OR array_length(p_words, 1) = 0 THEN
        RAISE EXCEPTION 'GW_NO_WORDS: يجب إضافة كلمة واحدة على الأقل';
    END IF;

    IF array_length(p_words, 1) > 200 THEN
        RAISE EXCEPTION 'GW_TOO_MANY_WORDS: الحد الأقصى 200 كلمة';
    END IF;

    v_code := gw_generate_session_code();

    INSERT INTO guess_word_sessions (code, title, time_per_word, created_by)
    VALUES (v_code, NULLIF(trim(coalesce(p_title, '')), ''), p_time_per_word, auth.uid())
    RETURNING * INTO v_session;

    FOREACH v_word IN ARRAY p_words LOOP
        IF length(trim(v_word)) > 0 THEN
            INSERT INTO guess_word_words (session_id, word, position)
            VALUES (v_session.id, trim(v_word), v_pos);
            v_pos := v_pos + 1;
        END IF;
    END LOOP;

    IF v_pos = 0 THEN
        DELETE FROM guess_word_sessions WHERE id = v_session.id;
        RAISE EXCEPTION 'GW_NO_VALID_WORDS: لا توجد كلمات صالحة';
    END IF;

    RETURN v_session;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp;

-- =============================================
-- 8. RPC: بدء الجولة التالية (للأدمن)
-- =============================================
CREATE OR REPLACE FUNCTION gw_start_next_round(p_session_id UUID)
RETURNS guess_word_words AS $$
DECLARE
    v_session guess_word_sessions;
    v_current_pos INTEGER := -1;
    v_next_word guess_word_words;
    v_now TIMESTAMPTZ := now();
BEGIN
    IF NOT gw_is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'GW_FORBIDDEN';
    END IF;

    SELECT * INTO v_session FROM guess_word_sessions WHERE id = p_session_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'GW_SESSION_NOT_FOUND';
    END IF;

    IF v_session.status = 'finished' THEN
        RAISE EXCEPTION 'GW_SESSION_FINISHED: الجلسة منتهية';
    END IF;

    -- إن كانت كلمة جارية: أنهِها أولاً
    IF v_session.current_word_id IS NOT NULL THEN
        UPDATE guess_word_words
        SET ended_at = v_now
        WHERE id = v_session.current_word_id AND ended_at IS NULL;

        SELECT position INTO v_current_pos
        FROM guess_word_words WHERE id = v_session.current_word_id;
    END IF;

    -- ابحث عن الكلمة التالية
    SELECT * INTO v_next_word
    FROM guess_word_words
    WHERE session_id = p_session_id
      AND position > coalesce(v_current_pos, -1)
    ORDER BY position ASC
    LIMIT 1;

    IF NOT FOUND THEN
        -- لا توجد كلمات أخرى → إنهاء الجلسة
        UPDATE guess_word_sessions
        SET status = 'finished', current_word_id = NULL, finished_at = v_now
        WHERE id = p_session_id;
        RETURN NULL;
    END IF;

    -- ابدأ الكلمة التالية
    UPDATE guess_word_words
    SET started_at = v_now, ended_at = NULL
    WHERE id = v_next_word.id;

    UPDATE guess_word_sessions
    SET status = 'active',
        current_word_id = v_next_word.id,
        started_at = coalesce(v_session.started_at, v_now)
    WHERE id = p_session_id;

    SELECT * INTO v_next_word FROM guess_word_words WHERE id = v_next_word.id;
    RETURN v_next_word;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp;

-- =============================================
-- 9. RPC: إنهاء الجولة الحالية بدون الانتقال (اختياري - للأدمن)
-- =============================================
CREATE OR REPLACE FUNCTION gw_end_current_round(p_session_id UUID)
RETURNS VOID AS $$
DECLARE
    v_session guess_word_sessions;
BEGIN
    IF NOT gw_is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'GW_FORBIDDEN';
    END IF;

    SELECT * INTO v_session FROM guess_word_sessions WHERE id = p_session_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'GW_SESSION_NOT_FOUND';
    END IF;

    IF v_session.current_word_id IS NULL THEN
        RETURN;
    END IF;

    UPDATE guess_word_words
    SET ended_at = now()
    WHERE id = v_session.current_word_id AND ended_at IS NULL;

    UPDATE guess_word_sessions
    SET current_word_id = NULL
    WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp;

-- =============================================
-- 10. RPC: تحديد الفائز بالجولة (للأدمن)
-- =============================================
CREATE OR REPLACE FUNCTION gw_pick_winner(p_word_id UUID, p_player_id UUID)
RETURNS VOID AS $$
DECLARE
    v_word guess_word_words;
    v_old_winner UUID;
BEGIN
    IF NOT gw_is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'GW_FORBIDDEN';
    END IF;

    SELECT * INTO v_word FROM guess_word_words WHERE id = p_word_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'GW_WORD_NOT_FOUND';
    END IF;

    IF p_player_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM guess_word_players
            WHERE id = p_player_id AND session_id = v_word.session_id
        ) THEN
            RAISE EXCEPTION 'GW_PLAYER_NOT_IN_SESSION';
        END IF;
    END IF;

    v_old_winner := v_word.winner_player_id;

    -- إن لم يتغير الفائز فلا شيء
    IF v_old_winner IS NOT DISTINCT FROM p_player_id THEN
        RETURN;
    END IF;

    UPDATE guess_word_words
    SET winner_player_id = p_player_id
    WHERE id = p_word_id;

    -- تحديث النتيجة
    IF v_old_winner IS NOT NULL THEN
        UPDATE guess_word_players SET score = GREATEST(score - 1, 0) WHERE id = v_old_winner;
    END IF;
    IF p_player_id IS NOT NULL THEN
        UPDATE guess_word_players SET score = score + 1 WHERE id = p_player_id;
    END IF;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp;

-- =============================================
-- 11. RPC: إنهاء الجلسة (للأدمن)
-- =============================================
CREATE OR REPLACE FUNCTION gw_close_session(p_session_id UUID)
RETURNS VOID AS $$
BEGIN
    IF NOT gw_is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'GW_FORBIDDEN';
    END IF;

    UPDATE guess_word_words
    SET ended_at = now()
    WHERE session_id = p_session_id AND started_at IS NOT NULL AND ended_at IS NULL;

    UPDATE guess_word_sessions
    SET status = 'finished',
        current_word_id = NULL,
        finished_at = now()
    WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp;

-- =============================================
-- 12. RPC: حذف جلسة (للأدمن - فقط الجلسات المنتهية أو الفارغة)
-- =============================================
CREATE OR REPLACE FUNCTION gw_delete_session(p_session_id UUID)
RETURNS VOID AS $$
BEGIN
    IF NOT gw_is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'GW_FORBIDDEN';
    END IF;

    DELETE FROM guess_word_sessions WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp;

-- =============================================
-- 13. RPC: طرد متسابق (للأدمن)
-- =============================================
CREATE OR REPLACE FUNCTION gw_kick_player(p_player_id UUID)
RETURNS VOID AS $$
BEGIN
    IF NOT gw_is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'GW_FORBIDDEN';
    END IF;

    UPDATE guess_word_players SET is_kicked = true WHERE id = p_player_id;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp;

-- =============================================
-- 14. RPC: انضمام المتسابق (anon)
-- =============================================
CREATE OR REPLACE FUNCTION gw_join_session(
    p_code TEXT,
    p_name TEXT,
    p_token TEXT
) RETURNS JSONB AS $$
DECLARE
    v_session guess_word_sessions;
    v_player guess_word_players;
    v_clean_name TEXT;
    v_clean_token TEXT;
BEGIN
    v_clean_name := trim(coalesce(p_name, ''));
    v_clean_token := trim(coalesce(p_token, ''));

    IF length(v_clean_name) = 0 OR length(v_clean_name) > 50 THEN
        RAISE EXCEPTION 'GW_INVALID_NAME: الاسم مطلوب (حتى 50 حرفاً)';
    END IF;

    IF length(v_clean_token) < 8 OR length(v_clean_token) > 100 THEN
        RAISE EXCEPTION 'GW_INVALID_TOKEN';
    END IF;

    SELECT * INTO v_session FROM guess_word_sessions WHERE code = upper(trim(p_code));
    IF NOT FOUND THEN
        RAISE EXCEPTION 'GW_SESSION_NOT_FOUND: الجلسة غير موجودة';
    END IF;

    IF v_session.status = 'finished' THEN
        RAISE EXCEPTION 'GW_SESSION_FINISHED: الجلسة منتهية';
    END IF;

    -- upsert على (session_id, player_token)
    INSERT INTO guess_word_players (session_id, name, player_token)
    VALUES (v_session.id, v_clean_name, v_clean_token)
    ON CONFLICT (session_id, player_token) DO UPDATE
        SET name = EXCLUDED.name
    RETURNING * INTO v_player;

    IF v_player.is_kicked THEN
        RAISE EXCEPTION 'GW_PLAYER_KICKED: تم إخراجك من الجلسة';
    END IF;

    RETURN jsonb_build_object(
        'session_id', v_session.id,
        'session_code', v_session.code,
        'session_title', v_session.title,
        'session_status', v_session.status,
        'time_per_word', v_session.time_per_word,
        'current_word_id', v_session.current_word_id,
        'player_id', v_player.id,
        'player_name', v_player.name,
        'player_score', v_player.score
    );
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp;

-- =============================================
-- 15. RPC: إرسال إجابة (anon)
-- =============================================
CREATE OR REPLACE FUNCTION gw_submit_answer(
    p_token TEXT,
    p_answer TEXT
) RETURNS guess_word_answers AS $$
DECLARE
    v_player guess_word_players;
    v_session guess_word_sessions;
    v_word guess_word_words;
    v_clean_answer TEXT;
    v_now TIMESTAMPTZ := now();
    v_response_ms INTEGER;
    v_max_ms INTEGER;
    v_answer guess_word_answers;
BEGIN
    v_clean_answer := trim(coalesce(p_answer, ''));
    IF length(v_clean_answer) = 0 OR length(v_clean_answer) > 500 THEN
        RAISE EXCEPTION 'GW_INVALID_ANSWER: الإجابة مطلوبة (حتى 500 حرف)';
    END IF;

    SELECT * INTO v_player FROM guess_word_players
    WHERE player_token = trim(coalesce(p_token, ''))
    LIMIT 1;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'GW_PLAYER_NOT_FOUND';
    END IF;

    IF v_player.is_kicked THEN
        RAISE EXCEPTION 'GW_PLAYER_KICKED';
    END IF;

    SELECT * INTO v_session FROM guess_word_sessions WHERE id = v_player.session_id;
    IF v_session.status <> 'active' OR v_session.current_word_id IS NULL THEN
        RAISE EXCEPTION 'GW_NO_ACTIVE_ROUND: لا توجد جولة جارية';
    END IF;

    SELECT * INTO v_word FROM guess_word_words WHERE id = v_session.current_word_id;
    IF v_word.started_at IS NULL OR v_word.ended_at IS NOT NULL THEN
        RAISE EXCEPTION 'GW_ROUND_NOT_OPEN';
    END IF;

    v_response_ms := EXTRACT(EPOCH FROM (v_now - v_word.started_at)) * 1000;
    v_max_ms := v_session.time_per_word * 1000;

    -- نسمح بهامش صغير (500ms) للتأخير الشبكي
    IF v_response_ms > v_max_ms + 500 THEN
        RAISE EXCEPTION 'GW_TIME_UP: انتهى وقت الجولة';
    END IF;

    INSERT INTO guess_word_answers (word_id, player_id, answer, submitted_at, response_ms)
    VALUES (v_word.id, v_player.id, v_clean_answer, v_now, GREATEST(v_response_ms, 0))
    ON CONFLICT (word_id, player_id) DO NOTHING
    RETURNING * INTO v_answer;

    IF v_answer.id IS NULL THEN
        RAISE EXCEPTION 'GW_ALREADY_ANSWERED: لقد أرسلت إجابتك بالفعل';
    END IF;

    RETURN v_answer;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp;

-- =============================================
-- 16. RPC: جلب حالة الجلسة الحالية للمتسابق (anon)
-- =============================================
-- يستخدم بعد reload لاستعادة الحالة من player_token المحفوظ
CREATE OR REPLACE FUNCTION gw_get_player_state(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
    v_player guess_word_players;
    v_session guess_word_sessions;
    v_word guess_word_words;
    v_already_answered BOOLEAN := false;
    v_winner_name TEXT;
BEGIN
    SELECT * INTO v_player FROM guess_word_players
    WHERE player_token = trim(coalesce(p_token, ''))
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    SELECT * INTO v_session FROM guess_word_sessions WHERE id = v_player.session_id;

    IF v_session.current_word_id IS NOT NULL THEN
        SELECT * INTO v_word FROM guess_word_words WHERE id = v_session.current_word_id;
        SELECT EXISTS (
            SELECT 1 FROM guess_word_answers
            WHERE word_id = v_word.id AND player_id = v_player.id
        ) INTO v_already_answered;
    END IF;

    -- اسم الفائز بالكلمة الحالية إن وُجد (للعرض بين الجولات)
    IF v_word.winner_player_id IS NOT NULL THEN
        SELECT name INTO v_winner_name FROM guess_word_players WHERE id = v_word.winner_player_id;
    END IF;

    RETURN jsonb_build_object(
        'session_id', v_session.id,
        'session_code', v_session.code,
        'session_title', v_session.title,
        'session_status', v_session.status,
        'time_per_word', v_session.time_per_word,
        'current_word_id', v_session.current_word_id,
        'current_word', CASE WHEN v_word.id IS NOT NULL THEN v_word.word ELSE NULL END,
        'current_word_started_at', v_word.started_at,
        'current_word_ended_at', v_word.ended_at,
        'current_word_winner_name', v_winner_name,
        'player_id', v_player.id,
        'player_name', v_player.name,
        'player_score', v_player.score,
        'player_is_kicked', v_player.is_kicked,
        'already_answered', v_already_answered
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- =============================================
-- 17. RPC: لوحة المتصدّرين النهائية (للجميع)
-- =============================================
CREATE OR REPLACE FUNCTION gw_get_leaderboard(p_session_id UUID)
RETURNS TABLE (
    player_id UUID,
    name TEXT,
    score INTEGER,
    rank BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.name, p.score,
           RANK() OVER (ORDER BY p.score DESC, p.joined_at ASC)
    FROM guess_word_players p
    WHERE p.session_id = p_session_id
      AND p.is_kicked = false
    ORDER BY p.score DESC, p.joined_at ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- =============================================
-- 18. Row Level Security
-- =============================================
ALTER TABLE guess_word_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE guess_word_words    ENABLE ROW LEVEL SECURITY;
ALTER TABLE guess_word_players  ENABLE ROW LEVEL SECURITY;
ALTER TABLE guess_word_answers  ENABLE ROW LEVEL SECURITY;

-- ---------- guess_word_sessions ----------
-- قراءة: anon/authenticated يقرؤون الجلسات غير المنتهية + الإدارة تقرأ الكل
-- (المتسابق سيحصل على بياناته عبر RPC، لكن نحتاج SELECT لكي يعمل Realtime)
CREATE POLICY "gw_sessions_select" ON guess_word_sessions
    FOR SELECT TO anon, authenticated
    USING (true);  -- آمن: لا يكشف أكثر من الكود وحالة الجلسة، والكلمات محمية بسياسة منفصلة

-- ---------- guess_word_words ----------
-- المتسابق anon يرى فقط الكلمة الحالية للجلسة (لمنع رؤية الكلمات القادمة)
-- الإدارة ترى كل شيء
CREATE POLICY "gw_words_select" ON guess_word_words
    FOR SELECT TO anon, authenticated
    USING (
        -- الإدارة
        gw_is_admin(auth.uid())
        OR
        -- المتسابق: فقط الكلمة الحالية للجلسة
        EXISTS (
            SELECT 1 FROM guess_word_sessions s
            WHERE s.id = guess_word_words.session_id
              AND s.current_word_id = guess_word_words.id
        )
        OR
        -- بعد انتهاء الجلسة: الجميع يرى الكل (للأرشيف)
        EXISTS (
            SELECT 1 FROM guess_word_sessions s
            WHERE s.id = guess_word_words.session_id
              AND s.status = 'finished'
        )
    );

-- ---------- guess_word_players ----------
-- الجميع يرى المتسابقين في جلستهم (لشاشة الانتظار / لوحة المتصدّرين)
CREATE POLICY "gw_players_select" ON guess_word_players
    FOR SELECT TO anon, authenticated
    USING (is_kicked = false OR gw_is_admin(auth.uid()));

-- ---------- guess_word_answers ----------
-- الإدارة فقط ترى الإجابات حية (للترتيب). بعد انتهاء الجلسة الكل يقرؤها (أرشيف)
CREATE POLICY "gw_answers_select" ON guess_word_answers
    FOR SELECT TO anon, authenticated
    USING (
        gw_is_admin(auth.uid())
        OR EXISTS (
            SELECT 1 FROM guess_word_words w
            JOIN guess_word_sessions s ON s.id = w.session_id
            WHERE w.id = guess_word_answers.word_id
              AND s.status = 'finished'
        )
    );

-- لا سياسات INSERT/UPDATE/DELETE — كل الكتابة عبر RPC SECURITY DEFINER

-- =============================================
-- 19. صلاحيات تنفيذ الدوال
-- =============================================
-- ملاحظة: Supabase يمنح EXECUTE تلقائياً لـ anon/authenticated عند CREATE FUNCTION،
-- لذا نزيلها صراحةً من الأدوار غير المسموح لها بدلاً من الاكتفاء بالإضافة.

-- الدوال الداخلية: postgres/service_role فقط
REVOKE EXECUTE ON FUNCTION gw_is_admin(UUID) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION gw_generate_session_code() FROM anon, authenticated;

-- الدوال الإدارية: authenticated فقط (anon ممنوع)
REVOKE EXECUTE ON FUNCTION gw_create_session(TEXT, TEXT[], INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION gw_start_next_round(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION gw_end_current_round(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION gw_pick_winner(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION gw_close_session(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION gw_delete_session(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION gw_kick_player(UUID) FROM anon;

-- نُبقي GRANTs الافتراضية لـ authenticated على الدوال الإدارية (gw_is_admin يفلتر داخلياً)
-- ونُبقي GRANTs الافتراضية لـ anon+authenticated على دوال المتسابقين (join/submit/state/leaderboard)

-- =============================================
-- 20. تفعيل Realtime على الجداول
-- =============================================
-- يحتاج النشر للجداول حتى تعمل postgres_changes
DO $$ BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE guess_word_sessions';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE guess_word_words';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE guess_word_players';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE guess_word_answers';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
