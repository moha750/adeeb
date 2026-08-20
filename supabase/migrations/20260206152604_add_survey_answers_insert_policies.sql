-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260206152604   الاسم: add_survey_answers_insert_policies


-- إضافة سياسة INSERT للمستخدمين المصادق عليهم لإدراج إجاباتهم
CREATE POLICY "survey_answers_insert_authenticated" ON public.survey_answers
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM survey_responses sr
        WHERE sr.id = survey_answers.response_id
        AND (sr.user_id = auth.uid() OR sr.is_anonymous = true)
    )
);

-- إضافة سياسة INSERT للمستخدمين المجهولين
CREATE POLICY "survey_answers_insert_anon" ON public.survey_answers
FOR INSERT
TO anon
WITH CHECK (
    EXISTS (
        SELECT 1 FROM survey_responses sr
        WHERE sr.id = survey_answers.response_id
        AND sr.is_anonymous = true
    )
);

