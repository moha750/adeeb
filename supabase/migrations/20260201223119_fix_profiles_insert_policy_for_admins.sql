-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260201223119   الاسم: fix_profiles_insert_policy_for_admins


-- حذف السياسة القديمة
DROP POLICY IF EXISTS profiles_insert_policy ON profiles;

-- إنشاء سياسة جديدة تسمح للمسؤولين بإنشاء profiles للآخرين
CREATE POLICY profiles_insert_policy ON profiles
FOR INSERT
TO authenticated
WITH CHECK (
  -- السماح للمستخدم بإنشاء profile لنفسه
  (id = auth.uid())
  OR
  -- أو السماح للمسؤولين (level >= 8) بإنشاء profiles للآخرين
  (get_user_max_role_level(auth.uid()) >= 8)
);

