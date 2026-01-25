-- ============================================================================
-- إضافة دالة حذف الموعد إدارياً (إجراء قصري)
-- Migration 043
-- ============================================================================

-- ============================================================================
-- دالة: حذف موعد المقابلة إدارياً
-- ============================================================================

CREATE OR REPLACE FUNCTION cancel_interview_admin(
    p_interview_id UUID,
    p_slot_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    slot_record RECORD;
    interview_record RECORD;
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
    
    -- الحصول على بيانات المقابلة
    SELECT * INTO interview_record
    FROM membership_interviews
    WHERE id = p_interview_id;
    
    -- التحقق من وجود المقابلة
    IF interview_record IS NULL THEN
        RETURN QUERY SELECT false, 'المقابلة غير موجودة'::TEXT;
        RETURN;
    END IF;
    
    -- حذف المقابلة من جدول membership_interviews
    DELETE FROM membership_interviews
    WHERE id = p_interview_id;
    
    -- إعادة تعيين الفترة الزمنية لتصبح متاحة
    UPDATE interview_slots
    SET 
        is_booked = false,
        booked_by = NULL,
        booked_at = NULL,
        interview_id = NULL,
        cancelled_at = NULL,
        cancellation_reason = NULL
    WHERE interview_slots.id = p_slot_id;
    
    -- إعادة حالة المتقدم إلى approved_for_interview (إذا كانت قد تغيرت)
    -- هذا يسمح له بحجز موعد جديد
    UPDATE membership_applications
    SET status = 'approved_for_interview'
    WHERE id = slot_record.booked_by
    AND status IN ('interviewed', 'interview_scheduled');
    
    RETURN QUERY SELECT true, 'تم حذف الموعد بنجاح'::TEXT;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT false, 'حدث خطأ أثناء حذف الموعد: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- تعليقات توضيحية
-- ============================================================================

COMMENT ON FUNCTION cancel_interview_admin(UUID, UUID) IS 
'حذف موعد المقابلة إدارياً (إجراء قصري): يحذف المقابلة، يعيد الفترة متاحة، ويسمح للمتقدم بحجز موعد جديد';

-- ============================================================================
-- رسالة تأكيد
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ تم إضافة دالة حذف الموعد إدارياً';
    RAISE NOTICE '📌 الميزات:';
    RAISE NOTICE '   - حذف المقابلة من قاعدة البيانات';
    RAISE NOTICE '   - إعادة الفترة الزمنية متاحة';
    RAISE NOTICE '   - السماح للمتقدم بحجز موعد جديد';
    RAISE NOTICE '   - تحديث الواجهات فوراً';
END $$;
