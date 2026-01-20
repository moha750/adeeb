-- =====================================================
-- إضافة صلاحيات نظام تتبع الزيارات
-- =====================================================
-- تاريخ الإنشاء: 2026-01-20
-- الوصف: إضافة صلاحيات عرض وإدارة إحصائيات الزيارات
-- =====================================================

-- =====================================================
-- 1. إضافة الصلاحيات الجديدة
-- =====================================================

-- صلاحية عرض إحصائيات الزيارات
INSERT INTO public.permissions (permission_key, permission_name_ar, permission_name_en, description, module, is_system)
VALUES 
    ('view_site_visits', 'عرض إحصائيات الزيارات', 'View Site Visits', 'القدرة على عرض إحصائيات زيارات الموقع والتقارير', 'analytics', false),
    ('manage_site_visits', 'إدارة بيانات الزيارات', 'Manage Site Visits', 'القدرة على إدارة وحذف بيانات الزيارات', 'analytics', false),
    ('export_site_visits', 'تصدير بيانات الزيارات', 'Export Site Visits', 'القدرة على تصدير بيانات الزيارات إلى ملفات', 'analytics', false)
ON CONFLICT (permission_key) DO NOTHING;

-- =====================================================
-- 2. منح الصلاحيات للأدوار المناسبة
-- =====================================================

-- منح صلاحية عرض الإحصائيات للأدوار بمستوى 5 فأعلى
-- (رئيس اللجنة، نائب الرئيس، الأمين العام، المجلس الإداري، المجلس الأعلى)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE p.permission_key = 'view_site_visits'
    AND r.role_level >= 5
ON CONFLICT DO NOTHING;

-- منح صلاحية إدارة البيانات للأدوار بمستوى 8 فأعلى
-- (المجلس الإداري والمجلس الأعلى)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE p.permission_key = 'manage_site_visits'
    AND r.role_level >= 8
ON CONFLICT DO NOTHING;

-- منح صلاحية تصدير البيانات للأدوار بمستوى 6 فأعلى
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE p.permission_key = 'export_site_visits'
    AND r.role_level >= 6
ON CONFLICT DO NOTHING;

-- =====================================================
-- 3. دالة للتحقق من صلاحية عرض الإحصائيات
-- =====================================================
CREATE OR REPLACE FUNCTION can_view_site_visits(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        JOIN public.role_permissions rp ON r.id = rp.role_id
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = user_id
            AND ur.is_active = true
            AND p.permission_key = 'view_site_visits'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. دالة للتحقق من صلاحية إدارة البيانات
-- =====================================================
CREATE OR REPLACE FUNCTION can_manage_site_visits(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        JOIN public.role_permissions rp ON r.id = rp.role_id
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = user_id
            AND ur.is_active = true
            AND p.permission_key = 'manage_site_visits'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. منح صلاحيات تنفيذ الدوال
-- =====================================================
GRANT EXECUTE ON FUNCTION can_view_site_visits TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_site_visits TO authenticated;

-- =====================================================
-- 6. تعليقات
-- =====================================================
COMMENT ON FUNCTION can_view_site_visits IS 'التحقق من صلاحية المستخدم لعرض إحصائيات الزيارات';
COMMENT ON FUNCTION can_manage_site_visits IS 'التحقق من صلاحية المستخدم لإدارة بيانات الزيارات';
