-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260410133023   الاسم: remove_permission_and_expires_from_survey_sharing

-- Update RLS policies to remove expires_at condition
DROP POLICY survey_shared_read ON surveys;
CREATE POLICY survey_shared_read ON surveys FOR SELECT USING (
  id IN (SELECT survey_id FROM survey_sharing WHERE shared_with = auth.uid())
);

DROP POLICY survey_questions_shared_read ON survey_questions;
CREATE POLICY survey_questions_shared_read ON survey_questions FOR SELECT USING (
  survey_id IN (SELECT survey_id FROM survey_sharing WHERE shared_with = auth.uid())
);

DROP POLICY survey_responses_shared_read ON survey_responses;
CREATE POLICY survey_responses_shared_read ON survey_responses FOR SELECT USING (
  survey_id IN (SELECT survey_id FROM survey_sharing WHERE shared_with = auth.uid())
);

DROP POLICY survey_answers_shared_read ON survey_answers;
CREATE POLICY survey_answers_shared_read ON survey_answers FOR SELECT USING (
  response_id IN (
    SELECT sr.id FROM survey_responses sr
    JOIN survey_sharing ss ON ss.survey_id = sr.survey_id
    WHERE ss.shared_with = auth.uid()
  )
);

-- Now drop the columns
ALTER TABLE survey_sharing DROP COLUMN permission_level;
ALTER TABLE survey_sharing DROP COLUMN expires_at;
