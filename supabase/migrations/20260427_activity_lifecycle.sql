-- =============================================
-- دورة حياة الحجز: تأكيد واتساب + حضور + شهادة
-- =============================================
-- يضيف ثلاث ميزات إلى نظام الأنشطة:
--   1. تأكيد يدوي عبر واتساب (whatsapp_confirmed_*)
--   2. تسجيل الحضور في موقع النشاط (attendance_*)
--   3. شهادة حضور إلكترونية (certificate_serial)
--
-- مبدأ الأمان: لا UPDATE مباشر للأعمدة الحساسة من العميل.
-- الدوال SECURITY DEFINER (confirm_whatsapp, mark_attendance) هي البوابة الوحيدة،
-- و trigger يمنع أي تغيير لتلك الأعمدة عبر مسار آخر.

-- =============================================
-- 1. دور جديد: منسّق نشاط
-- =============================================
INSERT INTO roles (role_name, role_name_ar, role_level, role_category, description)
VALUES (
    'activity_coordinator',
    'منسّق نشاط',
    6,
    'committee',
    'يستطيع تسجيل حضور المسجّلين في موقع النشاط أثناء النافذة الزمنية للنشاط فقط'
)
ON CONFLICT (role_name) DO NOTHING;

-- =============================================
-- 2. أعمدة جديدة على activity_reservations
-- =============================================
ALTER TABLE activity_reservations
    ADD COLUMN IF NOT EXISTS whatsapp_confirmed_at  TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS whatsapp_confirmed_by  UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS attendance_status      TEXT NOT NULL DEFAULT 'registered'
        CHECK (attendance_status IN ('registered','attended','no_show')),
    ADD COLUMN IF NOT EXISTS attended_at            TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS attendance_marked_by   UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS certificate_serial     TEXT UNIQUE;

-- attended ⇒ يجب وجود attended_at + certificate_serial
ALTER TABLE activity_reservations
    DROP CONSTRAINT IF EXISTS reservations_attended_requires_serial;
ALTER TABLE activity_reservations
    ADD CONSTRAINT reservations_attended_requires_serial
    CHECK (
        attendance_status <> 'attended'
        OR (attended_at IS NOT NULL AND certificate_serial IS NOT NULL)
    );

-- لا يمكن تسجيل حضور لحجز ملغي
ALTER TABLE activity_reservations
    DROP CONSTRAINT IF EXISTS reservations_cancelled_no_attendance;
ALTER TABLE activity_reservations
    ADD CONSTRAINT reservations_cancelled_no_attendance
    CHECK (
        status <> 'cancelled'
        OR attendance_status = 'registered'
    );

-- فهارس فعّالة للاستعلامات الجديدة
CREATE INDEX IF NOT EXISTS idx_reservations_attended
    ON activity_reservations(activity_id)
    WHERE attendance_status = 'attended';

CREATE INDEX IF NOT EXISTS idx_reservations_pending_whatsapp
    ON activity_reservations(activity_id)
    WHERE whatsapp_confirmed_at IS NULL AND status = 'confirmed';

CREATE INDEX IF NOT EXISTS idx_reservations_certificate_serial
    ON activity_reservations(certificate_serial)
    WHERE certificate_serial IS NOT NULL;

-- =============================================
-- 3. Sequence لأرقام الشهادات
-- =============================================
CREATE SEQUENCE IF NOT EXISTS certificate_serial_seq START 1;

-- =============================================
-- 4. Trigger: منع التعديل المباشر للأعمدة الحساسة
-- =============================================
-- العميل لا يستطيع تغيير attendance_status أو whatsapp_confirmed_at أو
-- certificate_serial مباشرة. الدوال أدناه تضبط app.via_lifecycle_fn
-- محليًا للسماح بمرور التغيير.
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
    THEN
        RAISE EXCEPTION 'LIFECYCLE_COLUMNS_READ_ONLY: استخدم دوال confirm_whatsapp / mark_attendance';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_reservations_lifecycle_guard ON activity_reservations;
CREATE TRIGGER trg_reservations_lifecycle_guard
    BEFORE UPDATE ON activity_reservations
    FOR EACH ROW
    EXECUTE FUNCTION enforce_lifecycle_columns_via_function();

