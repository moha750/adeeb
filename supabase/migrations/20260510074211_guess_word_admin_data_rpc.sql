-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260510074211   الاسم: guess_word_admin_data_rpc

-- RPC واحد يجمع كل بيانات الجلسة للأدمن (يتجاوز RLS بشكل آمن)
CREATE OR REPLACE FUNCTION gw_get_admin_session_data(p_session_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_session JSONB;
    v_words JSONB;
    v_players JSONB;
    v_answers JSONB;
    v_current_word_id UUID;
BEGIN
    IF NOT gw_is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'GW_FORBIDDEN';
    END IF;

    -- الجلسة
    SELECT to_jsonb(s.*) INTO v_session
    FROM guess_word_sessions s
    WHERE s.id = p_session_id;

    IF v_session IS NULL THEN
        RAISE EXCEPTION 'GW_SESSION_NOT_FOUND';
    END IF;

    v_current_word_id := (v_session->>'current_word_id')::UUID;

    -- الكلمات
    SELECT coalesce(jsonb_agg(to_jsonb(w.*) ORDER BY w.position), '[]'::jsonb) INTO v_words
    FROM guess_word_words w
    WHERE w.session_id = p_session_id;

    -- المتسابقون
    SELECT coalesce(jsonb_agg(to_jsonb(p.*) ORDER BY p.joined_at), '[]'::jsonb) INTO v_players
    FROM guess_word_players p
    WHERE p.session_id = p_session_id;

    -- إجابات الكلمة الحالية فقط (مرتبة بالأسرع)
    IF v_current_word_id IS NOT NULL THEN
        SELECT coalesce(jsonb_agg(to_jsonb(a.*) ORDER BY a.response_ms ASC), '[]'::jsonb) INTO v_answers
        FROM guess_word_answers a
        WHERE a.word_id = v_current_word_id;
    ELSE
        v_answers := '[]'::jsonb;
    END IF;

    RETURN jsonb_build_object(
        'session', v_session,
        'words', v_words,
        'players', v_players,
        'answers', v_answers
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION gw_get_admin_session_data(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION gw_get_admin_session_data(UUID) TO authenticated;

-- وأيضاً RPC للجلسات (للوحة القائمة) — يتجاوز RLS ويرجع counts معاً
CREATE OR REPLACE FUNCTION gw_list_admin_sessions()
RETURNS TABLE (
    id UUID,
    code TEXT,
    title TEXT,
    status TEXT,
    time_per_word INTEGER,
    created_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    words_count BIGINT,
    players_count BIGINT
) AS $$
BEGIN
    IF NOT gw_is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'GW_FORBIDDEN';
    END IF;

    RETURN QUERY
    SELECT s.id, s.code, s.title, s.status, s.time_per_word,
           s.created_at, s.started_at, s.finished_at,
           (SELECT COUNT(*) FROM guess_word_words w WHERE w.session_id = s.id) AS words_count,
           (SELECT COUNT(*) FROM guess_word_players p WHERE p.session_id = s.id AND p.is_kicked = false) AS players_count
    FROM guess_word_sessions s
    ORDER BY s.created_at DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION gw_list_admin_sessions() FROM anon;
GRANT EXECUTE ON FUNCTION gw_list_admin_sessions() TO authenticated;
