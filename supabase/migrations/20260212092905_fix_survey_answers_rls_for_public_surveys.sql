-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260212092905   الاسم: fix_survey_answers_rls_for_public_surveys

-- Drop existing INSERT policies on survey_answers
DROP POLICY IF EXISTS "survey_answers_insert_authenticated" ON survey_answers;
DROP POLICY IF EXISTS "survey_answers_insert_anon" ON survey_answers;

-- Create new INSERT policy for authenticated users (more permissive for public surveys)
CREATE POLICY "survey_answers_insert_authenticated" ON survey_answers
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM survey_responses sr
        JOIN surveys s ON sr.survey_id = s.id
        WHERE sr.id = survey_answers.response_id
        AND s.status = 'active'
        AND (
            sr.user_id = auth.uid()
            OR sr.is_anonymous = true
            OR s.access_type = 'public'
        )
    )
);

-- Create new INSERT policy for anonymous users
CREATE POLICY "survey_answers_insert_anon" ON survey_answers
FOR INSERT TO anon
WITH CHECK (
    EXISTS (
        SELECT 1 FROM survey_responses sr
        JOIN surveys s ON sr.survey_id = s.id
        WHERE sr.id = survey_answers.response_id
        AND s.status = 'active'
        AND s.access_type = 'public'
    )
);
