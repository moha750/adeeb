-- ============================================
-- إصلاح بسيط وسريع لـ RLS
-- نسخ ولصق في Supabase SQL Editor
-- ============================================

-- 1. حذف جميع Policies
DROP POLICY IF EXISTS "Members can read own data" ON members;
DROP POLICY IF EXISTS "Members can update own data" ON members;
DROP POLICY IF EXISTS "Allow activation update" ON members;
DROP POLICY IF EXISTS "Admins can read all members" ON members;
DROP POLICY IF EXISTS "Admins can insert members" ON members;
DROP POLICY IF EXISTS "Admins can manage all members" ON members;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON members;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON members;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON members;

-- 2. تفعيل RLS
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- 3. Policy واحدة بسيطة للأعضاء - القراءة
CREATE POLICY "Members can read own data"
ON members FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4. Policy واحدة بسيطة للأعضاء - التحديث
-- هذه تسمح بالتحديث سواء user_id موجود أو NULL
CREATE POLICY "Members can update own data"
ON members FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id OR user_id IS NULL
);

-- 5. Policy للإداريين - كل العمليات
CREATE POLICY "Admins full access"
ON members FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()
    AND admins.is_admin = true
  )
);

-- 6. التحقق
SELECT 
  policyname, 
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN substring(qual from 1 for 50)
    ELSE 'N/A'
  END as using_clause
FROM pg_policies 
WHERE tablename = 'members'
ORDER BY policyname;

-- ============================================
-- يجب أن ترى 3 Policies:
-- 1. Admins full access (ALL)
-- 2. Members can read own data (SELECT)
-- 3. Members can update own data (UPDATE)
-- ============================================
