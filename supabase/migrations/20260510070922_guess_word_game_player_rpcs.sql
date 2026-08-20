-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260510070922   الاسم: guess_word_game_player_rpcs

-- 14. RPC: انضمام المتسابق (anon)
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

-- 15. RPC: إرسال إجابة (anon)
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

-- 16. RPC: جلب حالة المتسابق
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

-- 17. RPC: لوحة المتصدّرين
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
