-- إصلاح سياسات RLS لجدول survey_answers
-- للسماح للمستخدمين المجهولين والمسجلين بإضافة إجابات على الاستبيانات العامة

-- حذف السياسات القديمة إن وجدت
DROP POLICY IF EXISTS "Allow insert survey answers" ON survey_answers;
DROP POLICY IF EXISTS "Allow anonymous insert survey answers" ON survey_answers;
DROP POLICY IF EXISTS "Allow public insert survey answers" ON survey_answers;
DROP POLICY IF EXISTS "survey_answers_insert_policy" ON survey_answers;

-- تفعيل RLS على الجدول
ALTER TABLE survey_answers ENABLE ROW LEVEL SECURITY;

-- سياسة للسماح بإضافة إجابات للاستبيانات العامة (للجميع)
CREATE POLICY "Allow insert survey answers for public surveys"
ON survey_answers
FOR INSERT
TO anon, authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM survey_responses sr
        JOIN surveys s ON sr.survey_id = s.id
        WHERE sr.id = survey_answers.response_id
        AND s.access_type = 'public'
        AND s.status = 'active'
    )
);

-- سياسة للسماح بإضافة إجابات للاستبيانات الخاصة بالأعضاء (للمستخدمين المسجلين فقط)
CREATE POLICY "Allow insert survey answers for members only surveys"
ON survey_answers
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM survey_responses sr
        JOIN surveys s ON sr.survey_id = s.id
        WHERE sr.id = survey_answers.response_id
        AND s.access_type = 'members_only'
        AND s.status = 'active'
    )
);

-- سياسة للسماح بقراءة الإجابات للمسؤولين
CREATE POLICY "Allow admins to read survey answers"
ON survey_answers
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 7
    )
);

-- سياسة للسماح للمستخدم بقراءة إجاباته الخاصة
CREATE POLICY "Allow users to read own survey answers"
ON survey_answers
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM survey_responses sr
        WHERE sr.id = survey_answers.response_id
        AND sr.user_id = auth.uid()
    )
);
