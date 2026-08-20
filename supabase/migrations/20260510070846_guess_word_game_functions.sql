-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260510070846   الاسم: guess_word_game_functions

-- 5. دالة مساعدة: التحقق من صلاحيات الأدمن
CREATE OR REPLACE FUNCTION gw_is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_user_id IS NULL THEN
        RETURN false;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id
          AND ur.is_active = true
          AND r.role_level >= 8
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- 6. مولّد كود الجلسة
CREATE OR REPLACE FUNCTION gw_generate_session_code()
RETURNS TEXT AS $$
DECLARE
    v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
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

-- 7. RPC: إنشاء جلسة
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

-- 8. RPC: بدء الجولة التالية
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

    IF v_session.current_word_id IS NOT NULL THEN
        UPDATE guess_word_words
        SET ended_at = v_now
        WHERE id = v_session.current_word_id AND ended_at IS NULL;

        SELECT position INTO v_current_pos
        FROM guess_word_words WHERE id = v_session.current_word_id;
    END IF;

    SELECT * INTO v_next_word
    FROM guess_word_words
    WHERE session_id = p_session_id
      AND position > coalesce(v_current_pos, -1)
    ORDER BY position ASC
    LIMIT 1;

    IF NOT FOUND THEN
        UPDATE guess_word_sessions
        SET status = 'finished', current_word_id = NULL, finished_at = v_now
        WHERE id = p_session_id;
        RETURN NULL;
    END IF;

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

-- 9. RPC: إنهاء الجولة الحالية
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

-- 10. RPC: تحديد الفائز
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

    IF v_old_winner IS NOT DISTINCT FROM p_player_id THEN
        RETURN;
    END IF;

    UPDATE guess_word_words
    SET winner_player_id = p_player_id
    WHERE id = p_word_id;

    IF v_old_winner IS NOT NULL THEN
        UPDATE guess_word_players SET score = GREATEST(score - 1, 0) WHERE id = v_old_winner;
    END IF;
    IF p_player_id IS NOT NULL THEN
        UPDATE guess_word_players SET score = score + 1 WHERE id = p_player_id;
    END IF;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp;

-- 11. RPC: إنهاء الجلسة
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

-- 12. RPC: حذف جلسة
CREATE OR REPLACE FUNCTION gw_delete_session(p_session_id UUID)
RETURNS VOID AS $$
BEGIN
    IF NOT gw_is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'GW_FORBIDDEN';
    END IF;

    DELETE FROM guess_word_sessions WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp;

-- 13. RPC: طرد متسابق
CREATE OR REPLACE FUNCTION gw_kick_player(p_player_id UUID)
RETURNS VOID AS $$
BEGIN
    IF NOT gw_is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'GW_FORBIDDEN';
    END IF;

    UPDATE guess_word_players SET is_kicked = true WHERE id = p_player_id;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp;
