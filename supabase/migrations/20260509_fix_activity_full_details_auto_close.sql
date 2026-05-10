-- =============================================
-- إصلاح regression في get_activity_full_details
-- =============================================
-- الباغ:
--   ترحيل 20260504_certificate_send_tracking أعاد تعريف الدالة لإضافة
--   certificates_sent_count و certificate_sent_at، لكنه نسخ نسخة قديمة
--   (قبل 20260430_auto_close_attendance) فضاع بلوك التحويل التلقائي
--   من 'registered' إلى 'no_show' بعد ساعة من نهاية النشاط.
--   النتيجة: حجوزات بقيت في حالة "لم يُسجَّل" لأنشطة منتهية منذ أيام.
--
-- الإصلاح:
--   إعادة تعريف الدالة مع دمج:
--     1) منطق الـ lazy auto-close من 20260430_auto_close_attendance
--     2) حقول تتبّع إرسال الشهادات من 20260504_certificate_send_tracking
--   إزالة STABLE لأن الدالة قد تنفّذ UPDATE.

CREATE OR REPLACE FUNCTION get_activity_full_details(p_activity_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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

    -- 1) جلب النشاط كـ ROWTYPE للوصول إلى الحقول الزمنية مباشرة
    SELECT * INTO v_activity FROM activities WHERE id = p_activity_id;

    IF v_activity.id IS NULL THEN
        RAISE EXCEPTION 'ACTIVITY_NOT_FOUND';
    END IF;

    -- 2) Lazy auto-close: بعد ساعة من نهاية النشاط، حوّل المتبقي إلى no_show
    v_window_close := (v_activity.activity_date
                       + COALESCE(v_activity.end_time, v_activity.start_time + INTERVAL '1 hour')
                      )::TIMESTAMPTZ + INTERVAL '1 hour';

    IF NOT v_activity.is_cancelled AND now() > v_window_close THEN
        -- نتجاوز trigger الحماية على أعمدة دورة الحياة
        PERFORM set_config('app.via_lifecycle_fn', 'true', true);

        UPDATE activity_reservations
        SET    attendance_status    = 'no_show',
               attended_at          = NULL,
               attendance_marked_by = NULL,
               certificate_serial   = NULL
        WHERE  activity_id = p_activity_id
          AND  status = 'confirmed'
          AND  attendance_status = 'registered';
    END IF;

    -- 3) تحويل بيانات النشاط إلى jsonb بعد التحديث المحتمل
    SELECT to_jsonb(a) INTO v_activity_json FROM activities a WHERE a.id = p_activity_id;

    -- 4) الإحصائيات
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

    -- 5) الحجوزات
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
            'attendance_status',     r.attendance_status,
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
