-- ============================================
-- إصلاح RLS Policies لجدول members
-- تشغيل هذا في Supabase SQL Editor
-- ============================================

-- 1. حذف جميع Policies القديمة
DROP POLICY IF EXISTS "Members can read own data" ON members;
DROP POLICY IF EXISTS "Members can update own data" ON members;
DROP POLICY IF EXISTS "Admins can read all members" ON members;
DROP POLICY IF EXISTS "Admins can manage all members" ON members;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON members;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON members;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON members;

-- 2. تأكد من تفعيل RLS
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- 3. إنشاء Policy للأعضاء - القراءة
CREATE POLICY "Members can read own data"
ON members FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4. إنشاء Policy للأعضاء - التحديث
CREATE POLICY "Members can update own data"
ON members FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. إنشاء Policy للإداريين - القراءة
CREATE POLICY "Admins can read all members"
ON members FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()
    AND admins.is_admin = true
  )
);

-- 6. إنشاء Policy للإداريين - كل العمليات
CREATE POLICY "Admins can manage all members"
ON members FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()
    AND admins.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()
    AND admins.is_admin = true
  )
);

-- 7. التحقق من Policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'members';

-- ============================================
-- ملاحظات:
-- ============================================
-- 1. TO authenticated: يسمح فقط للمستخدمين المسجلين
-- 2. USING: شرط للقراءة والتحديث
-- 3. WITH CHECK: شرط للإدراج والتحديث
-- 4. auth.uid(): معرف المستخدم الحالي من JWT
-- ============================================
