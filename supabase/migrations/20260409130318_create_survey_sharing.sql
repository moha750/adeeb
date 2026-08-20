-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260409130318   الاسم: create_survey_sharing


-- جدول مشاركة نتائج الاستبيانات
CREATE TABLE public.survey_sharing (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_with UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    permission_level TEXT NOT NULL DEFAULT 'view' CHECK (permission_level IN ('view', 'view_download')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(survey_id, shared_with)
);

CREATE INDEX idx_survey_sharing_survey ON public.survey_sharing(survey_id);
CREATE INDEX idx_survey_sharing_shared_with ON public.survey_sharing(shared_with);
CREATE INDEX idx_survey_sharing_shared_by ON public.survey_sharing(shared_by);

ALTER TABLE public.survey_sharing ENABLE ROW LEVEL SECURITY;

-- المالك يرى ويضيف ويحذف مشاركاته
CREATE POLICY "survey_sharing_owner_select" ON public.survey_sharing
    FOR SELECT USING (shared_by = auth.uid());

CREATE POLICY "survey_sharing_owner_insert" ON public.survey_sharing
    FOR INSERT WITH CHECK (shared_by = auth.uid());

CREATE POLICY "survey_sharing_owner_delete" ON public.survey_sharing
    FOR DELETE USING (shared_by = auth.uid());

-- المستلم يرى المشاركات الموجهة له
CREATE POLICY "survey_sharing_recipient_select" ON public.survey_sharing
    FOR SELECT USING (shared_with = auth.uid());

-- السماح للمستلم بقراءة الاستبيان المشارك معه
CREATE POLICY "survey_shared_read" ON public.surveys
    FOR SELECT USING (
        id IN (
            SELECT survey_id FROM public.survey_sharing 
            WHERE shared_with = auth.uid()
            AND (expires_at IS NULL OR expires_at > now())
        )
    );

-- السماح بقراءة أسئلة الاستبيان المشارك
CREATE POLICY "survey_questions_shared_read" ON public.survey_questions
    FOR SELECT USING (
        survey_id IN (
            SELECT survey_id FROM public.survey_sharing 
            WHERE shared_with = auth.uid()
            AND (expires_at IS NULL OR expires_at > now())
        )
    );

-- السماح بقراءة استجابات الاستبيان المشارك
CREATE POLICY "survey_responses_shared_read" ON public.survey_responses
    FOR SELECT USING (
        survey_id IN (
            SELECT survey_id FROM public.survey_sharing 
            WHERE shared_with = auth.uid()
            AND (expires_at IS NULL OR expires_at > now())
        )
    );

-- السماح بقراءة إجابات الاستبيان المشارك
CREATE POLICY "survey_answers_shared_read" ON public.survey_answers
    FOR SELECT USING (
        response_id IN (
            SELECT sr.id FROM public.survey_responses sr
            JOIN public.survey_sharing ss ON ss.survey_id = sr.survey_id
            WHERE ss.shared_with = auth.uid()
            AND (ss.expires_at IS NULL OR ss.expires_at > now())
        )
    );

