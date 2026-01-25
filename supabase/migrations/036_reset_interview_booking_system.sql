-- ============================================================================
-- إعادة تعيين نظام حجز مواعيد المقابلات
-- استخدم هذا الملف إذا حدث خطأ في الجداول أو السياسات أو الـ triggers
-- ============================================================================

-- ============================================================================
-- 1. حذف كل شيء متعلق بنظام الحجوزات
-- ============================================================================

-- حذف الـ triggers
DROP TRIGGER IF EXISTS auto_create_interview ON interview_slots;
DROP TRIGGER IF EXISTS auto_generate_slots ON interview_sessions;
DROP TRIGGER IF EXISTS auto_generate_token ON interview_sessions;
DROP TRIGGER IF EXISTS update_interview_sessions_updated_at ON interview_sessions;

-- حذف الدوال
DROP FUNCTION IF EXISTS trigger_create_interview_on_booking() CASCADE;
DROP FUNCTION IF EXISTS trigger_generate_slots() CASCADE;
DROP FUNCTION IF EXISTS trigger_generate_token() CASCADE;
DROP FUNCTION IF EXISTS generate_interview_slots(UUID, DATE, TIME, TIME, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS generate_session_token() CASCADE;
DROP FUNCTION IF EXISTS get_session_statistics(UUID) CASCADE;
DROP FUNCTION IF EXISTS validate_phone_for_booking(TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS book_interview_slot(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS cancel_interview_slot(UUID, TEXT) CASCADE;

-- حذف الجداول (CASCADE سيحذف كل السياسات والفهارس المرتبطة)
DROP TABLE IF EXISTS interview_slots CASCADE;
DROP TABLE IF EXISTS interview_sessions CASCADE;

-- ============================================================================
-- 2. رسالة تأكيد
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ تم حذف جميع جداول ودوال وسياسات نظام الحجوزات بنجاح';
    RAISE NOTICE '📌 الآن يمكنك تطبيق migration 036 من جديد';
    RAISE NOTICE '📌 استخدم: supabase db push أو أعد تطبيق الملف يدوياً';
END $$;
