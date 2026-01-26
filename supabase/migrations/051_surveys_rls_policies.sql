-- =====================================================
-- سياسات الأمان (RLS) - نظام الاستبيانات
-- Row Level Security Policies - Surveys System
-- =====================================================
-- تاريخ الإنشاء: 2026-01-26
-- الوصف: سياسات Row Level Security لحماية بيانات الاستبيانات
-- =====================================================

-- تفعيل RLS على جميع جداول الاستبيانات
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_audit_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- سياسات جدول الاستبيانات (surveys)
-- =====================================================

-- القراءة: الجميع يمكنهم رؤية الاستبيانات العامة النشطة
CREATE POLICY "surveys_select_public" ON public.surveys
    FOR SELECT
    USING (
        status = 'active' 
        AND access_type = 'public'
        AND (start_date IS NULL OR start_date <= NOW())
        AND (end_date IS NULL OR end_date >= NOW())
    );

-- القراءة: الأعضاء يمكنهم رؤية الاستبيانات الخاصة بهم
CREATE POLICY "surveys_select_members" ON public.surveys
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND status = 'active'
        AND access_type = 'members_only'
        AND (start_date IS NULL OR start_date <= NOW())
        AND (end_date IS NULL OR end_date >= NOW())
        AND EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- القراءة: المنشئون يمكنهم رؤية استبياناتهم الخاصة
CREATE POLICY "surveys_select_own" ON public.surveys
    FOR SELECT
    USING (created_by = auth.uid());

-- القراءة: المسؤولون (مستوى 7+) يمكنهم رؤية جميع الاستبيانات
CREATE POLICY "surveys_select_admin" ON public.surveys
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
                AND ur.is_active = true 
                AND r.role_level >= 7
        )
    );

-- الإنشاء: المسؤولون (مستوى 7+) فقط
CREATE POLICY "surveys_insert_admin" ON public.surveys
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
                AND ur.is_active = true 
                AND r.role_level >= 7
        )
    );

-- التحديث: المنشئ أو المسؤولون (مستوى 7+)
CREATE POLICY "surveys_update_own_or_admin" ON public.surveys
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL
        AND (
            created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid() 
                    AND ur.is_active = true 
                    AND r.role_level >= 7
            )
        )
    );

-- الحذف: المنشئ أو المسؤولون (مستوى 8+)
CREATE POLICY "surveys_delete_own_or_admin" ON public.surveys
    FOR DELETE
    USING (
        auth.uid() IS NOT NULL
        AND (
            created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid() 
                    AND ur.is_active = true 
                    AND r.role_level >= 8
            )
        )
    );

-- =====================================================
-- سياسات جدول الأقسام (survey_sections)
-- =====================================================

-- القراءة: من يمكنه رؤية الاستبيان يمكنه رؤية أقسامه
CREATE POLICY "survey_sections_select" ON public.survey_sections
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.surveys s
            WHERE s.id = survey_id
                AND (
                    -- استبيان عام نشط
                    (s.status = 'active' AND s.access_type = 'public')
                    -- استبيان للأعضاء والمستخدم عضو
                    OR (
                        s.status = 'active' 
                        AND s.access_type = 'members_only'
                        AND auth.uid() IS NOT NULL
                        AND EXISTS (
                            SELECT 1 FROM public.user_roles 
                            WHERE user_id = auth.uid() AND is_active = true
                        )
                    )
                    -- المنشئ
                    OR s.created_by = auth.uid()
                    -- مسؤول
                    OR EXISTS (
                        SELECT 1 FROM public.user_roles ur
                        JOIN public.roles r ON ur.role_id = r.id
                        WHERE ur.user_id = auth.uid() 
                            AND ur.is_active = true 
                            AND r.role_level >= 7
                    )
                )
        )
    );

-- الإنشاء/التحديث/الحذف: من يمكنه تعديل الاستبيان
CREATE POLICY "survey_sections_modify" ON public.survey_sections
    FOR ALL
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.surveys s
            WHERE s.id = survey_id
                AND (
                    s.created_by = auth.uid()
                    OR EXISTS (
                        SELECT 1 FROM public.user_roles ur
                        JOIN public.roles r ON ur.role_id = r.id
                        WHERE ur.user_id = auth.uid() 
                            AND ur.is_active = true 
                            AND r.role_level >= 7
                    )
                )
        )
    );

-- =====================================================
-- سياسات جدول الأسئلة (survey_questions)
-- =====================================================

-- القراءة: من يمكنه رؤية الاستبيان يمكنه رؤية أسئلته
CREATE POLICY "survey_questions_select" ON public.survey_questions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.surveys s
            WHERE s.id = survey_id
                AND (
                    (s.status = 'active' AND s.access_type = 'public')
                    OR (
                        s.status = 'active' 
                        AND s.access_type = 'members_only'
                        AND auth.uid() IS NOT NULL
                        AND EXISTS (
                            SELECT 1 FROM public.user_roles 
                            WHERE user_id = auth.uid() AND is_active = true
                        )
                    )
                    OR s.created_by = auth.uid()
                    OR EXISTS (
                        SELECT 1 FROM public.user_roles ur
                        JOIN public.roles r ON ur.role_id = r.id
                        WHERE ur.user_id = auth.uid() 
                            AND ur.is_active = true 
                            AND r.role_level >= 7
                    )
                )
        )
    );

