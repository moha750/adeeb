-- =====================================================
-- سياسات الأمان (RLS) لجداول الصلاحيات المركزية
-- Row Level Security Policies for Permissions Tables
-- =====================================================
-- تاريخ الإنشاء: 2026-01-17
-- الوصف: تطبيق سياسات الأمان على جداول الصلاحيات
-- =====================================================

-- =====================================================
-- 1. تفعيل RLS على الجداول
-- =====================================================

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_specific_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions_audit_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. سياسات جدول الصلاحيات (permissions)
-- =====================================================

-- يمكن للجميع قراءة الصلاحيات
CREATE POLICY "permissions_select_policy" ON public.permissions
    FOR SELECT
    USING (true);

-- فقط رئيس النادي يمكنه إدارة الصلاحيات
CREATE POLICY "permissions_manage_policy" ON public.permissions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
                AND ur.is_active = true
                AND r.role_level = 10
        )
    );

-- =====================================================
-- 3. سياسات جدول ربط الأدوار بالصلاحيات (role_permissions)
-- =====================================================

-- يمكن للجميع قراءة صلاحيات الأدوار
CREATE POLICY "role_permissions_select_policy" ON public.role_permissions
    FOR SELECT
    USING (true);

-- فقط من لديه صلاحية إدارة الصلاحيات يمكنه التعديل
CREATE POLICY "role_permissions_manage_policy" ON public.role_permissions
    FOR ALL
    USING (
        check_permission(auth.uid(), 'system.permissions.manage', 'all')
    );

-- =====================================================
-- 4. سياسات جدول الصلاحيات الخاصة (user_specific_permissions)
-- =====================================================

-- المستخدم يمكنه قراءة صلاحياته الخاصة
CREATE POLICY "user_specific_permissions_select_own" ON public.user_specific_permissions
    FOR SELECT
    USING (user_id = auth.uid());

-- من لديه صلاحية إدارة الصلاحيات يمكنه قراءة الكل
CREATE POLICY "user_specific_permissions_select_all" ON public.user_specific_permissions
    FOR SELECT
    USING (
        check_permission(auth.uid(), 'system.permissions.manage', 'all')
    );

-- فقط من لديه صلاحية إدارة الصلاحيات يمكنه التعديل
CREATE POLICY "user_specific_permissions_manage_policy" ON public.user_specific_permissions
    FOR ALL
    USING (
        check_permission(auth.uid(), 'system.permissions.manage', 'all')
    );

-- =====================================================
-- 5. سياسات سجل التدقيق (permissions_audit_log)
-- =====================================================

-- فقط من لديه صلاحية عرض السجلات يمكنه القراءة
CREATE POLICY "permissions_audit_log_select_policy" ON public.permissions_audit_log
    FOR SELECT
    USING (
        check_permission(auth.uid(), 'system.logs.view', 'all')
        OR check_permission(auth.uid(), 'system.permissions.manage', 'all')
    );

-- فقط النظام يمكنه الإدراج (من خلال الدوال)
CREATE POLICY "permissions_audit_log_insert_policy" ON public.permissions_audit_log
    FOR INSERT
    WITH CHECK (true);

-- لا يمكن التعديل أو الحذف
CREATE POLICY "permissions_audit_log_no_update" ON public.permissions_audit_log
    FOR UPDATE
    USING (false);

CREATE POLICY "permissions_audit_log_no_delete" ON public.permissions_audit_log
    FOR DELETE
    USING (false);

-- =====================================================
-- 6. منح الصلاحيات للدوال
-- =====================================================

-- السماح للدوال بالوصول للجداول
GRANT SELECT ON public.permissions TO authenticated;
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT SELECT ON public.user_specific_permissions TO authenticated;
GRANT SELECT ON public.permissions_audit_log TO authenticated;

-- السماح للدوال بالإدراج في سجل التدقيق
GRANT INSERT ON public.permissions_audit_log TO authenticated;

-- =====================================================
-- تعليق ختامي
-- =====================================================

COMMENT ON POLICY "permissions_select_policy" ON public.permissions IS 'يسمح لجميع المستخدمين بقراءة قائمة الصلاحيات';
COMMENT ON POLICY "role_permissions_select_policy" ON public.role_permissions IS 'يسمح لجميع المستخدمين بقراءة صلاحيات الأدوار';
COMMENT ON POLICY "user_specific_permissions_select_own" ON public.user_specific_permissions IS 'يسمح للمستخدم بقراءة صلاحياته الخاصة';
COMMENT ON POLICY "permissions_audit_log_select_policy" ON public.permissions_audit_log IS 'يسمح لمن لديه صلاحية بقراءة سجل التدقيق';
