-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260206161948   الاسم: fix_survey_responses_insert_policy


-- حذف السياسة القديمة
DROP POLICY IF EXISTS "survey_responses_insert_authenticated" ON public.survey_responses;

-- إنشاء سياسة جديدة تسمح بالإدراج للمستخدمين المصادق عليهم
-- سواء كانت الاستجابة مجهولة أو مرتبطة بالمستخدم
CREATE POLICY "survey_responses_insert_authenticated" ON public.survey_responses
FOR INSERT
TO authenticated
WITH CHECK (
    -- إما أن يكون user_id = auth.uid() (استجابة عادية)
    -- أو user_id = null مع is_anonymous = true (استجابة مجهولة)
    (user_id = auth.uid()) OR (user_id IS NULL AND is_anonymous = true)
);

