-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260206170014   الاسم: fix_survey_responses_update_policy_for_anonymous


-- حذف السياسة القديمة
DROP POLICY IF EXISTS "survey_responses_update_own" ON public.survey_responses;

-- إنشاء سياسة جديدة تسمح بالتحديث للمستخدمين المصادق عليهم
-- سواء كانت الاستجابة مرتبطة بهم أو مجهولة
CREATE POLICY "survey_responses_update_own" ON public.survey_responses
FOR UPDATE
TO authenticated
USING (
    -- إما أن يكون user_id = auth.uid() (استجابة عادية)
    -- أو user_id = null مع is_anonymous = true (استجابة مجهولة)
    (user_id = auth.uid()) OR (user_id IS NULL AND is_anonymous = true)
)
WITH CHECK (
    (user_id = auth.uid()) OR (user_id IS NULL AND is_anonymous = true)
);

