-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260212141643   الاسم: fix_survey_rls_for_anon_users

-- Add SELECT policy for anon users on survey_responses (for public surveys)
CREATE POLICY "survey_responses_select_anon" ON survey_responses
FOR SELECT TO anon
USING (
    EXISTS (
        SELECT 1 FROM surveys s
        WHERE s.id = survey_responses.survey_id
        AND s.access_type = 'public'
        AND s.status = 'active'
    )
);

-- Add SELECT policy for anon users on surveys (for public surveys)
DROP POLICY IF EXISTS "surveys_select_anon" ON surveys;
CREATE POLICY "surveys_select_anon" ON surveys
FOR SELECT TO anon
USING (access_type = 'public' AND status = 'active');

-- Add SELECT policy for anon users on survey_questions (for public surveys)
DROP POLICY IF EXISTS "survey_questions_select_anon" ON survey_questions;
CREATE POLICY "survey_questions_select_anon" ON survey_questions
FOR SELECT TO anon
USING (
    EXISTS (
        SELECT 1 FROM surveys s
        WHERE s.id = survey_questions.survey_id
        AND s.access_type = 'public'
        AND s.status = 'active'
    )
);

-- Add UPDATE policy for anon users on survey_responses (for public surveys)
DROP POLICY IF EXISTS "survey_responses_update_anon" ON survey_responses;
CREATE POLICY "survey_responses_update_anon" ON survey_responses
FOR UPDATE TO anon
USING (
    EXISTS (
        SELECT 1 FROM surveys s
        WHERE s.id = survey_responses.survey_id
        AND s.access_type = 'public'
        AND s.status = 'active'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM surveys s
        WHERE s.id = survey_responses.survey_id
        AND s.access_type = 'public'
        AND s.status = 'active'
    )
);
