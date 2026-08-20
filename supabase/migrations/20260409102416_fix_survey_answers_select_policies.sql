-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260409102416   الاسم: fix_survey_answers_select_policies


-- ═══════════════════════════════════════════════════════
-- 1. حذف الثغرة: survey_answers_select_public
--    كانت تكشف كل الإجابات لأي شخص (حتى غير مسجّل)
--    على أي استبيان active/published
-- ═══════════════════════════════════════════════════════
DROP POLICY IF EXISTS "survey_answers_select_public" ON public.survey_answers;

-- ═══════════════════════════════════════════════════════
-- 2. حذف السياسة الواسعة: Allow admins to read survey answers
--    كانت تعطي role_level >= 7 وصول لكل الإجابات
--    على كل الاستبيانات — غير ضرورية لأن مالك الاستبيان
--    يراها أصلاً عبر سياسة survey_answers_modify_owner
-- ═══════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Allow admins to read survey answers" ON public.survey_answers;

-- ═══════════════════════════════════════════════════════
-- 3. سياسة بديلة: مالك الاستبيان يقرأ إجابات استبيانه فقط
--    (هذا مغطّى فعلاً بـ modify_owner التي تعطي ALL، لكن
--     نُضيف سياسة SELECT صريحة للوضوح والمرونة المستقبلية
--     في حال أردنا تقييد modify_owner لاحقاً)
-- ═══════════════════════════════════════════════════════
CREATE POLICY survey_answers_select_survey_owner ON public.survey_answers
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM survey_questions sq
            JOIN surveys s ON s.id = sq.survey_id
            WHERE sq.id = survey_answers.question_id
              AND s.created_by = auth.uid()
        )
    );

