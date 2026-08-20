-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260427021103   الاسم: activity_coordinator_notify

-- إضافة إرسال إشعار عند إسناد/سحب دور "منسّق نشاط"
-- يستخدم نظام notifications بهدف 'specific_users' + target_user_ids

CREATE OR REPLACE FUNCTION assign_activity_coordinator(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_admin BOOLEAN;
    v_role_id INTEGER;
    v_member_name TEXT;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
    SELECT EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id
                   WHERE ur.user_id=v_user_id AND ur.is_active=true AND r.role_level>=8)
    INTO v_is_admin;
    IF NOT v_is_admin THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;

    SELECT full_name INTO v_member_name FROM profiles
    WHERE id = p_user_id AND account_status = 'active';
    IF v_member_name IS NULL THEN RAISE EXCEPTION 'MEMBER_NOT_FOUND'; END IF;

    SELECT id INTO v_role_id FROM roles WHERE role_name = 'activity_coordinator';
    IF v_role_id IS NULL THEN RAISE EXCEPTION 'ROLE_NOT_FOUND'; END IF;

    IF EXISTS (SELECT 1 FROM user_roles WHERE user_id=p_user_id AND role_id=v_role_id) THEN
        UPDATE user_roles SET is_active=true, assigned_at=now(), assigned_by=v_user_id
        WHERE user_id=p_user_id AND role_id=v_role_id;
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


CREATE OR REPLACE FUNCTION revoke_activity_coordinator(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_admin BOOLEAN;
    v_role_id INTEGER;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
    SELECT EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id
                   WHERE ur.user_id=v_user_id AND ur.is_active=true AND r.role_level>=8)
    INTO v_is_admin;
    IF NOT v_is_admin THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;

    SELECT id INTO v_role_id FROM roles WHERE role_name='activity_coordinator';
    IF v_role_id IS NULL THEN RAISE EXCEPTION 'ROLE_NOT_FOUND'; END IF;

    UPDATE user_roles SET is_active=false WHERE user_id=p_user_id AND role_id=v_role_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'COORDINATOR_NOT_FOUND'; END IF;

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