-- الإنشاء/التحديث/الحذف: من يمكنه تعديل الاستبيان
CREATE POLICY "survey_questions_modify" ON public.survey_questions
    FOR ALL
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.surveys s
            WHERE s.id = survey_id
                AND (
                    s.created_by = auth.uid()
                    OR EXISTS (
                        SELECT 1 FROM public.user_roles ur
                        JOIN public.roles r ON ur.role_id = r.id
                        WHERE ur.user_id = auth.uid() 
                            AND ur.is_active = true 
                            AND r.role_level >= 7
                    )
                )
        )
    );

-- =====================================================
-- سياسات جدول الاستجابات (survey_responses)
-- =====================================================

-- القراءة: المستخدم يمكنه رؤية استجاباته الخاصة
CREATE POLICY "survey_responses_select_own" ON public.survey_responses
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND user_id = auth.uid()
    );

-- القراءة: المنشئ والمسؤولون يمكنهم رؤية جميع الاستجابات
CREATE POLICY "survey_responses_select_admin" ON public.survey_responses
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.surveys s
            WHERE s.id = survey_id
                AND (
                    s.created_by = auth.uid()
                    OR EXISTS (
                        SELECT 1 FROM public.user_roles ur
                        JOIN public.roles r ON ur.role_id = r.id
                        WHERE ur.user_id = auth.uid() 
                            AND ur.is_active = true 
                            AND r.role_level >= 7
                    )
                )
        )
    );

-- الإنشاء: أي شخص يمكنه إنشاء استجابة إذا كان الاستبيان متاحاً
CREATE POLICY "survey_responses_insert" ON public.survey_responses
    FOR INSERT
    WITH CHECK (
        can_respond_to_survey(
            survey_id,
            auth.uid(),
            NULL
        )
    );

-- التحديث: المستخدم يمكنه تحديث استجاباته الخاصة فقط إذا كانت قيد التقدم
CREATE POLICY "survey_responses_update_own" ON public.survey_responses
    FOR UPDATE
    USING (
        (auth.uid() IS NOT NULL AND user_id = auth.uid() AND status = 'in_progress')
        OR EXISTS (
            SELECT 1 FROM public.surveys s
            WHERE s.id = survey_id
                AND (
                    s.created_by = auth.uid()
                    OR EXISTS (
                        SELECT 1 FROM public.user_roles ur
                        JOIN public.roles r ON ur.role_id = r.id
                        WHERE ur.user_id = auth.uid() 
                            AND ur.is_active = true 
                            AND r.role_level >= 7
                    )
                )
        )
    );

-- الحذف: المسؤولون فقط
CREATE POLICY "survey_responses_delete_admin" ON public.survey_responses
    FOR DELETE
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
                AND ur.is_active = true 
                AND r.role_level >= 8
        )
    );

-- =====================================================
-- سياسات جدول الإجابات (survey_answers)
-- =====================================================

-- القراءة: المستخدم يمكنه رؤية إجاباته الخاصة
CREATE POLICY "survey_answers_select_own" ON public.survey_answers
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.survey_responses sr
            WHERE sr.id = response_id
                AND sr.user_id = auth.uid()
        )
    );

-- القراءة: المنشئ والمسؤولون يمكنهم رؤية جميع الإجابات
CREATE POLICY "survey_answers_select_admin" ON public.survey_answers
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.survey_responses sr
            JOIN public.surveys s ON sr.survey_id = s.id
            WHERE sr.id = response_id
                AND (
                    s.created_by = auth.uid()
                    OR EXISTS (
                        SELECT 1 FROM public.user_roles ur
                        JOIN public.roles r ON ur.role_id = r.id
                        WHERE ur.user_id = auth.uid() 
                            AND ur.is_active = true 
                            AND r.role_level >= 7
                    )
                )
        )
    );

-- الإنشاء/التحديث: المستخدم يمكنه إضافة/تحديث إجاباته
CREATE POLICY "survey_answers_modify_own" ON public.survey_answers
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.survey_responses sr
            WHERE sr.id = response_id
                AND (
                    (auth.uid() IS NOT NULL AND sr.user_id = auth.uid() AND sr.status = 'in_progress')
                    OR EXISTS (
                        SELECT 1 FROM public.surveys s
                        WHERE s.id = sr.survey_id
                            AND (
                                s.created_by = auth.uid()
                                OR EXISTS (
                                    SELECT 1 FROM public.user_roles ur
                                    JOIN public.roles r ON ur.role_id = r.id
                                    WHERE ur.user_id = auth.uid() 
                                        AND ur.is_active = true 
                                        AND r.role_level >= 7
                                )
                            )
                    )
                )
        )
    );

