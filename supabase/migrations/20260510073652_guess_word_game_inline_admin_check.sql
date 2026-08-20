-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260510073652   الاسم: guess_word_game_inline_admin_check

-- استبدال gw_is_admin() داخل سياسات RLS بـ EXISTS inline
-- السبب: gw_is_admin محظورة على authenticated، لذا تفشل السياسة عند استدعائها

DROP POLICY IF EXISTS "gw_words_select" ON guess_word_words;
CREATE POLICY "gw_words_select" ON guess_word_words
    FOR SELECT TO anon, authenticated
    USING (
        -- الإدارة (role_level >= 8)
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND ur.is_active = true
              AND r.role_level >= 8
        )
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

DROP POLICY IF EXISTS "gw_players_select" ON guess_word_players;
CREATE POLICY "gw_players_select" ON guess_word_players
    FOR SELECT TO anon, authenticated
    USING (
        is_kicked = false
        OR EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND ur.is_active = true
              AND r.role_level >= 8
        )
    );

DROP POLICY IF EXISTS "gw_answers_select" ON guess_word_answers;
CREATE POLICY "gw_answers_select" ON guess_word_answers
    FOR SELECT TO anon, authenticated
    USING (
        -- الإدارة ترى كل الإجابات (للترتيب)
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND ur.is_active = true
              AND r.role_level >= 8
        )
        OR
        -- بعد انتهاء الجلسة: الجميع
        EXISTS (
            SELECT 1 FROM guess_word_words w
            JOIN guess_word_sessions s ON s.id = w.session_id
            WHERE w.id = guess_word_answers.word_id
              AND s.status = 'finished'
        )
    );
