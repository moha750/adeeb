-- =====================================================
-- نظام الاستبيانات المتقدم - نادي أدِيب
-- Advanced Surveys System - Adeeb Club
-- =====================================================
-- تاريخ الإنشاء: 2026-01-26
-- الوصف: نظام استبيانات احترافي متكامل يدعم الاستبيانات العامة والخاصة
-- =====================================================

-- =====================================================
-- 1. جدول الاستبيانات الرئيسي (surveys)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.surveys (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    survey_type TEXT NOT NULL CHECK (survey_type IN ('general', 'membership', 'event', 'feedback', 'research', 'poll')),
    access_type TEXT NOT NULL CHECK (access_type IN ('public', 'members_only')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'closed', 'archived')),
    
    -- إعدادات العرض
    show_progress_bar BOOLEAN DEFAULT true,
    show_question_numbers BOOLEAN DEFAULT true,
    randomize_questions BOOLEAN DEFAULT false,
    allow_multiple_responses BOOLEAN DEFAULT false,
    require_authentication BOOLEAN DEFAULT false,
    
    -- إعدادات التوقيت
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    estimated_duration_minutes INTEGER,
    
    -- رسائل مخصصة
    welcome_message TEXT,
    completion_message TEXT DEFAULT 'شكراً لمشاركتك في الاستبيان!',
    
    -- إعدادات متقدمة
    max_responses INTEGER,
    response_limit_per_user INTEGER DEFAULT 1,
    show_results_to_respondents BOOLEAN DEFAULT false,
    collect_email BOOLEAN DEFAULT false,
    collect_name BOOLEAN DEFAULT false,
    
    -- البيانات الوصفية
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    
    -- إحصائيات
    total_responses INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    completion_rate NUMERIC(5,2) DEFAULT 0.00,
    
    -- تصنيفات وعلامات
    tags TEXT[],
    category TEXT,
    
    -- إعدادات الخصوصية
    is_anonymous BOOLEAN DEFAULT false,
    collect_ip_address BOOLEAN DEFAULT false,
    
    CONSTRAINT valid_date_range CHECK (end_date IS NULL OR start_date IS NULL OR end_date > start_date)
);

-- فهارس للأداء
CREATE INDEX idx_surveys_status ON public.surveys(status);
CREATE INDEX idx_surveys_access_type ON public.surveys(access_type);
CREATE INDEX idx_surveys_survey_type ON public.surveys(survey_type);
CREATE INDEX idx_surveys_created_by ON public.surveys(created_by);
CREATE INDEX idx_surveys_start_date ON public.surveys(start_date);
CREATE INDEX idx_surveys_end_date ON public.surveys(end_date);
CREATE INDEX idx_surveys_tags ON public.surveys USING GIN(tags);

-- =====================================================
-- 2. جدول الأقسام (survey_sections)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.survey_sections (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(survey_id, display_order)
);

CREATE INDEX idx_survey_sections_survey_id ON public.survey_sections(survey_id);
CREATE INDEX idx_survey_sections_display_order ON public.survey_sections(display_order);

