-- =============================================
-- تتبع إرسال الشهادات عبر واتساب
-- =============================================
-- يضيف:
--   1. عمودان جديدان لتتبع إرسال الشهادة (certificate_sent_at/by)
--   2. RPC: mark_certificate_sent — لتسجيل إرسال الشهادة (إدارة فقط)
--   3. تحديث trigger الحماية لمنع التعديل المباشر للحقلين الجديدين
--   4. تحديث get_activity_full_details لإرجاع الحقلين الجديدين + إحصاء
--   5. تحديث get_certificate_data لإضافة gender (لاختيار قالب الشهادة)

-- =============================================
-- 1. أعمدة جديدة على activity_reservations
-- =============================================
ALTER TABLE activity_reservations
    ADD COLUMN IF NOT EXISTS certificate_sent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS certificate_sent_by UUID REFERENCES auth.users(id);

-- =============================================
-- 2. تحديث trigger الحماية ليشمل الحقلين الجديدين
-- =============================================
CREATE OR REPLACE FUNCTION enforce_lifecycle_columns_via_function()
RETURNS TRIGGER AS $$
DECLARE
    v_via TEXT := current_setting('app.via_lifecycle_fn', true);
BEGIN
    IF v_via = 'true' THEN
        RETURN NEW;
    END IF;

    IF NEW.attendance_status   IS DISTINCT FROM OLD.attendance_status
       OR NEW.attended_at      IS DISTINCT FROM OLD.attended_at
       OR NEW.attendance_marked_by IS DISTINCT FROM OLD.attendance_marked_by
       OR NEW.certificate_serial   IS DISTINCT FROM OLD.certificate_serial
       OR NEW.whatsapp_confirmed_at IS DISTINCT FROM OLD.whatsapp_confirmed_at
       OR NEW.whatsapp_confirmed_by IS DISTINCT FROM OLD.whatsapp_confirmed_by
       OR NEW.certificate_sent_at  IS DISTINCT FROM OLD.certificate_sent_at
       OR NEW.certificate_sent_by  IS DISTINCT FROM OLD.certificate_sent_by
    THEN
        RAISE EXCEPTION 'LIFECYCLE_COLUMNS_READ_ONLY: استخدم دوال confirm_whatsapp / mark_attendance / mark_certificate_sent';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

