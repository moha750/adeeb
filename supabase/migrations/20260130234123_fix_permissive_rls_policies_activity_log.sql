-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260130234123   الاسم: fix_permissive_rls_policies_activity_log

-- Migration: إصلاح RLS Policy المتساهلة في جدول activity_log
-- الهدف: استبدال WITH CHECK (true) بصلاحيات فعلية

-- حذف الـ policy القديمة المتساهلة
DROP POLICY IF EXISTS "activity_log_insert_policy" ON activity_log;

-- إنشاء policy جديدة محكمة
-- السماح بالإضافة فقط من خلال authenticated users أو system triggers
-- ولكن يجب أن يكون user_id مطابق للمستخدم الحالي أو NULL للنظام
CREATE POLICY "activity_log_insert_authorized" ON activity_log
FOR INSERT
TO authenticated
WITH CHECK (
  -- إما أن يكون المستخدم يسجل نشاطه الخاص
  user_id = auth.uid()
  OR
  -- أو يكون لديه صلاحية إدارة النظام لتسجيل نشاطات أخرى
  (
    user_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
      AND p.permission_key IN ('activity_log.manage', 'system.admin')
    )
  )
);

-- السماح للـ public role بالإضافة فقط إذا كان user_id = NULL (system logs)
CREATE POLICY "activity_log_insert_system" ON activity_log
FOR INSERT
TO public
WITH CHECK (
  user_id IS NULL
);

COMMENT ON POLICY "activity_log_insert_authorized" ON activity_log IS 'يسمح للمستخدمين بتسجيل نشاطاتهم الخاصة، أو للمدراء بتسجيل نشاطات أخرى';
COMMENT ON POLICY "activity_log_insert_system" ON activity_log IS 'يسمح بتسجيل نشاطات النظام (user_id = NULL)';
