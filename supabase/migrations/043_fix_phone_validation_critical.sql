-- ============================================================================
-- إصلاح حرج: مشكلة التحقق من رقم الهاتف في نظام الحجز
-- Migration 043 - Critical Fix
-- ============================================================================
-- 
-- المشكلة: الدالة validate_phone_for_booking لا تستخدم توحيد الأرقام
-- الحل: استخدام normalize_phone() في المقارنة
-- ============================================================================

-- ============================================================================
-- 1. التأكد من وجود دالة normalize_phone
-- ============================================================================

CREATE OR REPLACE FUNCTION normalize_phone(p_phone TEXT)
RETURNS TEXT AS $$
BEGIN
    -- إزالة جميع المسافات والرموز والأحرف غير الرقمية
    p_phone := REGEXP_REPLACE(p_phone, '[^0-9]', '', 'g');
    
    -- إزالة الأصفار البادئة الزائدة
    p_phone := LTRIM(p_phone, '0');
    
    -- إذا كان الرقم يبدأ بـ 966 (كود السعودية)، نزيله
    IF p_phone LIKE '966%' THEN
        p_phone := SUBSTRING(p_phone FROM 4);
    END IF;
    
    -- إضافة 0 في البداية إذا لم يكن موجوداً
    IF NOT p_phone LIKE '0%' THEN
        p_phone := '0' || p_phone;
    END IF;
    
    -- التأكد من أن الرقم يبدأ بـ 05
    IF NOT p_phone LIKE '05%' THEN
        RETURN NULL; -- رقم غير صحيح
    END IF;
    
    -- التأكد من أن الطول 10 أرقام
    IF LENGTH(p_phone) != 10 THEN
        RETURN NULL; -- رقم غير صحيح
    END IF;
    
    RETURN p_phone;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 2. تحديث دالة validate_phone_for_booking (الإصلاح الحرج)
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_phone_for_booking(
    p_phone TEXT,
    p_session_id UUID
)
RETURNS TABLE (
    is_valid BOOLEAN,
    application_id UUID,
    full_name TEXT,
    email TEXT,
    preferred_committee TEXT,
    error_message TEXT,
    has_existing_booking BOOLEAN,
    existing_slot_id UUID,
    existing_slot_time TIMESTAMPTZ,
    existing_slot_end_time TIMESTAMPTZ,
    existing_interview_id UUID
) AS $$
DECLARE
    app_record RECORD;
    existing_booking RECORD;
    normalized_phone TEXT;
