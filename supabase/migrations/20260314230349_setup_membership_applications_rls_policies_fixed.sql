-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260314230349   الاسم: setup_membership_applications_rls_policies_fixed


-- إنشاء سياسات RLS محكمة وآمنة لجدول membership_applications

-- 1. سياسة INSERT: السماح لأي شخص (anon) بتسجيل عضوية جديدة
CREATE POLICY "Enable insert for anon users"
ON membership_applications
FOR INSERT
TO anon
WITH CHECK (true);

-- 2. سياسة SELECT: السماح للمستخدمين المصادقين برؤية طلباتهم فقط
CREATE POLICY "Enable select for authenticated users own data"
ON membership_applications
FOR SELECT
TO authenticated
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR phone = (SELECT raw_user_meta_data->>'phone' FROM auth.users WHERE id = auth.uid())
);

-- 3. سياسة SELECT: السماح للمسؤولين برؤية جميع الطلبات
CREATE POLICY "Enable select for admins"
ON membership_applications
FOR SELECT
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

-- 4. سياسة UPDATE: السماح للمسؤولين بتحديث حالة الطلبات
CREATE POLICY "Enable update for admins"
ON membership_applications
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
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.role_name IN ('club_president', 'executive_president')
    AND ur.is_active = true
  )
);

-- إعادة تفعيل RLS
ALTER TABLE membership_applications ENABLE ROW LEVEL SECURITY;

-- فرض RLS حتى على مالك الجدول
ALTER TABLE membership_applications FORCE ROW LEVEL SECURITY;

