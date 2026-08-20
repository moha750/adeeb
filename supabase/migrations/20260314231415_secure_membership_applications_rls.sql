-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260314231415   الاسم: secure_membership_applications_rls


-- سياسات RLS آمنة ومحكمة لجدول membership_applications

-- 1. سياسة INSERT: السماح للجميع بإضافة طلبات (للتسجيل العام)
CREATE POLICY "allow_insert_for_all"
ON membership_applications
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (true);

-- 2. سياسة SELECT: منع القراءة للعامة (لا أحد يمكنه قراءة الطلبات إلا المسؤولين)
CREATE POLICY "allow_select_for_service_role"
ON membership_applications
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.role_name IN ('club_president', 'executive_president', 'committee_leader')
    AND ur.is_active = true
  )
);

-- 3. سياسة UPDATE: المسؤولون فقط
CREATE POLICY "allow_update_for_admins"
ON membership_applications
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.role_name IN ('club_president', 'executive_president')
    AND ur.is_active = true
  )
);

-- 4. سياسة DELETE: المسؤولون فقط
CREATE POLICY "allow_delete_for_admins"
ON membership_applications
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.role_name IN ('club_president', 'executive_president')
    AND ur.is_active = true
  )
);

-- إعادة تفعيل RLS (بدون FORCE)
ALTER TABLE membership_applications ENABLE ROW LEVEL SECURITY;

