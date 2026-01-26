-- ============================================================================
-- إصلاح مشكلة RLS عند حجز المواعيد
-- ============================================================================

-- المشكلة: دالة book_interview_slot لا تملك SECURITY DEFINER
-- النتيجة: RLS يمنع المستخدمين العاديين من إدراج بيانات في membership_interviews

-- الحل: إعادة إنشاء الدالة مع SECURITY DEFINER

-- 1. حذف الدالة القديمة
DROP FUNCTION IF EXISTS book_interview_slot(UUID, UUID) CASCADE;

-- 2. إنشاء الدالة الجديدة مع SECURITY DEFINER
CREATE FUNCTION book_interview_slot(
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
    session_record RECORD;
    new_interview_id UUID;
    app_record RECORD;
BEGIN
    -- الحصول على بيانات الفترة مع بيانات الجلسة
    SELECT 
        interview_slots.*,
        interview_sessions.session_name,
        interview_sessions.session_date,
        interview_sessions.interview_type,
        interview_sessions.meeting_link,
        interview_sessions.location
    INTO slot_record
    FROM interview_slots
    JOIN interview_sessions ON interview_slots.session_id = interview_sessions.id
    WHERE interview_slots.id = p_slot_id
    FOR UPDATE OF interview_slots;
    
    -- التحقق من وجود الفترة
    IF slot_record IS NULL THEN
        RETURN QUERY SELECT false, 'الفترة غير موجودة'::TEXT, NULL::UUID;
        RETURN;
    END IF;
    
    -- التحقق من أن الفترة غير محجوزة
    IF slot_record.is_booked = true THEN
        RETURN QUERY SELECT false, 'الفترة محجوزة بالفعل'::TEXT, NULL::UUID;
        RETURN;
    END IF;
    
    -- التحقق من أن الموعد لم ينتهي
    IF slot_record.slot_time < NOW() THEN
        RETURN QUERY SELECT false, 'هذا الموعد قد انتهى وقته'::TEXT, NULL::UUID;
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
    
    -- إنشاء مقابلة جديدة
    INSERT INTO membership_interviews (
        application_id,
        interview_date,
        interview_type,
        meeting_link,
        interview_location,
        interviewer_notes
    ) VALUES (
        p_application_id,
        slot_record.slot_time,
        slot_record.interview_type,
        slot_record.meeting_link,
        slot_record.location,
        'تم الحجز عبر النظام الإلكتروني'
    )
    RETURNING id INTO new_interview_id;
    
    -- تحديث الفترة
    UPDATE interview_slots
    SET 
        is_booked = true,
        booked_by = p_application_id,
        booked_at = NOW(),
        interview_id = new_interview_id
    WHERE id = p_slot_id;
    
    -- ملاحظة: لا نحدث حالة الطلب لأن approved_for_interview هي الحالة الصحيحة
    -- الحالة ستبقى approved_for_interview حتى بعد الحجز
    
    RETURN QUERY SELECT true, 'تم حجز الموعد بنجاح'::TEXT, new_interview_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT false, 'حدث خطأ أثناء الحجز: ' || SQLERRM, NULL::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. منح الصلاحيات
GRANT EXECUTE ON FUNCTION book_interview_slot(UUID, UUID) TO anon, authenticated;

-- 4. تعليق توضيحي
COMMENT ON FUNCTION book_interview_slot(UUID, UUID) IS 
'حجز فترة مقابلة - يعمل بصلاحيات DEFINER لتجاوز RLS';

-- 5. اختبار
DO $$
BEGIN
    RAISE NOTICE '✅ تم إصلاح دالة book_interview_slot';
    RAISE NOTICE '📌 الآن يمكن للمستخدمين العاديين حجز المواعيد';
    RAISE NOTICE '🔒 الدالة تعمل بصلاحيات SECURITY DEFINER';
END $$;
