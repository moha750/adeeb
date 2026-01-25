-- ============================================================================
-- منع حجز المواعيد المنتهية وإضافة التحقق من الوقت
-- Migration 038
-- ============================================================================

-- ============================================================================
-- 1. تعديل دالة book_interview_slot لمنع حجز المواعيد المنتهية
-- ============================================================================

CREATE OR REPLACE FUNCTION book_interview_slot(
    p_slot_id UUID,
    p_application_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    interview_id UUID
) AS $$
DECLARE
    slot_record RECORD;
    new_interview_id UUID;
BEGIN
    -- الحصول على بيانات الفترة
    SELECT * INTO slot_record
    FROM interview_slots
    WHERE id = p_slot_id
    FOR UPDATE;
    
    -- التحقق من أن الفترة متاحة
    IF slot_record IS NULL THEN
        RETURN QUERY SELECT false, 'الفترة غير موجودة'::TEXT, NULL::UUID;
        RETURN;
    END IF;
    
    IF slot_record.is_booked = true THEN
        RETURN QUERY SELECT false, 'الفترة محجوزة بالفعل'::TEXT, NULL::UUID;
        RETURN;
    END IF;
    
    -- التحقق من أن الموعد لم يدخل وقته أو يتجاوزه
    IF slot_record.slot_time <= NOW() THEN
        RETURN QUERY SELECT false, 'عذراً، هذا الموعد قد انتهى ولا يمكن حجزه'::TEXT, NULL::UUID;
        RETURN;
    END IF;
    
    -- حجز الفترة
    UPDATE interview_slots
    SET 
        is_booked = true,
        booked_by = p_application_id,
        booked_at = NOW()
    WHERE id = p_slot_id
    RETURNING interview_slots.interview_id INTO new_interview_id;
    
    RETURN QUERY SELECT true, 'تم حجز الموعد بنجاح'::TEXT, new_interview_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. إنشاء دالة للحصول على المواعيد المتاحة (غير المحجوزة وغير المنتهية)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_available_slots(
    p_session_id UUID
)
RETURNS TABLE (
    id UUID,
    session_id UUID,
    slot_time TIMESTAMPTZ,
    slot_end_time TIMESTAMPTZ,
    is_booked BOOLEAN,
    is_expired BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        interview_slots.id,
        interview_slots.session_id,
        interview_slots.slot_time,
        interview_slots.slot_end_time,
        interview_slots.is_booked,
        (interview_slots.slot_time <= NOW()) AS is_expired
    FROM interview_slots
    WHERE interview_slots.session_id = p_session_id
    ORDER BY interview_slots.slot_time ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. تعليقات توضيحية
-- ============================================================================

COMMENT ON FUNCTION book_interview_slot(UUID, UUID) IS 
'حجز فترة مقابلة مع التحقق من أن الموعد لم ينتهي وقته';

COMMENT ON FUNCTION get_available_slots(UUID) IS 
'الحصول على جميع الفترات مع تحديد المنتهية منها';

-- ============================================================================
-- 4. رسالة تأكيد
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ تم تحديث نظام الحجز بنجاح';
    RAISE NOTICE '📌 الآن:';
    RAISE NOTICE '   - لا يمكن حجز المواعيد التي دخل أو تجاوز وقتها';
    RAISE NOTICE '   - دالة get_available_slots تحدد المواعيد المنتهية';
END $$;
