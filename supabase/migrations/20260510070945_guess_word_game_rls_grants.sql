-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260510070945   الاسم: guess_word_game_rls_grants

-- 18. RLS
ALTER TABLE guess_word_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE guess_word_words    ENABLE ROW LEVEL SECURITY;
ALTER TABLE guess_word_players  ENABLE ROW LEVEL SECURITY;
ALTER TABLE guess_word_answers  ENABLE ROW LEVEL SECURITY;

-- guess_word_sessions: قراءة عامة (الكود نفسه هو سرّ الانضمام)
DROP POLICY IF EXISTS "gw_sessions_select" ON guess_word_sessions;
CREATE POLICY "gw_sessions_select" ON guess_word_sessions
    FOR SELECT TO anon, authenticated
    USING (true);

-- guess_word_words: المتسابق يرى فقط الكلمة الحالية للجلسة + الإدارة + الجلسات المنتهية
DROP POLICY IF EXISTS "gw_words_select" ON guess_word_words;
CREATE POLICY "gw_words_select" ON guess_word_words
    FOR SELECT TO anon, authenticated
    USING (
        gw_is_admin(auth.uid())
        OR EXISTS (
            SELECT 1 FROM guess_word_sessions s
            WHERE s.id = guess_word_words.session_id
              AND s.current_word_id = guess_word_words.id
        )
        OR EXISTS (
            SELECT 1 FROM guess_word_sessions s
            WHERE s.id = guess_word_words.session_id
              AND s.status = 'finished'
        )
    );

-- guess_word_players: المتسابقون النشطون مرئيون للجميع
DROP POLICY IF EXISTS "gw_players_select" ON guess_word_players;
CREATE POLICY "gw_players_select" ON guess_word_players
    FOR SELECT TO anon, authenticated
    USING (is_kicked = false OR gw_is_admin(auth.uid()));

-- guess_word_answers: الإدارة فقط حية، الجميع بعد انتهاء الجلسة
DROP POLICY IF EXISTS "gw_answers_select" ON guess_word_answers;
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

-- 19. صلاحيات تنفيذ الدوال
GRANT EXECUTE ON FUNCTION gw_create_session(TEXT, TEXT[], INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION gw_start_next_round(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION gw_end_current_round(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION gw_pick_winner(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION gw_close_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION gw_delete_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION gw_kick_player(UUID) TO authenticated;

GRANT EXECUTE ON FUNCTION gw_join_session(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION gw_submit_answer(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION gw_get_player_state(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION gw_get_leaderboard(UUID) TO anon, authenticated;

-- 20. تفعيل Realtime
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
