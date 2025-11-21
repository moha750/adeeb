-- ============================================
-- التحقق من وجود العضو ومشكلة التحديث
-- ============================================

-- 1. التحقق من وجود الصف
SELECT 
  id,
  full_name,
  email,
  user_id,
  account_status,
  created_at
FROM members 
WHERE id = 'a411560c-594d-4c7b-8fb0-d595611935a3';

-- إذا لم يظهر شيء: member_id خاطئ أو الصف غير موجود!

-- ============================================

-- 2. التحقق من RLS Policies الحالية
SELECT 
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies 
WHERE tablename = 'members'
ORDER BY policyname;

-- يجب أن ترى على الأقل:
-- - Members can update own data (UPDATE)
-- - Admins full access (ALL)

-- ============================================

-- 3. التحقق من RLS مفعّل
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'members';

-- يجب أن يكون rowsecurity = true

-- ============================================

-- 4. اختبار التحديث يدوياً (بدون RLS)
-- تحذير: هذا يعطل RLS مؤقتاً!

-- عطّل RLS
ALTER TABLE members DISABLE ROW LEVEL SECURITY;

-- جرب التحديث
UPDATE members 
SET 
  user_id = '9a5be867-a3fa-4cd5-a91f-4dd522141223',
  account_status = 'active',
  account_activated_at = NOW()
WHERE id = 'a411560c-594d-4c7b-8fb0-d595611935a3'
RETURNING *;

-- إذا نجح: المشكلة في RLS
-- إذا فشل: المشكلة في member_id أو الصف غير موجود

-- أعد تفعيل RLS
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- ============================================

-- 5. التحقق من جدول الدعوات
SELECT 
  id,
  member_id,
  email,
  invitation_token,
  status,
  expires_at
FROM member_invitations
WHERE invitation_token LIKE '%a5cc-723dd22543bc%'
ORDER BY created_at DESC
LIMIT 5;

-- تحقق من أن member_id يطابق الصف في جدول members

-- ============================================
