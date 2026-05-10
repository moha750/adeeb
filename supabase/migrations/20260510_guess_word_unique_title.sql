-- =============================================
-- منع تكرار عنوان جلسة "خمّن الكلمة"
-- =============================================
-- المقارنة case-insensitive ومتجاهلة للمسافات الجانبية: "Test " == "test"

-- 1. فهرس فريد دالّي على lower(trim(title))
CREATE UNIQUE INDEX IF NOT EXISTS idx_gw_sessions_title_unique
    ON guess_word_sessions (lower(trim(title)));

-- 2. تحديث RPC للتحقق المسبق ورسالة خطأ مفهومة
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
    v_clean_title TEXT;
BEGIN
    IF NOT gw_is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'GW_FORBIDDEN: تحتاج صلاحيات إدارة عليا';
    END IF;

    v_clean_title := trim(coalesce(p_title, ''));
    IF length(v_clean_title) = 0 THEN
        RAISE EXCEPTION 'GW_TITLE_REQUIRED: عنوان الجلسة مطلوب';
    END IF;
    IF length(v_clean_title) > 100 THEN
        RAISE EXCEPTION 'GW_TITLE_TOO_LONG: العنوان طويل جداً (الحد 100 حرف)';
    END IF;

    IF EXISTS (
        SELECT 1 FROM guess_word_sessions
        WHERE lower(trim(title)) = lower(v_clean_title)
    ) THEN
        RAISE EXCEPTION 'GW_TITLE_DUPLICATE: يوجد جلسة بنفس العنوان';
    END IF;

    IF p_words IS NULL OR array_length(p_words, 1) IS NULL OR array_length(p_words, 1) = 0 THEN
        RAISE EXCEPTION 'GW_NO_WORDS: يجب إضافة كلمة واحدة على الأقل';
    END IF;

    IF array_length(p_words, 1) > 200 THEN
        RAISE EXCEPTION 'GW_TOO_MANY_WORDS: الحد الأقصى 200 كلمة';
    END IF;

    v_code := gw_generate_session_code();

    INSERT INTO guess_word_sessions (code, title, time_per_word, created_by)
    VALUES (v_code, v_clean_title, p_time_per_word, auth.uid())
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
