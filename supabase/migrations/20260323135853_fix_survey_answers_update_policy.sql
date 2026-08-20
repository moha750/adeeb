-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260323135853   الاسم: fix_survey_answers_update_policy


-- إضافة UPDATE policy للمستخدمين المصادقين على إجاباتهم
CREATE POLICY "survey_answers_update_authenticated"
ON public.survey_answers
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM survey_responses sr
    JOIN surveys s ON sr.survey_id = s.id
    WHERE sr.id = survey_answers.response_id
      AND s.status = 'active'
      AND (sr.user_id = auth.uid() OR sr.is_anonymous = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM survey_responses sr
    JOIN surveys s ON sr.survey_id = s.id
    WHERE sr.id = survey_answers.response_id
      AND s.status = 'active'
      AND (sr.user_id = auth.uid() OR sr.is_anonymous = true)
  )
);

-- إضافة UPDATE policy للزوار غير المسجلين (استبيانات عامة)
CREATE POLICY "survey_answers_update_anon"
ON public.survey_answers
FOR UPDATE
TO anon
USING (
  EXISTS (
    SELECT 1 FROM survey_responses sr
    JOIN surveys s ON sr.survey_id = s.id
    WHERE sr.id = survey_answers.response_id
      AND s.status = 'active'
      AND s.access_type = 'public'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM survey_responses sr
    JOIN surveys s ON sr.survey_id = s.id
    WHERE sr.id = survey_answers.response_id
      AND s.status = 'active'
      AND s.access_type = 'public'
  )
);

