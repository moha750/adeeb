-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260201215318   الاسم: fix_rls_policies_for_admin_member_creation


-- حذف السياسات القديمة وإعادة إنشائها بشكل صحيح

-- 1. إصلاح سياسة profiles_insert_policy
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
CREATE POLICY "profiles_insert_policy"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (
  get_user_max_role_level(auth.uid()) >= 8
);

-- 2. إصلاح سياسة user_roles_insert
DROP POLICY IF EXISTS "user_roles_insert" ON user_roles;
CREATE POLICY "user_roles_insert"
ON user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  get_user_max_role_level(auth.uid()) >= 9
);

-- 3. إصلاح سياسة member_onboarding_tokens للإدراج
DROP POLICY IF EXISTS "المسؤولون يمكنهم إدارة جميع tokens" ON member_onboarding_tokens;

-- إنشاء سياسات منفصلة أكثر وضوحاً
CREATE POLICY "member_onboarding_tokens_insert_admin"
ON member_onboarding_tokens
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND r.role_level >= 7
  )
);

CREATE POLICY "member_onboarding_tokens_select_admin"
ON member_onboarding_tokens
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

CREATE POLICY "member_onboarding_tokens_update_admin"
ON member_onboarding_tokens
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
);

CREATE POLICY "member_onboarding_tokens_delete_admin"
ON member_onboarding_tokens
FOR DELETE
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

