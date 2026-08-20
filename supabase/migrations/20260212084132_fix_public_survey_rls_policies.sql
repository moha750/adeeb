-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260212084132   الاسم: fix_public_survey_rls_policies

-- إصلاح سياسات RLS للاستبيانات العامة

-- حذف السياسات القديمة المتعلقة بـ survey_responses
DROP POLICY IF EXISTS "survey_responses_insert_authenticated" ON survey_responses;
DROP POLICY IF EXISTS "survey_responses_insert_anon" ON survey_responses;

-- إنشاء سياسة جديدة للإدراج تسمح للمستخدمين المسجلين بإنشاء responses
-- سواء كانت مجهولة أو باسمهم
CREATE POLICY "survey_responses_insert_authenticated" ON survey_responses
FOR INSERT TO authenticated
WITH CHECK (
    -- السماح إذا كان user_id هو المستخدم الحالي
    (user_id = auth.uid())
    OR
    -- أو إذا كانت الاستجابة مجهولة (للاستبيانات العامة)
    (user_id IS NULL AND is_anonymous = true)
);

-- إنشاء سياسة للمستخدمين المجهولين (غير مسجلين)
CREATE POLICY "survey_responses_insert_anon" ON survey_responses
FOR INSERT TO anon
WITH CHECK (
    -- السماح فقط للاستجابات المجهولة
    user_id IS NULL AND is_anonymous = true
);

-- حذف السياسات القديمة المتعلقة بـ survey_answers
DROP POLICY IF EXISTS "survey_answers_insert_authenticated" ON survey_answers;
DROP POLICY IF EXISTS "survey_answers_insert_anon" ON survey_answers;
DROP POLICY IF EXISTS "Allow insert survey answers for public surveys" ON survey_answers;
DROP POLICY IF EXISTS "Allow insert survey answers for members only surveys" ON survey_answers;

-- إنشاء سياسة جديدة للإدراج في survey_answers للمستخدمين المسجلين
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
            -- أو أن الاستجابة مجهولة (للاستبيانات العامة)
            (sr.user_id IS NULL AND sr.is_anonymous = true)
        )
    )
);

-- إنشاء سياسة للمستخدمين المجهولين
CREATE POLICY "survey_answers_insert_anon" ON survey_answers
FOR INSERT TO anon
WITH CHECK (
    EXISTS (
        SELECT 1 FROM survey_responses sr
        JOIN surveys s ON sr.survey_id = s.id
        WHERE sr.id = survey_answers.response_id
        AND s.status = 'active'
        AND sr.is_anonymous = true
        AND sr.user_id IS NULL
    )
);
