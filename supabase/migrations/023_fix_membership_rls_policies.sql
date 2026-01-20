-- إصلاح سياسات RLS لإدارة العضوية
-- المشكلة: السياسات الحالية تعتمد على check_permission() فقط
-- الحل: إضافة سياسات بديلة تعتمد على الأدوار مباشرة

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "allow_authenticated_select_membership_applications" ON membership_applications;
DROP POLICY IF EXISTS "allow_authenticated_update_membership_applications" ON membership_applications;
DROP POLICY IF EXISTS "allow_authenticated_delete_membership_applications" ON membership_applications;
DROP POLICY IF EXISTS "allow_authenticated_update_membership_settings" ON membership_settings;

-- سياسة قراءة الطلبات - للمستخدمين الإداريين (المستوى 7+)
CREATE POLICY "allow_admin_select_membership_applications"
ON membership_applications
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 7
    )
    OR check_permission(auth.uid(), 'membership.view')
);

-- سياسة تحديث الطلبات - للمستخدمين الإداريين (المستوى 7+)
CREATE POLICY "allow_admin_update_membership_applications"
ON membership_applications
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 7
    )
    OR check_permission(auth.uid(), 'membership.manage')
)
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 7
    )
    OR check_permission(auth.uid(), 'membership.manage')
);

-- سياسة حذف الطلبات - للمستخدمين الإداريين (المستوى 8+)
CREATE POLICY "allow_admin_delete_membership_applications"
ON membership_applications
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 8
    )
    OR check_permission(auth.uid(), 'membership.delete')
);

-- سياسة تحديث الإعدادات - للمستخدمين الإداريين (المستوى 7+)
CREATE POLICY "allow_admin_update_membership_settings"
ON membership_settings
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 7
    )
    OR check_permission(auth.uid(), 'membership.settings')
)
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 7
    )
    OR check_permission(auth.uid(), 'membership.settings')
);

-- تعليقات توضيحية
COMMENT ON POLICY "allow_admin_select_membership_applications" ON membership_applications IS 'السماح للإداريين (المستوى 7+) بعرض الطلبات';
COMMENT ON POLICY "allow_admin_update_membership_applications" ON membership_applications IS 'السماح للإداريين (المستوى 7+) بتحديث الطلبات';
COMMENT ON POLICY "allow_admin_delete_membership_applications" ON membership_applications IS 'السماح للإداريين (المستوى 8+) بحذف الطلبات';
COMMENT ON POLICY "allow_admin_update_membership_settings" ON membership_settings IS 'السماح للإداريين (المستوى 7+) بتعديل إعدادات التسجيل';
