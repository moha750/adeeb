-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260212091317   الاسم: fix_public_survey_rls_v2

-- إصلاح سياسات RLS للاستبيانات العامة - الإصدار 2
-- المشكلة: الاستبيانات العامة قد تكون allow_anonymous = false لكن يجب السماح للزوار بالإجابة

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "survey_responses_insert_authenticated" ON survey_responses;
DROP POLICY IF EXISTS "survey_responses_insert_anon" ON survey_responses;
DROP POLICY IF EXISTS "survey_answers_insert_authenticated" ON survey_answers;
DROP POLICY IF EXISTS "survey_answers_insert_anon" ON survey_answers;

-- سياسة إدراج responses للمستخدمين المسجلين
CREATE POLICY "survey_responses_insert_authenticated" ON survey_responses
FOR INSERT TO authenticated
WITH CHECK (
    -- السماح إذا كان user_id هو المستخدم الحالي
    (user_id = auth.uid())
    OR
    -- أو إذا كانت الاستجابة مجهولة
    (user_id IS NULL AND is_anonymous = true)
    OR
    -- أو إذا كان الاستبيان عام (access_type = 'public')
    EXISTS (
        SELECT 1 FROM surveys s 
        WHERE s.id = survey_responses.survey_id 
        AND s.access_type = 'public' 
        AND s.status = 'active'
    )
);

-- سياسة إدراج responses للمستخدمين المجهولين (غير مسجلين)
CREATE POLICY "survey_responses_insert_anon" ON survey_responses
FOR INSERT TO anon
WITH CHECK (
    -- السماح للاستبيانات العامة
    EXISTS (
        SELECT 1 FROM surveys s 
        WHERE s.id = survey_responses.survey_id 
        AND s.access_type = 'public' 
        AND s.status = 'active'
    )
);

-- سياسة إدراج answers للمستخدمين المسجلين
CREATE POLICY "survey_answers_insert_authenticated" ON survey_answers
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM survey_responses sr
        JOIN surveys s ON sr.survey_id = s.id
        WHERE sr.id = survey_answers.response_id
        AND s.status = 'active'
        AND (
            -- إما أن المستخدم هو صاحب الاستجابة
            sr.user_id = auth.uid()
            OR
            -- أو أن الاستجابة مجهولة
            sr.is_anonymous = true
            OR
            -- أو أن الاستبيان عام
            s.access_type = 'public'
        )
    )
);

-- سياسة إدراج answers للمستخدمين المجهولين
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

-- سياسة تحديث responses للمستخدمين المجهولين (لتحديث الحالة عند الإكمال)
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