-- =============================================
-- 3. RPC: تسجيل إرسال الشهادة (إدارة فقط)
-- =============================================
-- Idempotent: إعادة الاستدعاء تُحدِّث التاريخ — لدعم إعادة الإرسال إذا فقد المستلم الرابط.
-- شرط: لا يمكن تسجيل إرسال شهادة لم تُولَّد بعد (يجب وجود certificate_serial).
CREATE OR REPLACE FUNCTION mark_certificate_sent(p_reservation_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_admin BOOLEAN;
    v_serial TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'NOT_AUTHENTICATED';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = v_user_id
          AND ur.is_active = true
          AND r.role_level >= 8
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'NOT_AUTHORIZED';
    END IF;

    SELECT certificate_serial INTO v_serial
    FROM activity_reservations
    WHERE id = p_reservation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'RESERVATION_NOT_FOUND';
    END IF;

    IF v_serial IS NULL THEN
        RAISE EXCEPTION 'CERTIFICATE_NOT_ISSUED';
    END IF;

    PERFORM set_config('app.via_lifecycle_fn', 'true', true);

    UPDATE activity_reservations
    SET certificate_sent_at = now(),
        certificate_sent_by = v_user_id
    WHERE id = p_reservation_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- =============================================
-- 4. تحديث get_activity_full_details
-- =============================================
-- يُضاف certificate_sent_at للحجوزات و certificates_sent_count للإحصائيات
CREATE OR REPLACE FUNCTION get_activity_full_details(p_activity_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id      UUID := auth.uid();
    v_is_admin     BOOLEAN;
    v_activity     jsonb;
    v_stats        jsonb;
    v_reservations jsonb;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'NOT_AUTHENTICATED';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = v_user_id
          AND ur.is_active = true
          AND r.role_level >= 8
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'NOT_AUTHORIZED';
    END IF;

    SELECT to_jsonb(a) INTO v_activity
    FROM activities a
    WHERE a.id = p_activity_id;

    IF v_activity IS NULL THEN
        RAISE EXCEPTION 'ACTIVITY_NOT_FOUND';
    END IF;

    SELECT jsonb_build_object(
        'registered_count',          COUNT(*) FILTER (WHERE r.status = 'confirmed'),
        'whatsapp_confirmed_count',  COUNT(*) FILTER (WHERE r.status = 'confirmed' AND r.whatsapp_confirmed_at IS NOT NULL),
        'attended_count',            COUNT(*) FILTER (WHERE r.attendance_status = 'attended'),
        'no_show_count',             COUNT(*) FILTER (WHERE r.attendance_status = 'no_show'),
        'pending_attendance_count',  COUNT(*) FILTER (WHERE r.status = 'confirmed' AND r.attendance_status = 'registered'),
        'certificates_issued_count', COUNT(*) FILTER (WHERE r.certificate_serial IS NOT NULL),
        'certificates_sent_count',   COUNT(*) FILTER (WHERE r.certificate_sent_at IS NOT NULL),
        'cancelled_count',           COUNT(*) FILTER (WHERE r.status = 'cancelled'),
        'attendance_rate',           CASE
            WHEN COUNT(*) FILTER (WHERE r.status = 'confirmed') = 0 THEN 0
            ELSE ROUND(
                COUNT(*) FILTER (WHERE r.attendance_status = 'attended')::numeric
                / COUNT(*) FILTER (WHERE r.status = 'confirmed')::numeric,
                4
            )
        END
    ) INTO v_stats
    FROM activity_reservations r
    WHERE r.activity_id = p_activity_id;

    SELECT COALESCE(jsonb_agg(row_data ORDER BY row_data->>'reserved_at' DESC), '[]'::jsonb)
    INTO v_reservations
    FROM (
        SELECT jsonb_build_object(
            'id',                   r.id,
            'full_name',            COALESCE(v.full_name, p.full_name),
            'phone',                COALESCE(v.phone, p.phone, md.phone),
            'email',                COALESCE(v.email, p.email),
            'gender_at_booking',    r.gender_at_booking,
            'account_type',         CASE WHEN r.visitor_id IS NOT NULL THEN 'visitor' ELSE 'member' END,
            'status',               r.status,
            'reserved_at',          r.reserved_at,
            'cancelled_at',         r.cancelled_at,
            'whatsapp_confirmed_at', r.whatsapp_confirmed_at,
            'attendance_status',    r.attendance_status,
            'attended_at',          r.attended_at,
            'certificate_serial',   r.certificate_serial,
            'certificate_sent_at',  r.certificate_sent_at
        ) AS row_data
        FROM activity_reservations r
        LEFT JOIN visitors       v  ON v.id = r.visitor_id
        LEFT JOIN profiles       p  ON p.id = r.member_user_id
        LEFT JOIN member_details md ON md.user_id = r.member_user_id
        WHERE r.activity_id = p_activity_id
    ) t;

    RETURN jsonb_build_object(
        'activity',     v_activity,
        'stats',        v_stats,
        'reservations', v_reservations
    );
END;
$$;

-- =============================================
-- 5. تحديث get_certificate_data — إضافة gender
-- =============================================
-- يُضاف holder_gender لاختيار قالب الشهادة الصحيح في صفحة التحميل العامة.
-- لا يكشف بيانات حساسة (الجنس مرئي ضمنياً في قالب الشهادة على أي حال).
DROP FUNCTION IF EXISTS get_certificate_data(TEXT);

CREATE OR REPLACE FUNCTION get_certificate_data(p_serial TEXT)
RETURNS TABLE (
    holder_name   TEXT,
    holder_gender TEXT,
    activity_name TEXT,
    activity_date DATE,
    activity_type TEXT,
    issued_at     TIMESTAMPTZ
) AS $$
BEGIN
    IF p_serial IS NULL OR p_serial = '' THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        COALESCE(v.full_name, p.full_name)   AS holder_name,
        r.gender_at_booking                  AS holder_gender,
        a.name                               AS activity_name,
        a.activity_date,
        a.activity_type,
        r.attended_at                        AS issued_at
    FROM activity_reservations r
    JOIN activities a ON a.id = r.activity_id
    LEFT JOIN visitors v ON v.id = r.visitor_id
    LEFT JOIN profiles p ON p.id = r.member_user_id
    WHERE r.certificate_serial = p_serial
      AND r.attendance_status  = 'attended';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

-- =============================================
-- 6. صلاحيات
-- =============================================
GRANT EXECUTE ON FUNCTION mark_certificate_sent(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_certificate_data(TEXT)  TO anon, authenticated;