BEGIN
    -- توحيد صيغة رقم الهاتف المدخل
    normalized_phone := normalize_phone(p_phone);
    
    -- التحقق من صحة الرقم بعد التوحيد
    IF normalized_phone IS NULL THEN
        RETURN QUERY SELECT 
            false,
            NULL::UUID,
            NULL::TEXT,
            NULL::TEXT,
            NULL::TEXT,
            'رقم الهاتف غير صحيح. يجب أن يبدأ بـ 05 ويتكون من 10 أرقام'::TEXT,
            false,
            NULL::UUID,
            NULL::TIMESTAMPTZ,
            NULL::TIMESTAMPTZ,
            NULL::UUID;
        RETURN;
    END IF;
    
    -- 🔥 الإصلاح الحرج: استخدام normalize_phone في المقارنة
    -- البحث عن الطلب بناءً على رقم الهاتف الموحد
    SELECT * INTO app_record
    FROM membership_applications
    WHERE normalize_phone(phone) = normalized_phone
    AND status = 'approved_for_interview'
    LIMIT 1;
    
    -- إذا لم يتم العثور على الطلب
    IF app_record IS NULL THEN
        RETURN QUERY SELECT 
            false,
            NULL::UUID,
            NULL::TEXT,
            NULL::TEXT,
            NULL::TEXT,
            'رقم الهاتف غير مسجل أو الطلب غير مقبول للمقابلة'::TEXT,
            false,
            NULL::UUID,
            NULL::TIMESTAMPTZ,
            NULL::TIMESTAMPTZ,
            NULL::UUID;
        RETURN;
    END IF;
    
    -- التحقق من وجود حجز مسبق في نفس الجلسة
    SELECT 
        interview_slots.id,
        interview_slots.slot_time,
        interview_slots.slot_end_time,
        interview_slots.interview_id
    INTO existing_booking
    FROM interview_slots
    WHERE session_id = p_session_id
    AND booked_by = app_record.id
    AND is_booked = true
    AND cancelled_at IS NULL
    LIMIT 1;
    
    -- إذا كان هناك حجز موجود
    IF existing_booking IS NOT NULL THEN
        RETURN QUERY SELECT 
            false,
            app_record.id,
            app_record.full_name,
            app_record.email,
            app_record.preferred_committee,
            'لديك موعد محجوز مسبقاً في هذه الجلسة'::TEXT,
            true,
            existing_booking.id,
            existing_booking.slot_time,
            existing_booking.slot_end_time,
            existing_booking.interview_id;
        RETURN;
    END IF;
    
    -- الطلب صالح للحجز (لا يوجد حجز مسبق)
    RETURN QUERY SELECT 
        true,
        app_record.id,
        app_record.full_name,
        app_record.email,
        app_record.preferred_committee,
        NULL::TEXT,
        false,
        NULL::UUID,
        NULL::TIMESTAMPTZ,
        NULL::TIMESTAMPTZ,
        NULL::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 3. إنشاء/تحديث index لتسريع البحث بالرقم الموحد
-- ============================================================================

-- حذف الـ index القديم إن وجد
DROP INDEX IF EXISTS idx_membership_applications_normalized_phone;

-- إنشاء index وظيفي جديد على normalize_phone(phone)
CREATE INDEX idx_membership_applications_normalized_phone 
ON membership_applications (normalize_phone(phone))
WHERE status = 'approved_for_interview';

-- ============================================================================
-- 4. اختبار الدالة
-- ============================================================================

DO $$
DECLARE
    test_result RECORD;
BEGIN
    -- اختبار توحيد الأرقام
    RAISE NOTICE '🧪 اختبار توحيد الأرقام:';
    RAISE NOTICE '   normalize_phone(''0582077204'') = %', normalize_phone('0582077204');
    RAISE NOTICE '   normalize_phone(''058 207 7204'') = %', normalize_phone('058 207 7204');
    RAISE NOTICE '   normalize_phone(''+966582077204'') = %', normalize_phone('+966582077204');
    RAISE NOTICE '   normalize_phone(''582077204'') = %', normalize_phone('582077204');
    RAISE NOTICE '   normalize_phone(''966582077204'') = %', normalize_phone('966582077204');
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ تم تطبيق الإصلاح الحرج بنجاح';
    RAISE NOTICE '📌 التحسينات:';
    RAISE NOTICE '   - توحيد صيغة الأرقام تلقائياً في المقارنة';
    RAISE NOTICE '   - إزالة المسافات والرموز';
    RAISE NOTICE '   - معالجة كود الدولة (+966)';
    RAISE NOTICE '   - يعمل مع جميع صيغ الأرقام المخزنة';
    RAISE NOTICE '   - تحسين الأداء بإضافة index وظيفي';
END $$;

-- ============================================================================
-- 5. تعليقات توضيحية
-- ============================================================================

COMMENT ON FUNCTION normalize_phone(TEXT) IS 
'توحيد صيغة رقم الهاتف السعودي: إزالة المسافات والرموز، معالجة كود الدولة، التأكد من الصيغة الصحيحة (0582077204)';

COMMENT ON FUNCTION validate_phone_for_booking(TEXT, UUID) IS 
'التحقق من صحة رقم الهاتف للحجز مع توحيد الصيغة تلقائياً - يعمل مع جميع صيغ الأرقام المخزنة والمدخلة';
