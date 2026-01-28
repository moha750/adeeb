-- =====================================================
-- إصلاح سياسات RLS لجدول membership_interviews
-- =====================================================
-- تاريخ الإنشاء: 2026-01-28
-- الوصف: إزالة الاعتماد على check_permission() والاعتماد على role_level فقط
-- المشكلة: خطأ 400 عند محاولة الوصول للجدول بسبب check_permission()
-- =====================================================

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "allow_admin_select_interviews" ON membership_interviews;
DROP POLICY IF EXISTS "allow_admin_insert_interviews" ON membership_interviews;
DROP POLICY IF EXISTS "allow_admin_update_interviews" ON membership_interviews;
DROP POLICY IF EXISTS "allow_superadmin_delete_interviews" ON membership_interviews;

-- إنشاء سياسات جديدة بدون check_permission()

-- القراءة - مستوى 7+
CREATE POLICY "allow_admin_select_interviews"
ON membership_interviews
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
);

-- الإدراج - مستوى 8+
CREATE POLICY "allow_admin_insert_interviews"
ON membership_interviews
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 8
    )
);

-- التحديث - مستوى 8+
CREATE POLICY "allow_admin_update_interviews"
ON membership_interviews
FOR UPDATE
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
);

-- الحذف - مستوى 10
CREATE POLICY "allow_superadmin_delete_interviews"
ON membership_interviews
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 10
    )
);

-- تعليق توضيحي
COMMENT ON TABLE membership_interviews IS 'جدول المقابلات - تم تحديث سياسات RLS لإزالة الاعتماد على check_permission()';
