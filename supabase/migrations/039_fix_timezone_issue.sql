-- ============================================================================
-- إصلاح مشكلة المنطقة الزمنية في نظام حجز المواعيد
-- Migration 039
-- ============================================================================

-- المشكلة:
-- عند إنشاء جلسة تبدأ الساعة 09:00 صباحاً، تظهر في صفحة الحجوزات 12:00 ظهراً
-- السبب: تحويل TIME إلى TIMESTAMPTZ بدون تحديد المنطقة الزمنية يستخدم UTC افتراضياً
-- الحل: إضافة المنطقة الزمنية السعودية (Asia/Riyadh) عند التحويل

-- ============================================================================
-- تحديث دالة توليد الفترات الزمنية
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_interview_slots(
    p_session_id UUID,
    p_session_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_slot_duration INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    current_slot_time TIMESTAMPTZ;
    end_datetime TIMESTAMPTZ;
    slot_count INTEGER := 0;
BEGIN
    -- تحويل التاريخ والوقت إلى timestamptz مع المنطقة الزمنية السعودية
    current_slot_time := ((p_session_date || ' ' || p_start_time)::TIMESTAMP AT TIME ZONE 'Asia/Riyadh');
    end_datetime := ((p_session_date || ' ' || p_end_time)::TIMESTAMP AT TIME ZONE 'Asia/Riyadh');
    
    -- حذف الفترات القديمة إن وجدت
    DELETE FROM interview_slots WHERE session_id = p_session_id;
    
    -- توليد الفترات
    WHILE current_slot_time < end_datetime LOOP
        INSERT INTO interview_slots (
            session_id,
            slot_time,
            slot_end_time,
            is_booked
        ) VALUES (
            p_session_id,
            current_slot_time,
            current_slot_time + (p_slot_duration || ' minutes')::INTERVAL,
            false
        );
        
        slot_count := slot_count + 1;
        current_slot_time := current_slot_time + (p_slot_duration || ' minutes')::INTERVAL;
    END LOOP;
    
    RETURN slot_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- رسالة تأكيد
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ تم إصلاح مشكلة المنطقة الزمنية بنجاح';
    RAISE NOTICE '📌 الآن:';
    RAISE NOTICE '   - جلسة تبدأ 09:00 صباحاً ستظهر 09:00 صباحاً في صفحة الحجوزات';
    RAISE NOTICE '   - جميع الأوقات تستخدم المنطقة الزمنية السعودية (Asia/Riyadh)';
END $$;
