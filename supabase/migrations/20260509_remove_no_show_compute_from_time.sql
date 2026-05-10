-- =============================================
-- إعادة هيكلة: حذف 'no_show' من القيم المخزَّنة
-- =============================================
-- المنطق:
--   "غائب" ليست قراراً يدوياً — هي نتيجة محسوبة من الزمن:
--     "registered" + النشاط انتهى منذ أكثر من ساعة + ليس ملغى ⇒ غائب.
--   لذلك لا داعي لتخزينها كقيمة ثالثة في العمود.
--
-- يستبدل تماماً ترحيلَي:
--   - 20260430_auto_close_attendance.sql       (auto-close داخل قراءة)
--   - 20260509_fix_activity_full_details_auto_close.sql  (إصلاح regression)
--
-- التغييرات:
--   1) UPDATE: تحويل كل 'no_show' الموجودة إلى 'registered'
--   2) ALTER:  تقليص CHECK constraint إلى قيمتين فقط
--   3) FN:     mark_attendance يرفض 'no_show' كقيمة قادمة
--   4) FN:     get_activity_full_details يحسب الحالة من الزمن (STABLE مجدداً)

-- =============================================
-- 1) ترحيل البيانات: no_show ⇒ registered
-- =============================================
-- نتجاوز trigger الحماية على أعمدة دورة الحياة
SELECT set_config('app.via_lifecycle_fn', 'true', true);

UPDATE activity_reservations
SET    attendance_status    = 'registered',
       attended_at          = NULL,
       attendance_marked_by = NULL,
       certificate_serial   = NULL
WHERE  attendance_status = 'no_show';

-- =============================================
-- 2) تقليص CHECK constraint إلى قيمتين
-- =============================================
ALTER TABLE activity_reservations
    DROP CONSTRAINT IF EXISTS activity_reservations_attendance_status_check;

ALTER TABLE activity_reservations
    ADD CONSTRAINT activity_reservations_attendance_status_check
    CHECK (attendance_status IN ('registered','attended'));

-- =============================================
-- 3) mark_attendance: لم يعد يقبل 'no_show'
-- =============================================
-- 'no_show' لم تكن تُستخدم يدوياً قط (الـ frontend toggle بين attended ⇄ registered)،
-- لكن نحتفظ بفرع 'registered' للسماح للمنسّق بالتراجع عن "حاضر".
CREATE OR REPLACE FUNCTION public.mark_attendance(p_reservation_id uuid, p_status text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id      UUID := auth.uid();
    v_authorized   BOOLEAN;
    v_reservation  activity_reservations%ROWTYPE;
    v_activity     activities%ROWTYPE;
    v_window_open  TIMESTAMPTZ;
    v_window_close TIMESTAMPTZ;
    v_serial       TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'NOT_AUTHENTICATED';
    END IF;

    IF p_status NOT IN ('attended','registered') THEN
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

    -- النافذة الزمنية للتسجيل اليدوي (بتوقيت الرياض)
    v_window_open  := ((v_activity.activity_date + v_activity.start_time)
                      AT TIME ZONE 'Asia/Riyadh') - INTERVAL '1 hour';
    v_window_close := ((v_activity.activity_date
                        + COALESCE(v_activity.end_time, v_activity.start_time + INTERVAL '1 hour'))
                      AT TIME ZONE 'Asia/Riyadh') + INTERVAL '1 hour';

    IF now() < v_window_open OR now() > v_window_close THEN
        RAISE EXCEPTION 'OUTSIDE_ATTENDANCE_WINDOW';
    END IF;

    PERFORM set_config('app.via_lifecycle_fn', 'true', true);

    IF p_status = 'attended' THEN
        v_serial := COALESCE(v_reservation.certificate_serial,
                             generate_certificate_serial(v_activity.activity_date));

        UPDATE activity_reservations
        SET attendance_status    = 'attended',
            attended_at          = COALESCE(attended_at, now()),
            attendance_marked_by = v_user_id,
            certificate_serial   = v_serial
        WHERE id = p_reservation_id;

        RETURN v_serial;

    ELSE  -- 'registered' (تراجع)
        UPDATE activity_reservations
        SET attendance_status    = 'registered',
            attended_at          = NULL,
            attendance_marked_by = v_user_id,
            certificate_serial   = NULL
        WHERE id = p_reservation_id;
        RETURN NULL;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_attendance(uuid, text) TO authenticated;

-- =============================================
-- 4) get_activity_full_details: قراءة محضة (STABLE)
-- =============================================
-- الحالة الفعّالة (effective_status) تُحسب من الزمن:
--   - 'attended'    إذا attendance_status = 'attended'
--   - 'no_show'     إذا confirmed + registered + النشاط ليس ملغى + مرّت ساعة على نهايته
--   - 'registered'  وإلا
-- output الـ RPC يُرجع attendance_status بالقيمة المحسوبة (الواجهة لا تُلاحظ الفرق).

