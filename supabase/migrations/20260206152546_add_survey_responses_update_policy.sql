-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260206152546   الاسم: add_survey_responses_update_policy


-- إضافة سياسة UPDATE للسماح للمستخدمين بتحديث استجاباتهم
CREATE POLICY "survey_responses_update_own" ON public.survey_responses
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- إضافة سياسة للمستخدمين المجهولين (anon) للإدراج
CREATE POLICY "survey_responses_insert_anon" ON public.survey_responses
FOR INSERT
TO anon
WITH CHECK (true);

-- إضافة سياسة للمستخدمين المجهولين للتحديث (للاستجابات المجهولة)
CREATE POLICY "survey_responses_update_anon" ON public.survey_responses
FOR UPDATE
TO anon
USING (is_anonymous = true AND user_id IS NULL)
WITH CHECK (is_anonymous = true AND user_id IS NULL);

