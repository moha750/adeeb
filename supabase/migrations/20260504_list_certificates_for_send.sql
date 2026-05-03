-- =============================================
-- RPC: قائمة موحّدة بكل شهادات الحضور (لكل الأنشطة)
-- =============================================
-- لاستخدام صفحة "إرسال الشهادات" المركزية في لوحة التحكم.
-- الصلاحية: admin (role_level >= 8) فقط.
CREATE OR REPLACE FUNCTION list_certificates_for_send()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id  UUID := auth.uid();
    v_is_admin BOOLEAN;
    v_rows     jsonb;
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

    SELECT COALESCE(jsonb_agg(row_data ORDER BY row_data->>'attended_at' DESC NULLS LAST), '[]'::jsonb)
    INTO v_rows
    FROM (
        SELECT jsonb_build_object(
            'id',                  r.id,
            'full_name',           COALESCE(v.full_name, p.full_name),
            'phone',               COALESCE(v.phone, p.phone, md.phone),
            'gender_at_booking',   r.gender_at_booking,
            'account_type',        CASE WHEN r.visitor_id IS NOT NULL THEN 'visitor' ELSE 'member' END,
            'certificate_serial',  r.certificate_serial,
            'attended_at',         r.attended_at,
            'certificate_sent_at', r.certificate_sent_at,
            'activity_id',         a.id,
            'activity_name',       a.name,
            'activity_date',       a.activity_date,
            'activity_type',       a.activity_type
        ) AS row_data
        FROM activity_reservations r
        JOIN activities a ON a.id = r.activity_id
        LEFT JOIN visitors       v  ON v.id = r.visitor_id
        LEFT JOIN profiles       p  ON p.id = r.member_user_id
        LEFT JOIN member_details md ON md.user_id = r.member_user_id
        WHERE r.certificate_serial IS NOT NULL
          AND r.attendance_status = 'attended'
    ) t;

    RETURN v_rows;
END;
$$;

GRANT EXECUTE ON FUNCTION list_certificates_for_send() TO authenticated;
