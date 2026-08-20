-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260130022535   الاسم: allow_public_read_unused_onboarding_tokens

-- السماح للجميع بقراءة tokens غير المستخدمة وغير المنتهية
CREATE POLICY "السماح بقراءة tokens غير المستخدمة للجميع"
ON member_onboarding_tokens
FOR SELECT
TO public
USING (
  is_used = false 
  AND expires_at > NOW()
);
