-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260130234137   الاسم: fix_permissive_rls_policies_survey_notifications

-- Migration: إصلاح RLS Policy المتساهلة في جدول survey_notifications
-- الهدف: استبدال WITH CHECK (true) بصلاحيات فعلية

-- حذف الـ policy القديمة المتساهلة
DROP POLICY IF EXISTS "survey_notifications_insert_system" ON survey_notifications;

-- إنشاء policy جديدة محكمة
-- السماح بالإضافة فقط لمنشئ الاستبيان أو المدراء
CREATE POLICY "survey_notifications_insert_authorized" ON survey_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- يجب أن يكون المستخدم هو منشئ الاستبيان
  EXISTS (
    SELECT 1 FROM surveys
    WHERE surveys.id = survey_notifications.survey_id
    AND surveys.created_by = auth.uid()
  )
  OR
  -- أو لديه صلاحية إدارة الاستبيانات
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND p.permission_key IN ('surveys.manage', 'system.admin')
  )
);

COMMENT ON POLICY "survey_notifications_insert_authorized" ON survey_notifications IS 'يسمح بإضافة إشعارات الاستبيانات فقط لمنشئ الاستبيان أو المدراء';
