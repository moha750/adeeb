-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260130234219   الاسم: add_search_path_to_functions_batch_2

-- Migration: إضافة search_path لجميع Functions (الدفعة 2)

-- Function: handle_new_user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    now(),
    now()
  );
  RETURN NEW;
END;
$$;

-- Function: log_activity
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id uuid,
  p_action_type text,
  p_resource_type text DEFAULT NULL,
  p_resource_id text DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  activity_id uuid;
BEGIN
  INSERT INTO activity_log (
    user_id,
    action_type,
    resource_type,
    resource_id,
    details,
    created_at
  )
  VALUES (
    p_user_id,
    p_action_type,
    p_resource_type,
    p_resource_id,
    p_details,
    now()
  )
  RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$;

-- Function: validate_phone_for_booking
CREATE OR REPLACE FUNCTION validate_phone_for_booking(
  p_session_token text,
  p_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_session_id uuid;
  v_existing_booking record;
  v_result jsonb;
BEGIN
  -- Get session ID from token
  SELECT id INTO v_session_id
  FROM interview_sessions
  WHERE public_link_token = p_session_token
    AND is_active = true;

  IF v_session_id IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'invalid_session'
    );
  END IF;

  -- Check for existing booking
  SELECT 
    s.id as slot_id,
    s.slot_time,
    s.booked_at,
    s.booker_name
  INTO v_existing_booking
  FROM interview_slots s
  WHERE s.session_id = v_session_id
    AND s.booker_phone = p_phone
    AND s.is_booked = true;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'valid', true,
      'has_booking', true,
      'booking', jsonb_build_object(
        'slot_id', v_existing_booking.slot_id,
        'slot_time', v_existing_booking.slot_time,
        'booked_at', v_existing_booking.booked_at,
        'booker_name', v_existing_booking.booker_name
      )
    );
  ELSE
    RETURN jsonb_build_object(
      'valid', true,
      'has_booking', false
    );
  END IF;
END;
$$;

-- Function: book_interview_slot
CREATE OR REPLACE FUNCTION book_interview_slot(
  p_slot_id uuid,
  p_booker_name text,
  p_booker_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_slot record;
  v_result jsonb;
BEGIN
  -- Lock the slot row
  SELECT * INTO v_slot
  FROM interview_slots
  WHERE id = p_slot_id
  FOR UPDATE;

  -- Check if slot exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'slot_not_found'
    );
  END IF;

  -- Check if already booked
  IF v_slot.is_booked THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'slot_already_booked'
    );
  END IF;

  -- Book the slot
  UPDATE interview_slots
  SET 
    is_booked = true,
    booker_name = p_booker_name,
    booker_phone = p_booker_phone,
    booked_at = now()
  WHERE id = p_slot_id;

  RETURN jsonb_build_object(
    'success', true,
    'slot_id', p_slot_id,
    'slot_time', v_slot.slot_time
  );
END;
$$;

COMMENT ON FUNCTION handle_new_user() IS 'معالج المستخدمين الجدد - محمي من SQL Injection';
COMMENT ON FUNCTION log_activity(uuid, text, text, text, jsonb) IS 'تسجيل النشاطات - محمي من SQL Injection';
COMMENT ON FUNCTION validate_phone_for_booking(text, text) IS 'التحقق من رقم الهاتف للحجز - محمي من SQL Injection';
COMMENT ON FUNCTION book_interview_slot(uuid, text, text) IS 'حجز موعد مقابلة - محمي من SQL Injection';
