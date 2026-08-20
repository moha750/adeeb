-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260130234458   الاسم: add_search_path_booking_functions_corrected

-- Migration: إضافة search_path لـ booking functions (مصححة)

-- Function: cancel_booking (p_slot_id, p_application_id) - RETURNS TABLE
CREATE OR REPLACE FUNCTION cancel_booking(p_slot_id uuid, p_application_id uuid)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    slot_record RECORD;
    interview_record UUID;
BEGIN
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
    
    IF slot_record IS NULL THEN
        RETURN QUERY SELECT false, 'الفترة غير موجودة'::TEXT;
        RETURN;
    END IF;
    
    IF slot_record.is_booked = false THEN
        RETURN QUERY SELECT false, 'الفترة غير محجوزة'::TEXT;
        RETURN;
    END IF;
    
    IF slot_record.booked_by != p_application_id THEN
        RETURN QUERY SELECT false, 'غير مصرح لك بحذف هذا الحجز'::TEXT;
        RETURN;
    END IF;
    
    IF slot_record.cancelled_at IS NOT NULL THEN
        RETURN QUERY SELECT false, 'الحجز ملغى مسبقاً'::TEXT;
        RETURN;
    END IF;
    
    interview_record := slot_record.interview_id;
    
    UPDATE interview_slots
    SET 
        is_booked = false,
        booked_by = NULL,
        booked_at = NULL,
        interview_id = NULL,
        cancelled_at = NULL,
        cancellation_reason = NULL
    WHERE interview_slots.id = p_slot_id;
    
    IF interview_record IS NOT NULL THEN
        DELETE FROM membership_interviews
        WHERE id = interview_record;
    END IF;
    
    RETURN QUERY SELECT true, 'تم إلغاء الحجز بنجاح'::TEXT;
END;
$$;

-- Function: cancel_existing_booking - RETURNS TABLE
CREATE OR REPLACE FUNCTION cancel_existing_booking(p_slot_id uuid, p_application_id uuid)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    slot_record RECORD;
BEGIN
    SELECT * INTO slot_record
    FROM interview_slots
    WHERE id = p_slot_id
    AND booked_by = p_application_id
    AND cancelled_at IS NULL;
    
    IF slot_record IS NULL THEN
        RETURN QUERY SELECT false, 'الحجز غير موجود أو تم إلغاؤه مسبقاً'::TEXT;
        RETURN;
    END IF;
    
    UPDATE interview_slots
    SET 
        is_booked = false,
        booked_by = NULL,
        booked_at = NULL,
        cancelled_at = NOW(),
        cancellation_reason = 'إلغاء من قبل المتقدم',
        interview_id = NULL
    WHERE id = p_slot_id;
    
    IF slot_record.interview_id IS NOT NULL THEN
        DELETE FROM membership_interviews WHERE id = slot_record.interview_id;
    END IF;
    
    RETURN QUERY SELECT true, 'تم إلغاء الحجز بنجاح'::TEXT;
END;
$$;

-- Function: generate_interview_slots (النسخة البسيطة) - RETURNS integer
CREATE OR REPLACE FUNCTION generate_interview_slots(p_session_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    session_record RECORD;
    current_slot_time TIMESTAMPTZ;
    session_end_time TIMESTAMPTZ;
    slot_count INTEGER := 0;
BEGIN
    SELECT * INTO session_record FROM interview_sessions WHERE id = p_session_id;
    
    IF session_record IS NULL THEN
        RAISE EXCEPTION 'الجلسة غير موجودة';
    END IF;
    
    DELETE FROM interview_slots WHERE session_id = p_session_id;
    
    current_slot_time := (session_record.session_date || ' ' || session_record.start_time)::TIMESTAMPTZ;
    session_end_time := (session_record.session_date || ' ' || session_record.end_time)::TIMESTAMPTZ;
    
    WHILE current_slot_time < session_end_time LOOP
        INSERT INTO interview_slots (session_id, slot_time, slot_end_time, is_booked)
        VALUES (p_session_id, current_slot_time, current_slot_time + (session_record.slot_duration || ' minutes')::INTERVAL, false);
        
        slot_count := slot_count + 1;
        current_slot_time := current_slot_time + (session_record.slot_duration || ' minutes')::INTERVAL;
    END LOOP;
    
    RETURN slot_count;
END;
$$;

COMMENT ON FUNCTION cancel_booking(uuid, uuid) IS 'إلغاء حجز بـ application_id - محمي من SQL Injection';
COMMENT ON FUNCTION cancel_existing_booking(uuid, uuid) IS 'إلغاء حجز موجود - محمي من SQL Injection';
COMMENT ON FUNCTION generate_interview_slots(uuid) IS 'توليد مواعيد المقابلات - محمي من SQL Injection';
