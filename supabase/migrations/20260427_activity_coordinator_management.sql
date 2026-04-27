-- =============================================
-- إدارة دور "منسّق نشاط" (إسناد/إلغاء/قائمة/بحث)
-- =============================================
-- جميع الدوال تتطلب صلاحية admin (role_level >= 8).
-- يستطيع الأدمن إسداء مهمة الحضور لأي عضو نشط ثم سحبها لاحقًا.

-- =============================================
-- 1. قائمة المنسّقين الحاليين
-- =============================================
CREATE OR REPLACE FUNCTION list_activity_coordinators()
RETURNS TABLE (
    user_role_id INTEGER,
    user_id UUID,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    is_active BOOLEAN,
    assigned_at TIMESTAMPTZ
) AS $$
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

    RETURN QUERY
    SELECT
        ur.id,
        ur.user_id,
        p.full_name,
        p.email,
        p.phone,
        ur.is_active,
        ur.assigned_at
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    JOIN profiles p ON p.id = ur.user_id
    WHERE r.role_name = 'activity_coordinator'
    ORDER BY ur.is_active DESC, ur.assigned_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- =============================================
-- 2. بحث عن أعضاء (لإسداء المهمة لهم)
-- =============================================
-- يبحث في profiles بالاسم/البريد/الجوال للأعضاء النشطين الذين
-- ليس لديهم دور activity_coordinator نشط حاليًا.
CREATE OR REPLACE FUNCTION search_members_for_coordinator(p_query TEXT)
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    email TEXT,
    phone TEXT
) AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_admin BOOLEAN;
    v_q TEXT;
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

    v_q := '%' || COALESCE(NULLIF(TRIM(p_query), ''), '') || '%';

    RETURN QUERY
    SELECT p.id, p.full_name, p.email, p.phone
    FROM profiles p
    WHERE p.account_status = 'active'
      AND (p.full_name ILIKE v_q OR p.email ILIKE v_q OR COALESCE(p.phone, '') ILIKE v_q)
      AND NOT EXISTS (
          SELECT 1 FROM user_roles ur
          JOIN roles r ON r.id = ur.role_id
          WHERE ur.user_id = p.id
            AND ur.is_active = true
            AND r.role_name = 'activity_coordinator'
      )
    ORDER BY p.full_name
    LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- =============================================
-- 3. إسداء مهمة "منسّق نشاط" لعضو + إشعار
-- =============================================
CREATE OR REPLACE FUNCTION assign_activity_coordinator(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_admin BOOLEAN;
    v_role_id INTEGER;
    v_member_name TEXT;
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

    SELECT full_name INTO v_member_name FROM profiles
    WHERE id = p_user_id AND account_status = 'active';
    IF v_member_name IS NULL THEN
        RAISE EXCEPTION 'MEMBER_NOT_FOUND';
    END IF;

    SELECT id INTO v_role_id FROM roles WHERE role_name = 'activity_coordinator';
    IF v_role_id IS NULL THEN
        RAISE EXCEPTION 'ROLE_NOT_FOUND';
    END IF;

    -- إن وُجد صف معطّل سابقًا — أعد تفعيله، وإلا أنشئ صفًا جديدًا
    IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role_id = v_role_id) THEN
        UPDATE user_roles
        SET is_active = true,
            assigned_at = now(),
            assigned_by = v_user_id
        WHERE user_id = p_user_id AND role_id = v_role_id;
    ELSE
        INSERT INTO user_roles (user_id, role_id, is_active, assigned_by)
        VALUES (p_user_id, v_role_id, true, v_user_id);
    END IF;

    -- إشعار للمستخدم المسدل إليه
    INSERT INTO notifications (
        title, message, type, priority, icon,
        target_audience, target_user_ids,
        sender_id, action_url, action_label, metadata
    ) VALUES (
        'تم إسداء مهمة جديدة',
        'تم إسداء مهمة "تسجيل الحضور" إليك. يمكنك الآن الدخول إلى لوحة التحكم وفتح تبويب "تسجيل الحضور" لتسجيل حضور المسجّلين في الأنشطة الحيّة.',
        'success',
        'normal',
        'fa-clipboard-check',
        'specific_users',
        ARRAY[p_user_id],
        v_user_id,
        '/admin/dashboard.html',
        'فتح لوحة التحكم',
        jsonb_build_object('role', 'activity_coordinator', 'action', 'assigned')
    );

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- =============================================
-- 4. سحب مهمة "منسّق نشاط" من عضو + إشعار
-- =============================================
CREATE OR REPLACE FUNCTION revoke_activity_coordinator(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_admin BOOLEAN;
    v_role_id INTEGER;
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

    SELECT id INTO v_role_id FROM roles WHERE role_name = 'activity_coordinator';
    IF v_role_id IS NULL THEN
        RAISE EXCEPTION 'ROLE_NOT_FOUND';
    END IF;

    UPDATE user_roles
    SET is_active = false
    WHERE user_id = p_user_id AND role_id = v_role_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'COORDINATOR_NOT_FOUND';
    END IF;

    -- إشعار للمستخدم المسحوبة منه المهمة
    INSERT INTO notifications (
        title, message, type, priority, icon,
        target_audience, target_user_ids,
        sender_id, metadata
    ) VALUES (
        'انتهاء مهمة',
        'تم سحب مهمة "تسجيل الحضور" منك. لن يظهر تبويب تسجيل الحضور بعد الآن في لوحتك.',
        'info',
        'normal',
        'fa-clipboard-check',
        'specific_users',
        ARRAY[p_user_id],
        v_user_id,
        jsonb_build_object('role', 'activity_coordinator', 'action', 'revoked')
    );

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- =============================================
-- 5. هل المستخدم الحالي أدمن؟ (للواجهة)
-- =============================================
CREATE OR REPLACE FUNCTION current_user_is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RETURN false;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = v_user_id
          AND ur.is_active = true
          AND r.role_level >= 8
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION list_activity_coordinators()                TO authenticated;
GRANT EXECUTE ON FUNCTION search_members_for_coordinator(TEXT)        TO authenticated;
GRANT EXECUTE ON FUNCTION assign_activity_coordinator(UUID)           TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_activity_coordinator(UUID)           TO authenticated;
GRANT EXECUTE ON FUNCTION current_user_is_admin()                     TO authenticated;
