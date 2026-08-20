-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260130234103   الاسم: fix_permissive_rls_policies_achievements

-- Migration: إصلاح RLS Policies المتساهلة في جدول achievements
-- الهدف: استبدال USING (true) و WITH CHECK (true) بصلاحيات فعلية

-- حذف الـ policies القديمة المتساهلة
DROP POLICY IF EXISTS "achievements_delete_authenticated" ON achievements;
DROP POLICY IF EXISTS "achievements_insert_authenticated" ON achievements;
DROP POLICY IF EXISTS "achievements_update_authenticated" ON achievements;

-- إنشاء policies جديدة محكمة بناءً على الصلاحيات
-- السماح بالحذف فقط للمستخدمين ذوي صلاحية achievements.delete
CREATE POLICY "achievements_delete_authorized" ON achievements
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND p.permission_key IN ('achievements.delete', 'achievements.manage', 'system.admin')
  )
  OR
  EXISTS (
    SELECT 1 FROM user_specific_permissions usp
    JOIN permissions p ON usp.permission_id = p.id
    WHERE usp.user_id = auth.uid()
    AND usp.is_granted = true
    AND (usp.expires_at IS NULL OR usp.expires_at > now())
    AND p.permission_key IN ('achievements.delete', 'achievements.manage', 'system.admin')
  )
);

-- السماح بالإضافة فقط للمستخدمين ذوي صلاحية achievements.create
CREATE POLICY "achievements_insert_authorized" ON achievements
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND p.permission_key IN ('achievements.create', 'achievements.manage', 'system.admin')
  )
  OR
  EXISTS (
    SELECT 1 FROM user_specific_permissions usp
    JOIN permissions p ON usp.permission_id = p.id
    WHERE usp.user_id = auth.uid()
    AND usp.is_granted = true
    AND (usp.expires_at IS NULL OR usp.expires_at > now())
    AND p.permission_key IN ('achievements.create', 'achievements.manage', 'system.admin')
  )
);

-- السماح بالتحديث فقط للمستخدمين ذوي صلاحية achievements.update
CREATE POLICY "achievements_update_authorized" ON achievements
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND p.permission_key IN ('achievements.update', 'achievements.manage', 'system.admin')
  )
  OR
  EXISTS (
    SELECT 1 FROM user_specific_permissions usp
    JOIN permissions p ON usp.permission_id = p.id
    WHERE usp.user_id = auth.uid()
    AND usp.is_granted = true
    AND (usp.expires_at IS NULL OR usp.expires_at > now())
    AND p.permission_key IN ('achievements.update', 'achievements.manage', 'system.admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND p.permission_key IN ('achievements.update', 'achievements.manage', 'system.admin')
  )
  OR
  EXISTS (
    SELECT 1 FROM user_specific_permissions usp
    JOIN permissions p ON usp.permission_id = p.id
    WHERE usp.user_id = auth.uid()
    AND usp.is_granted = true
    AND (usp.expires_at IS NULL OR usp.expires_at > now())
    AND p.permission_key IN ('achievements.update', 'achievements.manage', 'system.admin')
  )
);

-- إضافة comment للتوثيق
COMMENT ON POLICY "achievements_delete_authorized" ON achievements IS 'يسمح بحذف الإنجازات فقط للمستخدمين ذوي صلاحية achievements.delete أو achievements.manage أو system.admin';
COMMENT ON POLICY "achievements_insert_authorized" ON achievements IS 'يسمح بإضافة إنجازات فقط للمستخدمين ذوي صلاحية achievements.create أو achievements.manage أو system.admin';
COMMENT ON POLICY "achievements_update_authorized" ON achievements IS 'يسمح بتحديث الإنجازات فقط للمستخدمين ذوي صلاحية achievements.update أو achievements.manage أو system.admin';
