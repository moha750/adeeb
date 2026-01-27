-- ============================================================================
-- التحقق من حالة قاعدة البيانات وإصلاح المشكلة
-- ============================================================================

-- ============================================================================
-- الخطوة 1: التحقق من النسخة الحالية من الدالة
-- ============================================================================

DO $$
DECLARE
    function_source TEXT;
BEGIN
    -- الحصول على كود الدالة الحالية
    SELECT pg_get_functiondef(oid) INTO function_source
    FROM pg_proc 
    WHERE proname = 'validate_phone_for_booking';
    
    RAISE NOTICE '📋 كود الدالة الحالية:';
    RAISE NOTICE '%', function_source;
    
    -- التحقق من وجود normalize_phone في الدالة
    IF function_source LIKE '%normalize_phone(phone)%' THEN
        RAISE NOTICE '✅ الدالة محدثة - تستخدم normalize_phone';
    ELSE
        RAISE WARNING '❌ الدالة قديمة - لا تستخدم normalize_phone';
        RAISE NOTICE '🔧 سيتم تحديثها الآن...';
    END IF;
END $$;

-- ============================================================================
-- الخطوة 2: حذف الدالة القديمة بالقوة
-- ============================================================================

DROP FUNCTION IF EXISTS validate_phone_for_booking(TEXT, UUID) CASCADE;

-- ============================================================================
-- الخطوة 3: إعادة إنشاء دالة normalize_phone
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
-- الخطوة 4: إنشاء الدالة الصحيحة من جديد
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
    RAISE NOTICE '🔍 رقم الهاتف المُدخل: %', p_phone;
    
    -- توحيد صيغة رقم الهاتف المدخل
    normalized_phone := normalize_phone(p_phone);
    
    RAISE NOTICE '✅ رقم الهاتف الموحد: %', normalized_phone;
    
    -- التحقق من صحة الرقم بعد التوحيد
    IF normalized_phone IS NULL THEN
        RAISE NOTICE '❌ الرقم غير صحيح بعد التوحيد';
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
    RAISE NOTICE '🔎 البحث عن الطلب بالرقم الموحد...';
    
    SELECT * INTO app_record
    FROM membership_applications
    WHERE normalize_phone(phone) = normalized_phone
    AND status = 'approved_for_interview'
    LIMIT 1;
    
    -- إذا لم يتم العثور على الطلب
    IF app_record IS NULL THEN
        RAISE NOTICE '❌ لم يتم العثور على طلب بالرقم: %', normalized_phone;
        RAISE NOTICE '📊 الأرقام الموجودة في قاعدة البيانات:';
        
        -- عرض الأرقام الموجودة للمساعدة في التشخيص
        FOR app_record IN 
            SELECT phone, full_name, status 
            FROM membership_applications 
            WHERE status = 'approved_for_interview'
            LIMIT 5
        LOOP
            RAISE NOTICE '   - % (%) - موحد: %', 
                app_record.phone, 
                app_record.full_name,
                normalize_phone(app_record.phone);
        END LOOP;
        
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
    
    RAISE NOTICE '✅ تم العثور على الطلب: % (%)', app_record.full_name, app_record.id;
    
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
        RAISE NOTICE '⚠️  يوجد حجز مسبق';
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
    RAISE NOTICE '✅ الطلب صالح للحجز';
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
-- الخطوة 5: إعادة إنشاء الـ Index
-- ============================================================================

DROP INDEX IF EXISTS idx_membership_applications_normalized_phone;

CREATE INDEX idx_membership_applications_normalized_phone 
ON membership_applications (normalize_phone(phone))
WHERE status = 'approved_for_interview';

-- ============================================================================
-- الخطوة 6: اختبار الدالة
-- ============================================================================

DO $$
DECLARE
    test_result RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🧪 ============================================';
    RAISE NOTICE '🧪 اختبار الدالة المحدثة';
    RAISE NOTICE '🧪 ============================================';
    RAISE NOTICE '';
    
    -- اختبار توحيد الأرقام
    RAISE NOTICE '📋 اختبار توحيد الأرقام:';
    RAISE NOTICE '   normalize_phone(''0570787919'') = %', normalize_phone('0570787919');
    RAISE NOTICE '   normalize_phone(''057 078 7919'') = %', normalize_phone('057 078 7919');
    RAISE NOTICE '   normalize_phone(''+966570787919'') = %', normalize_phone('+966570787919');
    RAISE NOTICE '   normalize_phone(''570787919'') = %', normalize_phone('570787919');
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ تم تحديث الدالة بنجاح';
    RAISE NOTICE '📌 الآن يمكنك اختبار نظام الحجز';
END $$;

-- ============================================================================
-- الخطوة 7: عرض الأرقام الموجودة في قاعدة البيانات
-- ============================================================================

DO $$
DECLARE
    app_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO app_count
    FROM membership_applications
    WHERE status = 'approved_for_interview';
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 ============================================';
    RAISE NOTICE '📊 الطلبات المقبولة للمقابلة';
    RAISE NOTICE '📊 ============================================';
    RAISE NOTICE 'إجمالي الطلبات المقبولة: %', app_count;
    RAISE NOTICE '';
    
    IF app_count = 0 THEN
        RAISE WARNING '⚠️  لا توجد طلبات بحالة "approved_for_interview"';
        RAISE NOTICE '💡 تأكد من وجود طلبات مقبولة للمقابلة في قاعدة البيانات';
    END IF;
END $$;
