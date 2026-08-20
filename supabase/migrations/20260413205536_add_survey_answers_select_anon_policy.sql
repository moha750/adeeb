-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260413205536   الاسم: add_survey_answers_select_anon_policy

CREATE POLICY "survey_answers_select_anon" ON survey_answers
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM survey_responses sr
      JOIN surveys s ON sr.survey_id = s.id
      WHERE sr.id = survey_answers.response_id
        AND s.access_type = 'public'
        AND s.status = 'active'
    )
  );
