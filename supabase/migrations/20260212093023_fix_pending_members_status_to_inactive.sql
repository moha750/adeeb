-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260212093023   الاسم: fix_pending_members_status_to_inactive

-- Update account_status to 'inactive' for users who have active status but unused tokens
UPDATE profiles 
SET account_status = 'inactive', updated_at = NOW()
WHERE id IN (
    SELECT p.id 
    FROM profiles p
    JOIN member_onboarding_tokens t ON p.id = t.user_id
    WHERE p.account_status = 'active' AND t.is_used = false
);
