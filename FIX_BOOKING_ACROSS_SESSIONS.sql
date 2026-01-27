-- ============================================================================
-- إصلاح نظام الحجز ليعرض الحجز الموجود في أي جلسة
-- ============================================================================

-- ============================================================================
-- 1. تحديث دالة validate_phone_for_booking
-- ============================================================================

DROP FUNCTION IF EXISTS validate_phone_for_booking(TEXT, UUID) CASCADE;

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
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
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
    -- توحيد الرقم
    v_normalized_phone := normalize_phone(p_phone);
    
    IF v_normalized_phone IS NULL THEN
        RETURN QUERY SELECT 
            false, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT,
            'رقم الهاتف غير صحيح. يجب أن يبدأ بـ 05 ويتكون من 10 أرقام'::TEXT,
            false, NULL::UUID, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, NULL::UUID;
        RETURN;
    END IF;
    
    -- البحث عن الطلب
    SELECT ma.id, ma.full_name, ma.email, ma.preferred_committee
    INTO v_app_id, v_app_name, v_app_email, v_app_committee
    FROM membership_applications ma
    WHERE normalize_phone(ma.phone) = v_normalized_phone
    AND ma.status = 'approved_for_interview'
    LIMIT 1;
    
    IF v_app_id IS NULL THEN
        RETURN QUERY SELECT 
            false, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT,
            'رقم الهاتف غير مسجل أو الطلب غير مقبول للمقابلة'::TEXT,
            false, NULL::UUID, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, NULL::UUID;
        RETURN;
    END IF;
    
    -- التحقق من حجز مسبق في أي جلسة (وليس فقط الجلسة الحالية)
    SELECT s.id, s.slot_time, s.slot_end_time, s.interview_id
    INTO v_slot_id, v_slot_time, v_slot_end_time, v_interview_id
    FROM interview_slots s
    WHERE s.booked_by = v_app_id
    AND s.is_booked = true
    AND s.cancelled_at IS NULL
    ORDER BY s.slot_time DESC
    LIMIT 1;
    
    IF v_slot_id IS NOT NULL THEN
        RETURN QUERY SELECT 
            false, v_app_id, v_app_name, v_app_email, v_app_committee,
            'لديك موعد محجوز مسبقاً'::TEXT,
            true, v_slot_id, v_slot_time, v_slot_end_time, v_interview_id;
        RETURN;
    END IF;
    
    -- صالح للحجز
    RETURN QUERY SELECT 
        true, v_app_id, v_app_name, v_app_email, v_app_committee,
        NULL::TEXT, false, NULL::UUID, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, NULL::UUID;
END;
$$;

-- ============================================================================
-- 2. تحديث دالة book_interview_slot لمنع الحجز المكرر
-- ============================================================================

DROP FUNCTION IF EXISTS book_interview_slot(UUID, UUID) CASCADE;

CREATE FUNCTION book_interview_slot(
    p_slot_id UUID,
    p_application_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    interview_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    slot_record RECORD;
    new_interview_id UUID;
    app_record RECORD;
    existing_booking_count INT;
BEGIN
    -- التحقق من وجود حجز مسبق للمتقدم
    SELECT COUNT(*) INTO existing_booking_count
    FROM interview_slots
    WHERE booked_by = p_application_id
    AND is_booked = true
    AND cancelled_at IS NULL;
    
    IF existing_booking_count > 0 THEN
        RETURN QUERY SELECT false, 'لديك موعد محجوز مسبقاً. لا يمكن حجز أكثر من موعد واحد'::TEXT, NULL::UUID;
        RETURN;
    END IF;
    
    -- الحصول على بيانات الفترة
    SELECT * INTO slot_record
    FROM interview_slots
    WHERE id = p_slot_id
    FOR UPDATE;
    
    IF slot_record IS NULL THEN
        RETURN QUERY SELECT false, 'الفترة غير موجودة'::TEXT, NULL::UUID;
        RETURN;
    END IF;
    
    IF slot_record.is_booked = true THEN
        RETURN QUERY SELECT false, 'الفترة محجوزة بالفعل'::TEXT, NULL::UUID;
        RETURN;
    END IF;
    
    -- الحصول على بيانات المتقدم
    SELECT * INTO app_record
    FROM membership_applications
    WHERE id = p_application_id;
    
    IF app_record IS NULL THEN
        RETURN QUERY SELECT false, 'الطلب غير موجود'::TEXT, NULL::UUID;
        RETURN;
    END IF;
    
    -- التحقق من وجود مقابلة سابقة
    SELECT id INTO new_interview_id
    FROM membership_interviews
    WHERE application_id = p_application_id
    LIMIT 1;
    
    -- إذا لم توجد مقابلة، أنشئ واحدة جديدة
    IF new_interview_id IS NULL THEN
        INSERT INTO membership_interviews (
            application_id,
            interview_date,
            interview_type,
            meeting_link,
            status
        ) VALUES (
            p_application_id,
            slot_record.slot_time,
            (SELECT interview_type FROM interview_sessions WHERE id = slot_record.session_id),
            (SELECT meeting_link FROM interview_sessions WHERE id = slot_record.session_id),
            'scheduled'
        )
        RETURNING id INTO new_interview_id;
    ELSE
        -- تحديث المقابلة الموجودة
        UPDATE membership_interviews
        SET 
            interview_date = slot_record.slot_time,
            interview_type = (SELECT interview_type FROM interview_sessions WHERE id = slot_record.session_id),
            meeting_link = (SELECT meeting_link FROM interview_sessions WHERE id = slot_record.session_id),
            status = 'scheduled',
            updated_at = NOW()
        WHERE id = new_interview_id;
    END IF;
    
    -- حجز الفترة
    UPDATE interview_slots
    SET 
        is_booked = true,
        booked_by = p_application_id,
        booked_at = NOW(),
        interview_id = new_interview_id
    WHERE id = p_slot_id;
    
    RETURN QUERY SELECT true, 'تم حجز الموعد بنجاح'::TEXT, new_interview_id;
END;
$$;

-- ============================================================================
-- 3. اختبار
-- ============================================================================

-- اختبار validate_phone_for_booking
SELECT 
    '=== اختبار validate_phone_for_booking ===' as test,
    is_valid,
    full_name,
    has_existing_booking,
    error_message
FROM validate_phone_for_booking(
    '0550912444',
    '00000000-0000-0000-0000-000000000000'::UUID
);

RAISE NOTICE 'تم تحديث الدوال بنجاح!';
RAISE NOTICE 'الآن عند إدخال رقم هاتف له حجز في أي جلسة، سيظهر حجزه الموجود';
RAISE NOTICE 'ولن يتمكن من حجز موعد آخر';
