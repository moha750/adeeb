-- =============================================
-- صفحة تفاصيل النشاط (أرشيف موحّد)
-- =============================================
-- RPC واحد يجمع كل ما يخص نشاطًا واحدًا في استدعاء واحد:
--   - بيانات النشاط
--   - إحصائيات (مسجّلون، مؤكَّدو واتساب، حاضرون، غائبون، شهادات، نسبة حضور)
--   - قائمة كاملة بالحجوزات مع كل حالاتها
--
-- الصلاحية: admin (role_level >= 8) فقط — نفس مستوى confirm_whatsapp.

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

    -- 1) بيانات النشاط
    SELECT to_jsonb(a) INTO v_activity
    FROM activities a
    WHERE a.id = p_activity_id;

    IF v_activity IS NULL THEN
        RAISE EXCEPTION 'ACTIVITY_NOT_FOUND';
    END IF;

    -- 2) الإحصائيات (تحسب من الحجوزات المؤكّدة فقط — الملغاة لا تُحتسب)
    SELECT jsonb_build_object(
        'registered_count',          COUNT(*) FILTER (WHERE r.status = 'confirmed'),
        'whatsapp_confirmed_count',  COUNT(*) FILTER (WHERE r.status = 'confirmed' AND r.whatsapp_confirmed_at IS NOT NULL),
        'attended_count',            COUNT(*) FILTER (WHERE r.attendance_status = 'attended'),
        'no_show_count',             COUNT(*) FILTER (WHERE r.attendance_status = 'no_show'),
        'pending_attendance_count',  COUNT(*) FILTER (WHERE r.status = 'confirmed' AND r.attendance_status = 'registered'),
        'certificates_issued_count', COUNT(*) FILTER (WHERE r.certificate_serial IS NOT NULL),
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

    -- 3) قائمة الحجوزات الكاملة مع بيانات الحاجز
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
            'certificate_serial',   r.certificate_serial
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

GRANT EXECUTE ON FUNCTION get_activity_full_details(UUID) TO authenticated;
