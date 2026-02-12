-- تحديث حالات المستخدم لتكون واضحة ومحددة
-- active - نشط
-- pending - معلق (لم يفعل الحساب)
-- terminated - عضوية منتهية

-- تحديث جميع الحالات 'suspended' إلى 'terminated'
UPDATE profiles
SET account_status = 'terminated'
WHERE account_status = 'suspended';

-- تحديث المستخدمين الذين لم يفعلوا حساباتهم إلى 'pending'
UPDATE profiles p
SET account_status = 'pending'
FROM member_onboarding_tokens mot
WHERE p.id = mot.user_id
AND mot.is_used = false
AND p.account_status != 'terminated';

-- إضافة constraint للتأكد من أن الحالات المسموحة فقط هي: active, pending, terminated
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_account_status_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_account_status_check
CHECK (account_status IN ('active', 'pending', 'terminated'));

-- إنشاء index لتحسين الأداء عند البحث بحالة الحساب
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON profiles(account_status);

-- تعليق توضيحي على العمود
COMMENT ON COLUMN profiles.account_status IS 'حالة الحساب: active (نشط), pending (معلق - لم يفعل الحساب), terminated (عضوية منتهية)';