-- =====================================================
-- 3. جدول الأسئلة (survey_questions)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.survey_questions (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    section_id INTEGER REFERENCES public.survey_sections(id) ON DELETE SET NULL,
    
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK (question_type IN (
        'short_text',           -- نص قصير
        'long_text',            -- نص طويل
        'single_choice',        -- اختيار واحد
        'multiple_choice',      -- اختيارات متعددة
        'dropdown',             -- قائمة منسدلة
        'rating_scale',         -- مقياس تقييم
        'linear_scale',         -- مقياس خطي
        'date',                 -- تاريخ
        'time',                 -- وقت
        'email',                -- بريد إلكتروني
        'phone',                -- رقم هاتف
        'number',               -- رقم
        'url',                  -- رابط
        'file_upload',          -- رفع ملف
        'matrix',               -- مصفوفة
        'ranking',              -- ترتيب
        'yes_no',               -- نعم/لا
        'agreement_scale',      -- مقياس موافقة (ليكرت)
        'nps'                   -- Net Promoter Score
    )),
    
    display_order INTEGER NOT NULL DEFAULT 0,
    is_required BOOLEAN DEFAULT false,
    
    -- خيارات السؤال (JSON)
    options JSONB DEFAULT '[]'::JSONB,
    
    -- إعدادات متقدمة
    settings JSONB DEFAULT '{}'::JSONB,
    
    -- منطق الشروط
    conditional_logic JSONB,
    
    -- نص المساعدة
    help_text TEXT,
    placeholder_text TEXT,
    
    -- التحقق من الصحة
    validation_rules JSONB,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_survey_questions_survey_id ON public.survey_questions(survey_id);
CREATE INDEX idx_survey_questions_section_id ON public.survey_questions(section_id);
CREATE INDEX idx_survey_questions_display_order ON public.survey_questions(display_order);
CREATE INDEX idx_survey_questions_question_type ON public.survey_questions(question_type);

-- =====================================================
-- 4. جدول الاستجابات (survey_responses)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.survey_responses (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    
    -- معلومات المستجيب
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    respondent_email TEXT,
    respondent_name TEXT,
    
    -- حالة الاستجابة
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    
    -- البيانات التقنية
    ip_address TEXT,
    user_agent TEXT,
    device_type TEXT,
    browser TEXT,
    
    -- التوقيت
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    time_spent_seconds INTEGER,
    
    -- البيانات الإضافية
    metadata JSONB DEFAULT '{}'::JSONB,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_survey_responses_survey_id ON public.survey_responses(survey_id);
CREATE INDEX idx_survey_responses_user_id ON public.survey_responses(user_id);
CREATE INDEX idx_survey_responses_status ON public.survey_responses(status);
CREATE INDEX idx_survey_responses_completed_at ON public.survey_responses(completed_at);
CREATE INDEX idx_survey_responses_ip_address ON public.survey_responses(ip_address);

-- =====================================================
-- 5. جدول الإجابات (survey_answers)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.survey_answers (
    id SERIAL PRIMARY KEY,
    response_id INTEGER NOT NULL REFERENCES public.survey_responses(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES public.survey_questions(id) ON DELETE CASCADE,
    
    -- الإجابة (يمكن أن تكون نص، رقم، أو JSON للإجابات المعقدة)
    answer_text TEXT,
    answer_number NUMERIC,
    answer_json JSONB,
    
    -- ملفات مرفقة
    file_url TEXT,
    file_name TEXT,
    file_size INTEGER,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(response_id, question_id)
);

CREATE INDEX idx_survey_answers_response_id ON public.survey_answers(response_id);
CREATE INDEX idx_survey_answers_question_id ON public.survey_answers(question_id);

-- =====================================================
-- 6. جدول التحليلات (survey_analytics)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.survey_analytics (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES public.survey_questions(id) ON DELETE CASCADE,
    
    -- نوع التحليل
    metric_type TEXT NOT NULL CHECK (metric_type IN (
        'total_responses',
        'completion_rate',
        'average_time',
        'question_skip_rate',
        'option_distribution',
        'average_rating',
        'nps_score',
        'sentiment_analysis'
    )),
    
    -- القيمة
    metric_value NUMERIC,
    metric_data JSONB,
    
    -- الفترة الزمنية
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(survey_id, question_id, metric_type, period_start)
);

CREATE INDEX idx_survey_analytics_survey_id ON public.survey_analytics(survey_id);
CREATE INDEX idx_survey_analytics_question_id ON public.survey_analytics(question_id);
CREATE INDEX idx_survey_analytics_metric_type ON public.survey_analytics(metric_type);

-- =====================================================
-- 7. جدول المشاركة (survey_shares)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.survey_shares (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    
    -- رابط المشاركة
    share_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    share_url TEXT,
    
    -- إعدادات المشاركة
    share_type TEXT NOT NULL CHECK (share_type IN ('public_link', 'email', 'social_media', 'embed')),
    is_active BOOLEAN DEFAULT true,
    
    -- حدود الاستخدام
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    
    -- البيانات الوصفية
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- إحصائيات
    total_clicks INTEGER DEFAULT 0,
    total_responses INTEGER DEFAULT 0
);

CREATE INDEX idx_survey_shares_survey_id ON public.survey_shares(survey_id);
CREATE INDEX idx_survey_shares_share_token ON public.survey_shares(share_token);
CREATE INDEX idx_survey_shares_created_by ON public.survey_shares(created_by);

-- =====================================================
-- 8. جدول القوالب (survey_templates)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.survey_templates (
    id SERIAL PRIMARY KEY,
    template_name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    
    -- محتوى القالب
    template_data JSONB NOT NULL,
    
    -- الإعدادات
    is_public BOOLEAN DEFAULT false,
    is_system BOOLEAN DEFAULT false,
    
    -- البيانات الوصفية
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- إحصائيات الاستخدام
    usage_count INTEGER DEFAULT 0,
    
    -- معاينة
    preview_image_url TEXT,
    tags TEXT[]
);

CREATE INDEX idx_survey_templates_category ON public.survey_templates(category);
CREATE INDEX idx_survey_templates_is_public ON public.survey_templates(is_public);
CREATE INDEX idx_survey_templates_created_by ON public.survey_templates(created_by);

-- =====================================================
-- 9. جدول الإشعارات (survey_notifications)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.survey_notifications (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'new_response',
        'survey_completed',
        'milestone_reached',
        'survey_closing_soon',
        'low_response_rate'
    )),
    
    -- المستلمون
    recipient_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_email TEXT,
    
    -- المحتوى
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    
    -- الحالة
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ,
    
    -- البيانات الإضافية
    metadata JSONB,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_survey_notifications_survey_id ON public.survey_notifications(survey_id);
CREATE INDEX idx_survey_notifications_recipient_user_id ON public.survey_notifications(recipient_user_id);
CREATE INDEX idx_survey_notifications_is_sent ON public.survey_notifications(is_sent);

-- =====================================================
-- 10. جدول سجل التعديلات (survey_audit_log)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.survey_audit_log (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER REFERENCES public.surveys(id) ON DELETE CASCADE,
    
    action_type TEXT NOT NULL CHECK (action_type IN (
        'created',
        'updated',
        'published',
        'paused',
        'closed',
        'deleted',
        'question_added',
        'question_updated',
        'question_deleted',
        'settings_changed'
    )),
    
    -- التفاصيل
    changes JSONB,
    
    -- من قام بالإجراء
    performed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_survey_audit_log_survey_id ON public.survey_audit_log(survey_id);
CREATE INDEX idx_survey_audit_log_action_type ON public.survey_audit_log(action_type);
CREATE INDEX idx_survey_audit_log_performed_by ON public.survey_audit_log(performed_by);
CREATE INDEX idx_survey_audit_log_created_at ON public.survey_audit_log(created_at DESC);

-- =====================================================
-- Triggers لتحديث updated_at
-- =====================================================

CREATE TRIGGER update_surveys_updated_at 
    BEFORE UPDATE ON public.surveys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_survey_sections_updated_at 
    BEFORE UPDATE ON public.survey_sections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_survey_questions_updated_at 
    BEFORE UPDATE ON public.survey_questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_survey_responses_updated_at 
    BEFORE UPDATE ON public.survey_responses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_survey_answers_updated_at 
    BEFORE UPDATE ON public.survey_answers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_survey_templates_updated_at 
    BEFORE UPDATE ON public.survey_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Trigger لتحديث إحصائيات الاستبيان
-- =====================================================

CREATE OR REPLACE FUNCTION update_survey_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
        UPDATE public.surveys
        SET 
            total_responses = (
                SELECT COUNT(*) 
                FROM public.survey_responses 
                WHERE survey_id = NEW.survey_id AND status = 'completed'
            ),
            completion_rate = (
                SELECT 
                    CASE 
                        WHEN COUNT(*) > 0 THEN 
                            (COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / COUNT(*) * 100)
                        ELSE 0
                    END
                FROM public.survey_responses 
                WHERE survey_id = NEW.survey_id
            )
        WHERE id = NEW.survey_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_survey_stats
    AFTER INSERT OR UPDATE ON public.survey_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_survey_stats();

-- =====================================================
-- دوال مساعدة للاستبيانات
-- =====================================================

-- دالة للتحقق من إمكانية الوصول للاستبيان
CREATE OR REPLACE FUNCTION can_access_survey(
    p_survey_id INTEGER,
    p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_survey RECORD;
    v_is_member BOOLEAN := false;
BEGIN
    -- الحصول على معلومات الاستبيان
    SELECT * INTO v_survey
    FROM public.surveys
    WHERE id = p_survey_id;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- التحقق من الحالة
    IF v_survey.status != 'active' THEN
        RETURN false;
    END IF;
    
    -- التحقق من التاريخ
    IF v_survey.start_date IS NOT NULL AND v_survey.start_date > NOW() THEN
        RETURN false;
    END IF;
    
    IF v_survey.end_date IS NOT NULL AND v_survey.end_date < NOW() THEN
        RETURN false;
    END IF;
    
    -- التحقق من نوع الوصول
    IF v_survey.access_type = 'public' THEN
        RETURN true;
    END IF;
    
    IF v_survey.access_type = 'members_only' THEN
        IF p_user_id IS NULL THEN
            RETURN false;
        END IF;
        
        -- التحقق من أن المستخدم عضو نشط
        SELECT EXISTS(
            SELECT 1 
            FROM public.user_roles 
            WHERE user_id = p_user_id AND is_active = true
        ) INTO v_is_member;
        
        RETURN v_is_member;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- دالة للتحقق من إمكانية الإجابة على الاستبيان
CREATE OR REPLACE FUNCTION can_respond_to_survey(
    p_survey_id INTEGER,
    p_user_id UUID DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_survey RECORD;
    v_response_count INTEGER;
BEGIN
    -- التحقق من إمكانية الوصول
    IF NOT can_access_survey(p_survey_id, p_user_id) THEN
        RETURN false;
    END IF;
    
    -- الحصول على معلومات الاستبيان
    SELECT * INTO v_survey
    FROM public.surveys
    WHERE id = p_survey_id;
    
    -- التحقق من الحد الأقصى للاستجابات
    IF v_survey.max_responses IS NOT NULL AND v_survey.total_responses >= v_survey.max_responses THEN
        RETURN false;
    END IF;
    
    -- التحقق من عدد الاستجابات للمستخدم
    IF NOT v_survey.allow_multiple_responses THEN
        IF p_user_id IS NOT NULL THEN
            SELECT COUNT(*) INTO v_response_count
            FROM public.survey_responses
            WHERE survey_id = p_survey_id 
                AND user_id = p_user_id 
                AND status = 'completed';
            
            IF v_response_count >= v_survey.response_limit_per_user THEN
                RETURN false;
            END IF;
        ELSIF p_ip_address IS NOT NULL THEN
            SELECT COUNT(*) INTO v_response_count
            FROM public.survey_responses
            WHERE survey_id = p_survey_id 
                AND ip_address = p_ip_address 
                AND status = 'completed';
            
            IF v_response_count >= v_survey.response_limit_per_user THEN
                RETURN false;
            END IF;
        END IF;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- دالة لحساب NPS Score
CREATE OR REPLACE FUNCTION calculate_nps_score(p_survey_id INTEGER, p_question_id INTEGER)
RETURNS NUMERIC AS $$
DECLARE
    v_total INTEGER;
    v_promoters INTEGER;
    v_detractors INTEGER;
    v_nps NUMERIC;
BEGIN
    SELECT COUNT(*) INTO v_total
    FROM public.survey_answers
    WHERE question_id = p_question_id
        AND answer_number IS NOT NULL;
    
    IF v_total = 0 THEN
        RETURN NULL;
    END IF;
    
    SELECT COUNT(*) INTO v_promoters
    FROM public.survey_answers
    WHERE question_id = p_question_id
        AND answer_number >= 9;
    
    SELECT COUNT(*) INTO v_detractors
    FROM public.survey_answers
    WHERE question_id = p_question_id
        AND answer_number <= 6;
    
    v_nps := ((v_promoters::NUMERIC - v_detractors::NUMERIC) / v_total::NUMERIC) * 100;
    
    RETURN ROUND(v_nps, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- دالة لحساب متوسط التقييم
CREATE OR REPLACE FUNCTION calculate_average_rating(p_question_id INTEGER)
RETURNS NUMERIC AS $$
DECLARE
    v_average NUMERIC;
BEGIN
    SELECT AVG(answer_number) INTO v_average
    FROM public.survey_answers
    WHERE question_id = p_question_id
        AND answer_number IS NOT NULL;
    
    RETURN ROUND(v_average, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- دالة للحصول على توزيع الخيارات
CREATE OR REPLACE FUNCTION get_option_distribution(p_question_id INTEGER)
RETURNS TABLE(
    option_value TEXT,
    count BIGINT,
    percentage NUMERIC
) AS $$
DECLARE
    v_total BIGINT;
BEGIN
    SELECT COUNT(*) INTO v_total
    FROM public.survey_answers
    WHERE question_id = p_question_id;
    
    IF v_total = 0 THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        sa.answer_text,
        COUNT(*) as count,
        ROUND((COUNT(*)::NUMERIC / v_total::NUMERIC) * 100, 2) as percentage
    FROM public.survey_answers sa
    WHERE sa.question_id = p_question_id
        AND sa.answer_text IS NOT NULL
    GROUP BY sa.answer_text
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- تعليقات على الجداول
-- =====================================================

COMMENT ON TABLE public.surveys IS 'جدول الاستبيانات الرئيسي - يحتوي على جميع الاستبيانات';
COMMENT ON TABLE public.survey_sections IS 'أقسام الاستبيانات لتنظيم الأسئلة';
COMMENT ON TABLE public.survey_questions IS 'أسئلة الاستبيانات بأنواعها المختلفة';
COMMENT ON TABLE public.survey_responses IS 'استجابات المستخدمين للاستبيانات';
COMMENT ON TABLE public.survey_answers IS 'إجابات الأسئلة الفردية';
COMMENT ON TABLE public.survey_analytics IS 'تحليلات وإحصائيات الاستبيانات';
COMMENT ON TABLE public.survey_shares IS 'روابط مشاركة الاستبيانات';
COMMENT ON TABLE public.survey_templates IS 'قوالب الاستبيانات الجاهزة';
COMMENT ON TABLE public.survey_notifications IS 'إشعارات الاستبيانات';
COMMENT ON TABLE public.survey_audit_log IS 'سجل تدقيق تعديلات الاستبيانات';
