-- =====================================================
-- إصلاح دوال التحقق من صلاحيات الزيارات
-- =====================================================
-- تاريخ الإنشاء: 2026-01-22
-- الوصف: حذف وإعادة إنشاء الدوال بالتوقيع الصحيح
-- =====================================================

-- حذف الدوال القديمة إن وجدت
DROP FUNCTION IF EXISTS can_view_site_visits(UUID);
DROP FUNCTION IF EXISTS can_manage_site_visits(UUID);

-- =====================================================
-- 1. دالة للتحقق من صلاحية عرض الإحصائيات
-- =====================================================
CREATE OR REPLACE FUNCTION can_view_site_visits(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        JOIN public.role_permissions rp ON r.id = rp.role_id
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = p_user_id
            AND ur.is_active = true
            AND p.permission_key = 'view_site_visits'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. دالة للتحقق من صلاحية إدارة البيانات
-- =====================================================
CREATE OR REPLACE FUNCTION can_manage_site_visits(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        JOIN public.role_permissions rp ON r.id = rp.role_id
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = p_user_id
            AND ur.is_active = true
            AND p.permission_key = 'manage_site_visits'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. منح صلاحيات تنفيذ الدوال
-- =====================================================
GRANT EXECUTE ON FUNCTION can_view_site_visits(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_site_visits(UUID) TO authenticated;

-- =====================================================
-- 4. تعليقات
-- =====================================================
COMMENT ON FUNCTION can_view_site_visits(UUID) IS 'التحقق من صلاحية المستخدم لعرض إحصائيات الزيارات';
COMMENT ON FUNCTION can_manage_site_visits(UUID) IS 'التحقق من صلاحية المستخدم لإدارة بيانات الزيارات';
