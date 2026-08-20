-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260510072249   الاسم: guess_word_game_revoke_public

-- إزالة EXECUTE من PUBLIC على جميع دوال gw_ (الافتراضي في PostgreSQL يعطي PUBLIC حق التنفيذ)
-- ثم نُعيد GRANT صراحةً على الدوال المسموح بها فقط

REVOKE EXECUTE ON FUNCTION gw_is_admin(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION gw_generate_session_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION gw_create_session(TEXT, TEXT[], INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION gw_start_next_round(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION gw_end_current_round(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION gw_pick_winner(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION gw_close_session(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION gw_delete_session(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION gw_kick_player(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION gw_join_session(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION gw_submit_answer(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION gw_get_player_state(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION gw_get_leaderboard(UUID) FROM PUBLIC;

-- gw_is_admin و gw_generate_session_code: داخليتان فقط — لا تُمنحان لأحد
-- (SECURITY DEFINER يمكنها استدعاؤهما داخليًا حتى دون GRANT)

-- الدوال الإدارية: authenticated فقط (gw_is_admin يفلتر الأدمن داخلياً)
GRANT EXECUTE ON FUNCTION gw_create_session(TEXT, TEXT[], INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION gw_start_next_round(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION gw_end_current_round(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION gw_pick_winner(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION gw_close_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION gw_delete_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION gw_kick_player(UUID) TO authenticated;

-- دوال المتسابقين (anon + authenticated)
GRANT EXECUTE ON FUNCTION gw_join_session(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION gw_submit_answer(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION gw_get_player_state(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION gw_get_leaderboard(UUID) TO anon, authenticated;
