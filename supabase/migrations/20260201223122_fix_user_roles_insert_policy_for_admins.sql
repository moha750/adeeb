-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260201223122   الاسم: fix_user_roles_insert_policy_for_admins


-- حذف السياسة القديمة
DROP POLICY IF EXISTS user_roles_insert ON user_roles;

-- إنشاء سياسة جديدة تسمح للمسؤولين بإنشاء أدوار للآخرين
CREATE POLICY user_roles_insert ON user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  -- السماح للمسؤولين (level >= 7) بإنشاء أدوار للآخرين
  get_user_max_role_level(auth.uid()) >= 7
);