-- =====================================================
-- سياسات جدول التحليلات (survey_analytics)
-- =====================================================

-- القراءة: المنشئ والمسؤولون فقط
CREATE POLICY "survey_analytics_select" ON public.survey_analytics
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.surveys s
            WHERE s.id = survey_id
                AND (
                    s.created_by = auth.uid()
                    OR EXISTS (
                        SELECT 1 FROM public.user_roles ur
                        JOIN public.roles r ON ur.role_id = r.id
                        WHERE ur.user_id = auth.uid() 
                            AND ur.is_active = true 
                            AND r.role_level >= 7
                    )
                )
        )
    );

-- الإنشاء/التحديث/الحذف: النظام فقط (عبر الدوال)
CREATE POLICY "survey_analytics_modify_system" ON public.survey_analytics
    FOR ALL
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
                AND ur.is_active = true 
                AND r.role_level >= 7
        )
    );

-- =====================================================
-- سياسات جدول المشاركة (survey_shares)
-- =====================================================

-- القراءة: الجميع يمكنهم رؤية روابط المشاركة النشطة
CREATE POLICY "survey_shares_select_active" ON public.survey_shares
    FOR SELECT
    USING (
        is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
    );

-- القراءة: المنشئ والمسؤولون يمكنهم رؤية جميع الروابط
CREATE POLICY "survey_shares_select_admin" ON public.survey_shares
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.surveys s
            WHERE s.id = survey_id
                AND (
                    s.created_by = auth.uid()
                    OR EXISTS (
                        SELECT 1 FROM public.user_roles ur
                        JOIN public.roles r ON ur.role_id = r.id
                        WHERE ur.user_id = auth.uid() 
                            AND ur.is_active = true 
                            AND r.role_level >= 7
                    )
                )
        )
    );

-- الإنشاء/التحديث/الحذف: المنشئ والمسؤولون
CREATE POLICY "survey_shares_modify" ON public.survey_shares
    FOR ALL
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.surveys s
            WHERE s.id = survey_id
                AND (
                    s.created_by = auth.uid()
                    OR EXISTS (
                        SELECT 1 FROM public.user_roles ur
                        JOIN public.roles r ON ur.role_id = r.id
                        WHERE ur.user_id = auth.uid() 
                            AND ur.is_active = true 
                            AND r.role_level >= 7
                    )
                )
        )
    );

-- =====================================================
-- سياسات جدول القوالب (survey_templates)
-- =====================================================

-- القراءة: الجميع يمكنهم رؤية القوالب العامة
CREATE POLICY "survey_templates_select_public" ON public.survey_templates
    FOR SELECT
    USING (is_public = true OR is_system = true);

-- القراءة: المستخدم يمكنه رؤية قوالبه الخاصة
CREATE POLICY "survey_templates_select_own" ON public.survey_templates
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND created_by = auth.uid()
    );

-- الإنشاء: المسؤولون (مستوى 7+)
CREATE POLICY "survey_templates_insert" ON public.survey_templates
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
                AND ur.is_active = true 
                AND r.role_level >= 7
        )
    );

-- التحديث/الحذف: المنشئ أو المسؤولون (مستوى 8+)
CREATE POLICY "survey_templates_modify" ON public.survey_templates
    FOR ALL
    USING (
        auth.uid() IS NOT NULL
        AND (
            created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid() 
                    AND ur.is_active = true 
                    AND r.role_level >= 8
            )
        )
    );

-- =====================================================
-- سياسات جدول الإشعارات (survey_notifications)
-- =====================================================

-- القراءة: المستلم يمكنه رؤية إشعاراته
CREATE POLICY "survey_notifications_select_own" ON public.survey_notifications
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND recipient_user_id = auth.uid()
    );

-- القراءة: المسؤولون يمكنهم رؤية جميع الإشعارات
CREATE POLICY "survey_notifications_select_admin" ON public.survey_notifications
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
                AND ur.is_active = true 
                AND r.role_level >= 7
        )
    );

-- الإنشاء/التحديث: النظام والمسؤولون
CREATE POLICY "survey_notifications_modify" ON public.survey_notifications
    FOR ALL
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
                AND ur.is_active = true 
                AND r.role_level >= 7
        )
    );

-- =====================================================
-- سياسات جدول سجل التدقيق (survey_audit_log)
-- =====================================================

-- القراءة: المسؤولون (مستوى 7+) فقط
CREATE POLICY "survey_audit_log_select_admin" ON public.survey_audit_log
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
                AND ur.is_active = true 
                AND r.role_level >= 7
        )
    );

-- الإنشاء: النظام فقط (عبر triggers)
CREATE POLICY "survey_audit_log_insert_system" ON public.survey_audit_log
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
    );
