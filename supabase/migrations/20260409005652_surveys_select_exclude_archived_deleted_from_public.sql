-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260409005652   الاسم: surveys_select_exclude_archived_deleted_from_public

DROP POLICY IF EXISTS surveys_select_all ON public.surveys;

CREATE POLICY surveys_select_all ON public.surveys
    FOR SELECT
    TO public
    USING (
        (
            (status = ANY (ARRAY['published'::text, 'active'::text]))
            AND COALESCE(is_archived, false) = false
            AND COALESCE(is_deleted, false) = false
        )
        OR (auth.uid() = created_by)
    );
