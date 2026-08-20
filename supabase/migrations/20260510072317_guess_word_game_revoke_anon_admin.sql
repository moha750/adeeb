-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260510072317   الاسم: guess_word_game_revoke_anon_admin

-- Supabase يمنح EXECUTE تلقائياً لـ anon/authenticated. نزيلها صراحةً عن الدوال الإدارية والداخلية.

-- الدوال الداخلية: لا تُكشف لأحد (لكن authenticated يحتاجها داخلياً → نُبقيها له)
REVOKE EXECUTE ON FUNCTION gw_is_admin(UUID) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION gw_generate_session_code() FROM anon, authenticated;

-- الدوال الإدارية: لا تُكشف لـ anon (لكن authenticated يحتاجها — gw_is_admin داخلياً يصدّ غير الأدمن)
REVOKE EXECUTE ON FUNCTION gw_create_session(TEXT, TEXT[], INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION gw_start_next_round(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION gw_end_current_round(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION gw_pick_winner(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION gw_close_session(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION gw_delete_session(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION gw_kick_player(UUID) FROM anon;
