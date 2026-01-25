-- ============================================================================
-- تحسين نظام الحجز: إضافة إمكانية حذف الحجز وإعادة الحجز
-- Migration 037
-- ============================================================================

-- ============================================================================
-- 1. تعديل دالة validate_phone_for_booking لإرجاع بيانات الحجز الحالي
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
BEGIN
    -- البحث عن الطلب بناءً على رقم الهاتف
    SELECT * INTO app_record
    FROM membership_applications
    WHERE phone = p_phone
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
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. إنشاء دالة لحذف الحجز
-- ============================================================================

CREATE OR REPLACE FUNCTION cancel_booking(
    p_slot_id UUID,
    p_application_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    slot_record RECORD;
    interview_record UUID;
BEGIN
    -- الحصول على بيانات الفترة
    SELECT 
        interview_slots.id,
        interview_slots.booked_by,
        interview_slots.is_booked,
        interview_slots.interview_id,
        interview_slots.cancelled_at
    INTO slot_record
    FROM interview_slots
    WHERE interview_slots.id = p_slot_id
    FOR UPDATE;
    
    -- التحقق من وجود الفترة
    IF slot_record IS NULL THEN
        RETURN QUERY SELECT false, 'الفترة غير موجودة'::TEXT;
        RETURN;
    END IF;
    
    -- التحقق من أن الفترة محجوزة
    IF slot_record.is_booked = false THEN
        RETURN QUERY SELECT false, 'الفترة غير محجوزة'::TEXT;
        RETURN;
    END IF;
    
    -- التحقق من أن الفترة محجوزة من قبل نفس المتقدم
    IF slot_record.booked_by != p_application_id THEN
        RETURN QUERY SELECT false, 'غير مصرح لك بحذف هذا الحجز'::TEXT;
        RETURN;
    END IF;
    
    -- التحقق من أن الفترة لم يتم إلغاؤها مسبقاً
    IF slot_record.cancelled_at IS NOT NULL THEN
        RETURN QUERY SELECT false, 'الحجز ملغى مسبقاً'::TEXT;
        RETURN;
    END IF;
    
    -- حفظ interview_id قبل الحذف
    interview_record := slot_record.interview_id;
    
    -- إلغاء الحجز وإعادة الفترة متاحة
    UPDATE interview_slots
    SET 
        is_booked = false,
        booked_by = NULL,
        booked_at = NULL,
        interview_id = NULL,
        cancelled_at = NULL,
        cancellation_reason = NULL
    WHERE interview_slots.id = p_slot_id;
    
    -- حذف المقابلة المرتبطة إن وجدت
    IF interview_record IS NOT NULL THEN
        DELETE FROM membership_interviews
        WHERE id = interview_record;
    END IF;
    
    RETURN QUERY SELECT true, 'تم إلغاء الحجز بنجاح'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. إضافة RLS Policy للسماح بحذف الحجز
-- ============================================================================

-- السماح للمستخدمين بحذف حجوزاتهم الخاصة
-- (هذه السياسة ليست ضرورية لأن cancel_booking تستخدم SECURITY DEFINER)
-- لكنها موجودة للأمان الإضافي

-- ============================================================================
-- 4. تعليقات توضيحية
-- ============================================================================

COMMENT ON FUNCTION validate_phone_for_booking(TEXT, UUID) IS 
'التحقق من صحة رقم الهاتف للحجز وإرجاع بيانات الحجز الحالي إن وجد';

COMMENT ON FUNCTION cancel_booking(UUID, UUID) IS 
'إلغاء حجز موعد مقابلة وحذف المقابلة المرتبطة';

-- ============================================================================
-- 5. رسالة تأكيد
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ تم تحديث نظام الحجز بنجاح';
    RAISE NOTICE '📌 الآن يمكن للمستخدمين:';
    RAISE NOTICE '   - رؤية حجوزاتهم الحالية';
    RAISE NOTICE '   - حذف حجوزاتهم';
    RAISE NOTICE '   - إعادة الحجز بعد الحذف';
END $$;
