-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260427001215   الاسم: attendance_windows_riyadh_tz

-- إصلاح: نوافذ الحضور كانت تُحسب بتوقيت UTC بينما activity_date+start_time
-- مُدخَلة بتوقيت الرياض. نُعيد بنائهما بـ AT TIME ZONE 'Asia/Riyadh'.

CREATE OR REPLACE FUNCTION get_active_attendance_windows()
RETURNS TABLE (
    id UUID,
    name TEXT,
    location TEXT,
    activity_date DATE,
    start_time TIME,
    end_time TIME,
    confirmed_count BIGINT
) AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_authorized BOOLEAN;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'NOT_AUTHENTICATED';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = v_user_id
          AND ur.is_active = true
          AND (r.role_level >= 8 OR r.role_name = 'activity_coordinator')
    ) INTO v_authorized;

    IF NOT v_authorized THEN
        RAISE EXCEPTION 'NOT_AUTHORIZED';
    END IF;

    RETURN QUERY
    SELECT
        a.id,
        a.name,
        a.location,
        a.activity_date,
        a.start_time,
        a.end_time,
        COUNT(r.id) FILTER (WHERE r.status = 'confirmed')
    FROM activities a
    LEFT JOIN activity_reservations r ON r.activity_id = a.id
    WHERE a.is_published = true
      AND a.is_cancelled = false
      AND now() BETWEEN
            ((a.activity_date + a.start_time) AT TIME ZONE 'Asia/Riyadh') - INTERVAL '1 hour'
            AND
            ((a.activity_date + COALESCE(a.end_time, a.start_time + INTERVAL '1 hour')) AT TIME ZONE 'Asia/Riyadh') + INTERVAL '1 hour'
    GROUP BY a.id
    ORDER BY a.activity_date, a.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


CREATE OR REPLACE FUNCTION mark_attendance(
    p_reservation_id UUID,
    p_status         TEXT
)
RETURNS TEXT AS $$
DECLARE
    v_user_id     UUID := auth.uid();
    v_authorized  BOOLEAN;
    v_reservation activity_reservations%ROWTYPE;
    v_activity    activities%ROWTYPE;
    v_window_open TIMESTAMPTZ;
    v_window_close TIMESTAMPTZ;
    v_serial      TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'NOT_AUTHENTICATED';
    END IF;

    IF p_status NOT IN ('attended','no_show','registered') THEN
        RAISE EXCEPTION 'INVALID_STATUS';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = v_user_id
          AND ur.is_active = true
          AND (r.role_level >= 8 OR r.role_name = 'activity_coordinator')
    ) INTO v_authorized;

    IF NOT v_authorized THEN
        RAISE EXCEPTION 'NOT_AUTHORIZED';
    END IF;

    SELECT * INTO v_reservation
    FROM activity_reservations
    WHERE id = p_reservation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'RESERVATION_NOT_FOUND';
    END IF;

    IF v_reservation.status = 'cancelled' THEN
        RAISE EXCEPTION 'RESERVATION_CANCELLED';
    END IF;

    SELECT * INTO v_activity
    FROM activities
    WHERE id = v_reservation.activity_id;

    IF v_activity.is_cancelled THEN
        RAISE EXCEPTION 'ACTIVITY_CANCELLED';
    END IF;

    -- النافذة الزمنية بتوقيت الرياض
    v_window_open  := ((v_activity.activity_date + v_activity.start_time) AT TIME ZONE 'Asia/Riyadh') - INTERVAL '1 hour';
    v_window_close := ((v_activity.activity_date + COALESCE(v_activity.end_time, v_activity.start_time + INTERVAL '1 hour')) AT TIME ZONE 'Asia/Riyadh') + INTERVAL '1 hour';

    IF now() < v_window_open OR now() > v_window_close THEN
        RAISE EXCEPTION 'OUTSIDE_ATTENDANCE_WINDOW';
    END IF;

    PERFORM set_config('app.via_lifecycle_fn', 'true', true);

    IF p_status = 'attended' THEN
        v_serial := COALESCE(v_reservation.certificate_serial,
                             generate_certificate_serial(v_activity.activity_date));

        UPDATE activity_reservations
        SET attendance_status      = 'attended',
            attended_at            = COALESCE(attended_at, now()),
            attendance_marked_by   = v_user_id,
            certificate_serial     = v_serial
        WHERE id = p_reservation_id;

        RETURN v_serial;

    ELSIF p_status = 'no_show' THEN
        UPDATE activity_reservations
        SET attendance_status    = 'no_show',
            attended_at          = NULL,
            attendance_marked_by = v_user_id,
            certificate_serial   = NULL
        WHERE id = p_reservation_id;
        RETURN NULL;

    ELSE
        UPDATE activity_reservations
        SET attendance_status    = 'registered',
            attended_at          = NULL,
            attendance_marked_by = v_user_id,
            certificate_serial   = NULL
        WHERE id = p_reservation_id;
        RETURN NULL;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
