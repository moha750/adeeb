-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260215104648   الاسم: add_pending_onboarding_to_account_status

-- إضافة pending_onboarding إلى القيم المسموحة في account_status
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_account_status_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_account_status_check 
CHECK (account_status = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text, 'pending_onboarding'::text]));
