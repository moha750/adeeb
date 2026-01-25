-- ============================================================================
-- حل نهائي: حذف الدالة القديمة وإنشاء الجديدة بصلاحيات صحيحة
-- ============================================================================

-- 1. حذف الدالة القديمة تماماً
DROP FUNCTION IF EXISTS validate_phone_for_booking(TEXT, UUID) CASCADE;

-- 2. حذف دالة التوحيد القديمة إن وجدت
DROP FUNCTION IF EXISTS normalize_phone(TEXT) CASCADE;

-- 3. إنشاء دالة التوحيد من جديد
CREATE FUNCTION normalize_phone(p_phone TEXT)
RETURNS TEXT AS $$
BEGIN
    IF p_phone IS NULL THEN 
        RETURN NULL; 
    END IF;
    
    -- إزالة جميع المسافات والرموز
    p_phone := REGEXP_REPLACE(p_phone, '[^0-9]', '', 'g');
    
    -- إزالة الأصفار البادئة
    p_phone := LTRIM(p_phone, '0');
    
    -- معالجة كود السعودية
    IF p_phone LIKE '966%' THEN
        p_phone := SUBSTRING(p_phone FROM 4);
    END IF;
    
    -- إضافة 0 في البداية
    IF NOT p_phone LIKE '0%' THEN
        p_phone := '0' || p_phone;
    END IF;
    
    -- التحقق من الصيغة
    IF NOT p_phone LIKE '05%' OR LENGTH(p_phone) != 10 THEN
        RETURN NULL;
    END IF;
    
    RETURN p_phone;
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- 4. إنشاء دالة التحقق من جديد مع SECURITY DEFINER
CREATE FUNCTION validate_phone_for_booking(
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
    -- توحيد الرقم
    normalized_phone := normalize_phone(p_phone);
    
    -- التحقق من الصحة
    IF normalized_phone IS NULL THEN
        RETURN QUERY SELECT 
            false, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT,
            'رقم الهاتف غير صحيح. يجب أن يبدأ بـ 05 ويتكون من 10 أرقام'::TEXT,
            false, NULL::UUID, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, NULL::UUID;
        RETURN;
    END IF;
    
    -- البحث عن الطلب
    SELECT * INTO app_record
    FROM membership_applications
    WHERE normalize_phone(phone) = normalized_phone
    AND status = 'approved_for_interview'
    LIMIT 1;
    
    -- إذا لم يوجد
    IF app_record IS NULL THEN
        RETURN QUERY SELECT 
            false, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT,
            'رقم الهاتف غير مسجل أو الطلب غير مقبول للمقابلة'::TEXT,
            false, NULL::UUID, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, NULL::UUID;
        RETURN;
    END IF;
    
    -- التحقق من حجز مسبق
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
    
    -- إذا يوجد حجز
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
    
    -- النجاح
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. منح الصلاحيات للجميع
GRANT EXECUTE ON FUNCTION normalize_phone(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION validate_phone_for_booking(TEXT, UUID) TO anon, authenticated;

-- 6. إنشاء Index
DROP INDEX IF EXISTS idx_membership_applications_normalized_phone;
CREATE INDEX idx_membership_applications_normalized_phone 
ON membership_applications (normalize_phone(phone))
WHERE status = 'approved_for_interview';

-- 7. اختبار فوري
DO $$
DECLARE
    test_result RECORD;
BEGIN
    -- اختبار دالة التوحيد
    RAISE NOTICE '🧪 اختبار normalize_phone:';
    RAISE NOTICE '   Input: 0551234567 → Output: %', normalize_phone('0551234567');
    RAISE NOTICE '   Input: 051 234 5678 → Output: %', normalize_phone('051 234 5678');
    RAISE NOTICE '   Input: +966551234567 → Output: %', normalize_phone('+966551234567');
    
    -- اختبار دالة التحقق
    RAISE NOTICE '';
    RAISE NOTICE '🧪 اختبار validate_phone_for_booking:';
    
    SELECT * INTO test_result
    FROM validate_phone_for_booking(
        '0551234567',
        (SELECT id FROM interview_sessions LIMIT 1)
    );
    
    IF test_result.is_valid THEN
        RAISE NOTICE '✅ النتيجة: صحيح - الرقم مقبول';
        RAISE NOTICE '   الاسم: %', test_result.full_name;
    ELSE
        RAISE NOTICE '❌ النتيجة: خطأ - %', test_result.error_message;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ تم تطبيق الإصلاح بنجاح!';
    RAISE NOTICE '📌 جرب الآن من الموقع';
END $$;
