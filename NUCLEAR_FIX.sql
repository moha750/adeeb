-- ============================================
-- الحل الجذري: حذف كل شيء وإعادة البناء
-- ============================================

-- 1. حذف جميع Triggers
DROP TRIGGER IF EXISTS trigger_prevent_sensitive_update ON members;
DROP TRIGGER IF EXISTS trigger_update_last_login ON member_activity_log;

-- 2. حذف جميع Functions
DROP FUNCTION IF EXISTS prevent_sensitive_fields_update();
DROP FUNCTION IF EXISTS update_member_last_login();

-- 3. حذف جميع RLS Policies
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

-- 4. تفعيل RLS
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- 5. إنشاء Policies بسيطة جداً
-- Policy 1: القراءة (تسمح بقراءة الصفوف التي user_id = auth.uid() أو NULL)
CREATE POLICY "members_read"
ON members FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR user_id IS NULL);

-- Policy 2: التحديث (تسمح بتحديث الصفوف التي user_id = auth.uid() أو NULL)
CREATE POLICY "members_update"
ON members FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR user_id IS NULL);

-- Policy 3: الإداريين - كل العمليات
CREATE POLICY "admins_all"
ON members FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()
    AND admins.is_admin = true
  )
);

-- 6. التحقق من النتيجة
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN substring(qual from 1 for 60)
    ELSE 'N/A'
  END as using_clause
FROM pg_policies 
WHERE tablename = 'members'
ORDER BY policyname;

-- يجب أن ترى 3 Policies فقط:
-- 1. admins_all (ALL)
-- 2. members_read (SELECT)
-- 3. members_update (UPDATE)

-- ============================================
-- اختبار التحديث
-- ============================================

-- جرب التحديث على أحد الصفوف
-- استبدل القيم بالقيم الحقيقية
/*
UPDATE members 
SET 
  user_id = 'user_id_من_auth',
  account_status = 'active',
  account_activated_at = NOW()
WHERE id = 'member_id_من_الدعوة'
RETURNING *;
*/

-- ============================================
