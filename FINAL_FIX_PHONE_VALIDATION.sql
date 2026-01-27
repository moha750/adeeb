-- ============================================================================
-- الحل النهائي والدقيق لمشكلة التحقق من رقم الهاتف
-- ============================================================================

-- ============================================================================
-- 1. حذف الدالة القديمة بالقوة
-- ============================================================================

DROP FUNCTION IF EXISTS validate_phone_for_booking(TEXT, UUID) CASCADE;

-- ============================================================================
-- 2. التأكد من وجود دالة normalize_phone
-- ============================================================================

CREATE OR REPLACE FUNCTION normalize_phone(p_phone TEXT)
RETURNS TEXT AS $$
BEGIN
    IF p_phone IS NULL THEN
        RETURN NULL;
    END IF;
    
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
        RETURN NULL;
    END IF;
    
    -- التأكد من أن الطول 10 أرقام
    IF LENGTH(p_phone) != 10 THEN
        RETURN NULL;
    END IF;
    
    RETURN p_phone;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 3. إنشاء الدالة الصحيحة (بدون أخطاء الأعمدة الغامضة)
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
    v_normalized_phone TEXT;
    v_app_id UUID;
    v_app_name TEXT;
    v_app_email TEXT;
    v_app_committee TEXT;
    v_slot_id UUID;
    v_slot_time TIMESTAMPTZ;
    v_slot_end_time TIMESTAMPTZ;
    v_interview_id UUID;
BEGIN
    -- توحيد صيغة رقم الهاتف المدخل
    v_normalized_phone := normalize_phone(p_phone);
    
    -- التحقق من صحة الرقم بعد التوحيد
    IF v_normalized_phone IS NULL THEN
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
    
    -- البحث عن الطلب بناءً على رقم الهاتف الموحد
    SELECT 
        ma.id,
        ma.full_name,
        ma.email,
        ma.preferred_committee
    INTO 
        v_app_id,
        v_app_name,
        v_app_email,
        v_app_committee
    FROM membership_applications ma
    WHERE normalize_phone(ma.phone) = v_normalized_phone
    AND ma.status = 'approved_for_interview'
    LIMIT 1;
    
    -- إذا لم يتم العثور على الطلب
    IF v_app_id IS NULL THEN
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
        slots.id,
        slots.slot_time,
        slots.slot_end_time,
        slots.interview_id
    INTO 
        v_slot_id,
        v_slot_time,
        v_slot_end_time,
        v_interview_id
    FROM interview_slots slots
    WHERE slots.session_id = p_session_id
    AND slots.booked_by = v_app_id
    AND slots.is_booked = true
    AND slots.cancelled_at IS NULL
    LIMIT 1;
    
    -- إذا كان هناك حجز موجود
    IF v_slot_id IS NOT NULL THEN
        RETURN QUERY SELECT 
            false,
            v_app_id,
            v_app_name,
            v_app_email,
            v_app_committee,
            'لديك موعد محجوز مسبقاً في هذه الجلسة'::TEXT,
            true,
            v_slot_id,
            v_slot_time,
            v_slot_end_time,
            v_interview_id;
        RETURN;
    END IF;
    
    -- الطلب صالح للحجز (لا يوجد حجز مسبق)
    RETURN QUERY SELECT 
        true,
        v_app_id,
        v_app_name,
        v_app_email,
        v_app_committee,
        NULL::TEXT,
        false,
        NULL::UUID,
        NULL::TIMESTAMPTZ,
        NULL::TIMESTAMPTZ,
        NULL::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 4. إعادة إنشاء الـ Index
-- ============================================================================

DROP INDEX IF EXISTS idx_membership_applications_normalized_phone;

CREATE INDEX idx_membership_applications_normalized_phone 
ON membership_applications (normalize_phone(phone))
WHERE status = 'approved_for_interview';

-- ============================================================================
-- 5. اختبار الدالة
-- ============================================================================

DO $$
DECLARE
    test_result RECORD;
    test_count INTEGER;
BEGIN
    RAISE NOTICE '✅ ============================================';
    RAISE NOTICE '✅ تم إنشاء الدالة بنجاح';
    RAISE NOTICE '✅ ============================================';
    RAISE NOTICE '';
    
    -- عد الطلبات المقبولة للمقابلة
    SELECT COUNT(*) INTO test_count
    FROM membership_applications
    WHERE status = 'approved_for_interview';
    
    RAISE NOTICE '📊 عدد الطلبات المقبولة للمقابلة: %', test_count;
    
    IF test_count = 0 THEN
        RAISE WARNING '⚠️  لا توجد طلبات بحالة "approved_for_interview"';
        RAISE NOTICE '';
        RAISE NOTICE '💡 لاختبار النظام، نفذ:';
        RAISE NOTICE '   UPDATE membership_applications';
        RAISE NOTICE '   SET status = ''approved_for_interview''';
        RAISE NOTICE '   WHERE id = (SELECT id FROM membership_applications LIMIT 1);';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '📋 عينة من الطلبات المقبولة:';
        
        FOR test_result IN 
            SELECT 
                full_name,
                phone,
                normalize_phone(phone) as normalized,
                preferred_committee
            FROM membership_applications
            WHERE status = 'approved_for_interview'
            LIMIT 5
        LOOP
            RAISE NOTICE '   ✓ % | % → %', 
                test_result.full_name,
                test_result.phone,
                test_result.normalized;
        END LOOP;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🧪 اختبار توحيد الأرقام:';
    RAISE NOTICE '   normalize_phone(''0576646958'') = %', normalize_phone('0576646958');
    RAISE NOTICE '   normalize_phone(''057 664 6958'') = %', normalize_phone('057 664 6958');
    RAISE NOTICE '   normalize_phone(''+966576646958'') = %', normalize_phone('+966576646958');
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ الدالة جاهزة للاستخدام';
    RAISE NOTICE '📌 يمكنك الآن اختبار نظام الحجز';
END $$;

-- ============================================================================
-- 6. تعليقات توضيحية
-- ============================================================================

COMMENT ON FUNCTION normalize_phone(TEXT) IS 
'توحيد صيغة رقم الهاتف السعودي إلى الصيغة القياسية (0512345678)';

COMMENT ON FUNCTION validate_phone_for_booking(TEXT, UUID) IS 
'التحقق من صحة رقم الهاتف للحجز - يستخدم normalize_phone للمقارنة - بدون أخطاء الأعمدة الغامضة';