-- =============================================
-- 5. مولّد الرقم التسلسلي للشهادة
-- =============================================
-- التنسيق: ADB-YYYY-NNNN (السنة من تاريخ النشاط لاتساق الأرشفة)
-- ملاحظة: nextval تعمل ذرّيًا حتى تحت ضغط متزامن.
CREATE OR REPLACE FUNCTION generate_certificate_serial(p_activity_date DATE)
RETURNS TEXT AS $$
BEGIN
    RETURN 'ADB-'
        || EXTRACT(YEAR FROM p_activity_date)::TEXT
        || '-'
        || LPAD(nextval('certificate_serial_seq')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

-- =============================================
-- 6. RPC: تأكيد التواصل عبر واتساب (إدارة فقط)
-- =============================================
CREATE OR REPLACE FUNCTION confirm_whatsapp(p_reservation_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_admin BOOLEAN;
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

    PERFORM set_config('app.via_lifecycle_fn', 'true', true);

    UPDATE activity_reservations
    SET whatsapp_confirmed_at = COALESCE(whatsapp_confirmed_at, now()),
        whatsapp_confirmed_by = COALESCE(whatsapp_confirmed_by, v_user_id)
    WHERE id = p_reservation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'RESERVATION_NOT_FOUND';
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- =============================================
-- 7. RPC: تسجيل الحضور (إدارة أو منسّق)
-- =============================================
-- p_status: 'attended' أو 'no_show' أو 'registered' (للتراجع)
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

    -- صلاحية: admin (>=8) أو activity_coordinator
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

    -- النافذة الزمنية: من ساعة قبل البدء حتى ساعة بعد الانتهاء
    -- إن لم يوجد end_time، نفترض ساعة واحدة بعد start_time ثم نضيف ساعة هامش
    v_window_open  := (v_activity.activity_date + v_activity.start_time)::TIMESTAMPTZ - INTERVAL '1 hour';
    v_window_close := (v_activity.activity_date + COALESCE(v_activity.end_time, v_activity.start_time + INTERVAL '1 hour'))::TIMESTAMPTZ + INTERVAL '1 hour';

    IF now() < v_window_open OR now() > v_window_close THEN
        RAISE EXCEPTION 'OUTSIDE_ATTENDANCE_WINDOW';
    END IF;

    PERFORM set_config('app.via_lifecycle_fn', 'true', true);

    IF p_status = 'attended' THEN
        -- لا نولّد serial جديد إذا كان موجودًا (idempotent)
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- =============================================
-- 8. RPC: قائمة المسجّلين لنشاط (للمنسّق/الأدمن)
-- =============================================
CREATE OR REPLACE FUNCTION get_activity_attendance_list(p_activity_id UUID)
RETURNS TABLE (
    reservation_id    UUID,
    full_name         TEXT,
    phone             TEXT,
    gender            TEXT,
    account_type      TEXT,
    attendance_status TEXT,
    attended_at       TIMESTAMPTZ,
    whatsapp_confirmed_at TIMESTAMPTZ
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
        r.id,
        COALESCE(v.full_name, p.full_name) AS full_name,
        COALESCE(v.phone, p.phone)         AS phone,
        r.gender_at_booking,
        CASE WHEN r.visitor_id IS NOT NULL THEN 'visitor' ELSE 'member' END,
        r.attendance_status,
        r.attended_at,
        r.whatsapp_confirmed_at
    FROM activity_reservations r
    LEFT JOIN visitors v ON v.id = r.visitor_id
    LEFT JOIN profiles p ON p.id = r.member_user_id
    WHERE r.activity_id = p_activity_id
      AND r.status = 'confirmed'
    ORDER BY COALESCE(v.full_name, p.full_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- =============================================
-- 9. RPC: قائمة الأنشطة في النافذة الحالية (للمنسّق)
-- =============================================
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
            (a.activity_date + a.start_time)::TIMESTAMPTZ - INTERVAL '1 hour'
            AND
            (a.activity_date + COALESCE(a.end_time, a.start_time + INTERVAL '1 hour'))::TIMESTAMPTZ + INTERVAL '1 hour'
    GROUP BY a.id
    ORDER BY a.activity_date, a.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- =============================================
-- 10. RPC: التحقق العام من شهادة (verify.html)
-- =============================================
-- يستخدم بدون تسجيل دخول. يُرجِع فقط البيانات الضرورية للعرض.
-- لا يكشف phone أو email أو IDs.
CREATE OR REPLACE FUNCTION get_certificate_data(p_serial TEXT)
RETURNS TABLE (
    holder_name   TEXT,
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
-- 11. صلاحيات تنفيذ الدوال
-- =============================================
-- للمصادق عليهم فقط (الدوال نفسها تتحقق من الدور بالداخل)
GRANT EXECUTE ON FUNCTION confirm_whatsapp(UUID)               TO authenticated;
GRANT EXECUTE ON FUNCTION mark_attendance(UUID, TEXT)          TO authenticated;
GRANT EXECUTE ON FUNCTION get_activity_attendance_list(UUID)   TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_attendance_windows()      TO authenticated;

-- التحقق العام للشهادات: متاح حتى للزوار غير المسجّلين
GRANT EXECUTE ON FUNCTION get_certificate_data(TEXT) TO anon, authenticated;

-- منع تشغيل sequence مباشرة من العميل (الدالة فقط تستخدمها)
REVOKE ALL ON SEQUENCE certificate_serial_seq FROM PUBLIC, anon, authenticated;
