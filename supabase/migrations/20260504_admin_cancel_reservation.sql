-- =============================================
-- إلغاء حجز نشاط من قِبَل الإدارة
-- =============================================
-- يسمح للإدارة (role_level >= 8) بإلغاء حجز نيابةً عن المستخدم،
-- شريطة أن يكون النشاط لم ينتهِ بعد وأن الحجز مؤكَّد ولم يُسجَّل له حضور أو شهادة.
-- إلغاء الحجز يُحرِّر المقعد تلقائيًا (حساب المقاعد يعتمد على status='confirmed').

ALTER TABLE activity_reservations
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
    ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES profiles(id);

COMMENT ON COLUMN activity_reservations.cancellation_reason IS 'سبب الإلغاء (إلزامي عند إلغاء الإدارة)';
COMMENT ON COLUMN activity_reservations.cancelled_by IS 'المستخدم الذي قام بالإلغاء (NULL إذا ألغاه صاحب الحجز نفسه)';

CREATE OR REPLACE FUNCTION admin_cancel_reservation(
    p_reservation_id UUID,
    p_reason         TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id     UUID := auth.uid();
    v_is_admin    BOOLEAN;
    v_reservation activity_reservations%ROWTYPE;
    v_activity    activities%ROWTYPE;
    v_now_riyadh  TIMESTAMP;
    v_reason      TEXT := NULLIF(BTRIM(p_reason), '');
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'NOT_AUTHENTICATED';
    END IF;

    IF v_reason IS NULL THEN
        RAISE EXCEPTION 'REASON_REQUIRED';
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

    SELECT * INTO v_reservation
    FROM activity_reservations
    WHERE id = p_reservation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'RESERVATION_NOT_FOUND';
    END IF;

    IF v_reservation.status = 'cancelled' THEN
        RETURN true; -- ملغى مسبقًا
    END IF;

    IF v_reservation.attendance_status IN ('attended','no_show')
       OR v_reservation.certificate_serial IS NOT NULL THEN
        RAISE EXCEPTION 'RESERVATION_LOCKED';
    END IF;

    SELECT * INTO v_activity
    FROM activities
    WHERE id = v_reservation.activity_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ACTIVITY_NOT_FOUND';
    END IF;

    -- قاعدة البيانات بتوقيت UTC، لكن activity_date/end_time مُدخلة
    -- بتوقيت السعودية. نقارن الوقت الحالي بعد التحويل لتوقيت الرياض.
    v_now_riyadh := (NOW() AT TIME ZONE 'Asia/Riyadh');
    IF v_activity.activity_date < v_now_riyadh::DATE
       OR (v_activity.activity_date = v_now_riyadh::DATE
           AND COALESCE(v_activity.end_time, TIME '23:59:59') <= v_now_riyadh::TIME) THEN
        RAISE EXCEPTION 'ACTIVITY_PAST';
    END IF;

    UPDATE activity_reservations
    SET status              = 'cancelled',
        cancelled_at        = now(),
        cancelled_by        = v_user_id,
        cancellation_reason = v_reason
    WHERE id = p_reservation_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION admin_cancel_reservation(UUID, TEXT) TO authenticated;

-- =============================================
-- إلغاء حجز نشاط من قِبَل صاحب الحجز نفسه (مع طلب السبب)
-- =============================================
-- نُعيد إنشاء cancel_activity_reservation بتوقيع جديد يستقبل p_reason
-- ويحفظه في cancellation_reason. cancelled_by يبقى NULL لأن الإلغاء ذاتي.
DROP FUNCTION IF EXISTS cancel_activity_reservation(UUID);

CREATE OR REPLACE FUNCTION cancel_activity_reservation(
    p_reservation_id UUID,
    p_reason         TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id       UUID := auth.uid();
    v_reservation   activity_reservations%ROWTYPE;
    v_activity_date DATE;
    v_reason        TEXT := NULLIF(BTRIM(p_reason), '');
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'NOT_AUTHENTICATED';
    END IF;

    IF v_reason IS NULL THEN
        RAISE EXCEPTION 'REASON_REQUIRED';
    END IF;

    SELECT * INTO v_reservation
    FROM activity_reservations
    WHERE id = p_reservation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'RESERVATION_NOT_FOUND';
    END IF;

    -- التحقق من ملكية الحجز
    IF v_reservation.visitor_id IS DISTINCT FROM v_user_id
       AND v_reservation.member_user_id IS DISTINCT FROM v_user_id THEN
        RAISE EXCEPTION 'NOT_OWNER';
    END IF;

    IF v_reservation.status = 'cancelled' THEN
        RETURN true; -- ملغى مسبقًا
    END IF;

    -- منع الإلغاء بعد فوات النشاط
    SELECT activity_date INTO v_activity_date
    FROM activities
    WHERE id = v_reservation.activity_id;

    IF v_activity_date < CURRENT_DATE THEN
        RAISE EXCEPTION 'ACTIVITY_PAST';
    END IF;

    UPDATE activity_reservations
    SET status              = 'cancelled',
        cancelled_at        = now(),
        cancellation_reason = v_reason
        -- cancelled_by يبقى NULL: إلغاء ذاتي من صاحب الحجز
    WHERE id = p_reservation_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION cancel_activity_reservation(UUID, TEXT) TO authenticated;
