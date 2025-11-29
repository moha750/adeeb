-- ============================================
-- RLS Policies الكاملة لجدول members
-- آخر تحديث: نوفمبر 2024
-- ============================================

-- ============================================
-- الخطوة 1: تنظيف Policies القديمة
-- ============================================

DROP POLICY IF EXISTS "Members can read own data" ON members;
DROP POLICY IF EXISTS "Members can update own data" ON members;
DROP POLICY IF EXISTS "Allow activation update" ON members;
DROP POLICY IF EXISTS "Admins can read all members" ON members;
DROP POLICY IF EXISTS "Admins can insert members" ON members;
DROP POLICY IF EXISTS "Admins can manage all members" ON members;
DROP POLICY IF EXISTS "Admins full access" ON members;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON members;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON members;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON members;
DROP POLICY IF EXISTS "members_modify_admins_only" ON members;
DROP POLICY IF EXISTS "members_select_admins_only" ON members;
DROP POLICY IF EXISTS "members_read" ON members;
DROP POLICY IF EXISTS "members_update" ON members;
DROP POLICY IF EXISTS "admins_all" ON members;

-- ============================================
-- الخطوة 2: تفعيل RLS
-- ============================================

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- الخطوة 3: Policies للأعضاء
-- ============================================

-- Policy 1: قراءة البيانات الخاصة
CREATE POLICY "Members can read own data"
ON members FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy 2: تحديث البيانات الخاصة
CREATE POLICY "Members can update own data"
ON members FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 3: السماح بالتحديث أثناء التفعيل (عندما user_id = NULL)
-- هذه Policy مهمة جداً لعملية التفعيل
CREATE POLICY "Allow activation update"
ON members FOR UPDATE
TO authenticated
USING (user_id IS NULL)
WITH CHECK (true);

-- ============================================
-- الخطوة 4: Policies للإداريين
-- ============================================

-- Policy 4: قراءة جميع الأعضاء
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

-- Policy 5: إضافة أعضاء جدد
CREATE POLICY "Admins can insert members"
ON members FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()
    AND admins.is_admin = true
  )
);

-- Policy 6: إدارة كاملة لجميع الأعضاء
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

-- ============================================
-- الخطوة 5: التحقق من النجاح
-- ============================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN substring(qual from 1 for 60)
    ELSE 'N/A'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN substring(with_check from 1 for 60)
    ELSE 'N/A'
  END as with_check_clause
FROM pg_policies
WHERE tablename = 'members'
ORDER BY policyname;

-- ============================================
-- النتيجة المتوقعة: 6 Policies
-- ============================================
-- 1. Admins can insert members (INSERT)
-- 2. Admins can manage all members (ALL)
-- 3. Admins can read all members (SELECT)
-- 4. Allow activation update (UPDATE)
-- 5. Members can read own data (SELECT)
-- 6. Members can update own data (UPDATE)
-- ============================================

-- ============================================
-- ملاحظات مهمة:
-- ============================================
-- 1. TO authenticated: يسمح فقط للمستخدمين المسجلين
-- 2. USING: شرط للقراءة والتحديث (Row Level Security)
-- 3. WITH CHECK: شرط للإدراج والتحديث (Data Validation)
-- 4. auth.uid(): معرف المستخدم الحالي من JWT Token
-- 5. Policy "Allow activation update" ضرورية لعملية التفعيل
--    لأنها تسمح بتحديث user_id من NULL إلى القيمة الفعلية
-- ============================================
