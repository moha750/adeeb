-- Migration: إضافة حقول تتبع ترحيل المقبولين إلى حسابات مستخدمين
-- تاريخ الإنشاء: 2026-01-29
-- الوصف: إضافة حقول لربط المقبولين بحساباتهم الجديدة وتتبع عملية الترحيل

-- 1. إضافة حقل في membership_interviews لتتبع الترحيل
ALTER TABLE membership_interviews
ADD COLUMN IF NOT EXISTS migrated_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS migrated_at timestamptz,
ADD COLUMN IF NOT EXISTS migration_notes text;

-- 2. إضافة حقل في profiles لتتبع المصدر
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS source_application_id uuid REFERENCES membership_applications(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_interview_id uuid REFERENCES membership_interviews(id) ON DELETE SET NULL;

-- 3. إضافة فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_membership_interviews_migrated_user 
ON membership_interviews(migrated_to_user_id) WHERE migrated_to_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_source_application 
ON profiles(source_application_id) WHERE source_application_id IS NOT NULL;

-- 4. إضافة تعليقات توضيحية
COMMENT ON COLUMN membership_interviews.migrated_to_user_id IS 'معرف المستخدم الذي تم ترحيل المقبول إليه';
COMMENT ON COLUMN membership_interviews.migrated_at IS 'تاريخ ووقت الترحيل';
COMMENT ON COLUMN membership_interviews.migration_notes IS 'ملاحظات عملية الترحيل';
COMMENT ON COLUMN profiles.source_application_id IS 'معرف طلب العضوية الأصلي';
COMMENT ON COLUMN profiles.source_interview_id IS 'معرف المقابلة الأصلية';
