-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260130234142   الاسم: fix_permissive_rls_policies_permissions_audit

-- Migration: إصلاح RLS Policy المتساهلة في جدول permissions_audit_log
-- الهدف: استبدال WITH CHECK (true) بصلاحيات فعلية

-- حذف الـ policy القديمة المتساهلة
DROP POLICY IF EXISTS "permissions_audit_log_insert_policy" ON permissions_audit_log;

-- إنشاء policy جديدة محكمة
-- السماح بالإضافة فقط للنظام أو المدراء
CREATE POLICY "permissions_audit_log_insert_authorized" ON permissions_audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  -- يجب أن يكون performed_by هو المستخدم الحالي
  performed_by = auth.uid()
  OR
  -- أو لديه صلاحية إدارة الصلاحيات
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND p.permission_key IN ('system.permissions.manage', 'system.admin')
  )
);

COMMENT ON POLICY "permissions_audit_log_insert_authorized" ON permissions_audit_log IS 'يسمح بتسجيل تدقيق الصلاحيات للمستخدم نفسه أو مدراء النظام';