CREATE OR REPLACE FUNCTION get_activity_full_details(p_activity_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id       UUID := auth.uid();
    v_is_admin      BOOLEAN;
    v_activity      activities%ROWTYPE;
    v_window_close  TIMESTAMPTZ;
    v_activity_json jsonb;
    v_stats         jsonb;
    v_reservations  jsonb;
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

    SELECT * INTO v_activity FROM activities WHERE id = p_activity_id;

    IF v_activity.id IS NULL THEN
        RAISE EXCEPTION 'ACTIVITY_NOT_FOUND';
    END IF;

    -- نافذة الإغلاق: ساعة بعد نهاية النشاط
    v_window_close := (v_activity.activity_date
                       + COALESCE(v_activity.end_time, v_activity.start_time + INTERVAL '1 hour')
                      )::TIMESTAMPTZ + INTERVAL '1 hour';

    SELECT to_jsonb(a) INTO v_activity_json FROM activities a WHERE a.id = p_activity_id;

    -- الإحصائيات: no_show و pending_attendance يُحسبان من الزمن لحظياً
    SELECT jsonb_build_object(
        'registered_count',          COUNT(*) FILTER (WHERE r.status = 'confirmed'),
        'whatsapp_confirmed_count',  COUNT(*) FILTER (WHERE r.status = 'confirmed' AND r.whatsapp_confirmed_at IS NOT NULL),
        'attended_count',            COUNT(*) FILTER (WHERE r.attendance_status = 'attended'),
        'no_show_count',             COUNT(*) FILTER (
            WHERE r.status = 'confirmed'
              AND r.attendance_status = 'registered'
              AND NOT v_activity.is_cancelled
              AND now() > v_window_close
        ),
        'pending_attendance_count',  COUNT(*) FILTER (
            WHERE r.status = 'confirmed'
              AND r.attendance_status = 'registered'
              AND (v_activity.is_cancelled OR now() <= v_window_close)
        ),
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

    -- الحجوزات: attendance_status يُرجع كقيمة محسوبة (effective status)
    SELECT COALESCE(jsonb_agg(row_data ORDER BY row_data->>'reserved_at' DESC), '[]'::jsonb)
    INTO v_reservations
    FROM (
        SELECT jsonb_build_object(
            'id',                    r.id,
            'full_name',             COALESCE(v.full_name, p.full_name),
            'phone',                 COALESCE(v.phone, p.phone, md.phone),
            'email',                 COALESCE(v.email, p.email),
            'gender_at_booking',     r.gender_at_booking,
            'account_type',          CASE WHEN r.visitor_id IS NOT NULL THEN 'visitor' ELSE 'member' END,
            'status',                r.status,
            'reserved_at',           r.reserved_at,
            'cancelled_at',          r.cancelled_at,
            'whatsapp_confirmed_at', r.whatsapp_confirmed_at,
            'attendance_status',     CASE
                WHEN r.attendance_status = 'attended' THEN 'attended'
                WHEN r.status = 'confirmed'
                     AND NOT v_activity.is_cancelled
                     AND now() > v_window_close
                THEN 'no_show'
                ELSE 'registered'
            END,
            'attended_at',           r.attended_at,
            'certificate_serial',    r.certificate_serial,
            'certificate_sent_at',   r.certificate_sent_at
        ) AS row_data
        FROM activity_reservations r
        LEFT JOIN visitors       v  ON v.id = r.visitor_id
        LEFT JOIN profiles       p  ON p.id = r.member_user_id
        LEFT JOIN member_details md ON md.user_id = r.member_user_id
        WHERE r.activity_id = p_activity_id
    ) t;

    RETURN jsonb_build_object(
        'activity',     v_activity_json,
        'stats',        v_stats,
        'reservations', v_reservations
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_activity_full_details(UUID) TO authenticated;
