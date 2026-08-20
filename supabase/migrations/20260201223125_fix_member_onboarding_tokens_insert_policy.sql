-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260201223125   الاسم: fix_member_onboarding_tokens_insert_policy


-- حذف السياسة القديمة
DROP POLICY IF EXISTS member_onboarding_tokens_insert_admin ON member_onboarding_tokens;

-- إنشاء سياسة جديدة تسمح للمسؤولين بإنشاء tokens
CREATE POLICY member_onboarding_tokens_insert_admin ON member_onboarding_tokens
FOR INSERT
TO authenticated
WITH CHECK (
  -- السماح للمسؤولين (level >= 7) بإنشاء tokens
  EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND r.role_level >= 7
  )
);

