-- =====================================================
-- إصلاح سياسة RLS للاستبيانات العامة
-- Fix RLS Policy for Public Surveys
-- =====================================================
-- تاريخ الإنشاء: 2026-01-27
-- الوصف: السماح بإدراج الإجابات للاستبيانات العامة بدون مصادقة
-- =====================================================

-- حذف السياسة القديمة
DROP POLICY IF EXISTS "survey_responses_insert" ON public.survey_responses;

-- إنشاء سياسة جديدة تسمح بالإدراج للاستبيانات العامة
CREATE POLICY "survey_responses_insert_public" ON public.survey_responses
    FOR INSERT
    WITH CHECK (
        -- السماح للجميع بالإجابة على الاستبيانات العامة النشطة
        EXISTS (
            SELECT 1 FROM public.surveys s
            WHERE s.id = survey_id
                AND s.status = 'active'
                AND s.access_type = 'public'
                AND (s.start_date IS NULL OR s.start_date <= NOW())
                AND (s.end_date IS NULL OR s.end_date >= NOW())
        )
        OR
        -- الأعضاء يمكنهم الإجابة على الاستبيانات الخاصة بهم
        (
            auth.uid() IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.surveys s
                WHERE s.id = survey_id
                    AND s.status = 'active'
                    AND s.access_type = 'members_only'
                    AND (s.start_date IS NULL OR s.start_date <= NOW())
                    AND (s.end_date IS NULL OR s.end_date >= NOW())
                    AND EXISTS (
                        SELECT 1 FROM public.user_roles 
                        WHERE user_id = auth.uid() AND is_active = true
                    )
            )
        )
    );

-- حذف السياسة القديمة للإجابات
DROP POLICY IF EXISTS "survey_answers_insert" ON public.survey_answers;

-- إنشاء سياسة جديدة للإجابات
CREATE POLICY "survey_answers_insert_public" ON public.survey_answers
    FOR INSERT
    WITH CHECK (
        -- السماح بإدراج الإجابات إذا كانت الاستجابة موجودة
        EXISTS (
            SELECT 1 FROM public.survey_responses sr
            JOIN public.surveys s ON sr.survey_id = s.id
            WHERE sr.id = response_id
                AND (
                    -- استبيان عام
                    (s.access_type = 'public' AND s.status = 'active')
                    OR
                    -- استبيان خاص والمستخدم عضو
                    (
                        s.access_type = 'members_only' 
                        AND s.status = 'active'
                        AND auth.uid() IS NOT NULL
                        AND EXISTS (
                            SELECT 1 FROM public.user_roles 
                            WHERE user_id = auth.uid() AND is_active = true
                        )
                    )
                )
        )
    );

-- إضافة تعليق على السياسات
COMMENT ON POLICY "survey_responses_insert_public" ON public.survey_responses IS 
'يسمح للجميع بإدراج إجابات للاستبيانات العامة النشطة، وللأعضاء فقط للاستبيانات الخاصة';

COMMENT ON POLICY "survey_answers_insert_public" ON public.survey_answers IS 
'يسمح بإدراج الإجابات المرتبطة بالاستجابات الصحيحة';
