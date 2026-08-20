-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260207095149   الاسم: fix_surveys_rls_for_admin


-- إنشاء دالة للتحقق من أن المستخدم لديه دور أدمن (role_level >= 5)
CREATE OR REPLACE FUNCTION public.is_admin_user(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = uid AND r.role_level >= 5
  );
$$;

-- حذف السياسات القديمة
DROP POLICY IF EXISTS surveys_insert_authenticated ON surveys;
DROP POLICY IF EXISTS surveys_update_owner ON surveys;
DROP POLICY IF EXISTS surveys_delete_owner ON surveys;
DROP POLICY IF EXISTS surveys_select_public ON surveys;

-- سياسة القراءة: الاستبيانات المنشورة/النشطة للجميع + كل الاستبيانات للأدمن والمالك
CREATE POLICY surveys_select_all ON surveys FOR SELECT USING (
  status IN ('published', 'active')
  OR auth.uid() = created_by
  OR public.is_admin_user(auth.uid())
);

-- سياسة الإدراج: المالك أو الأدمن
CREATE POLICY surveys_insert_admin ON surveys FOR INSERT WITH CHECK (
  auth.uid() = created_by
  OR public.is_admin_user(auth.uid())
);

-- سياسة التحديث: المالك أو الأدمن
CREATE POLICY surveys_update_admin ON surveys FOR UPDATE USING (
  auth.uid() = created_by
  OR public.is_admin_user(auth.uid())
);

-- سياسة الحذف: المالك أو الأدمن
CREATE POLICY surveys_delete_admin ON surveys FOR DELETE USING (
  auth.uid() = created_by
  OR public.is_admin_user(auth.uid())
);

