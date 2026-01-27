-- =====================================================
-- نظام الاستبيانات المتقدم - نادي أدِيب
-- =====================================================
-- تاريخ الإنشاء: 2026-01-27
-- الوصف: نظام استبيانات مرن ومتقدم بديل لـ Google Forms
-- =====================================================

-- =====================================================
-- 1. جدول الاستبيانات الرئيسي (surveys)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.surveys (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    
    -- الحالة والنشر
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'closed', 'archived')),
    
    -- نوع الاستبيان (قابل للتوسع مستقبلاً)
    survey_type TEXT NOT NULL DEFAULT 'general' CHECK (survey_type IN ('general', 'membership', 'event', 'feedback', 'evaluation', 'poll', 'quiz', 'research')),
    
    -- التحكم في الوصول (مرن للربط المستقبلي)
    access_type TEXT NOT NULL DEFAULT 'public' CHECK (access_type IN ('public', 'authenticated', 'members_only', 'specific_users', 'committee_only')),
    
    -- معلومات إضافية للربط المستقبلي (nullable للاستقلالية الحالية)
    committee_id INTEGER REFERENCES public.committees(id) ON DELETE SET NULL,
    target_role_level INTEGER CHECK (target_role_level BETWEEN 1 AND 10),
    
    -- إعدادات الاستبيان
    allow_multiple_responses BOOLEAN NOT NULL DEFAULT false,
    allow_anonymous BOOLEAN NOT NULL DEFAULT false,
    require_authentication BOOLEAN NOT NULL DEFAULT false,
    show_results_to_participants BOOLEAN NOT NULL DEFAULT false,
    collect_email BOOLEAN NOT NULL DEFAULT false,
    collect_phone BOOLEAN NOT NULL DEFAULT false,
    
    -- التوقيت
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    
    -- رسائل مخصصة
    welcome_message TEXT,
    thank_you_message TEXT,
    closed_message TEXT,
    
    -- التصميم والعرض
    theme_color TEXT DEFAULT '#3d8fd6',
    show_progress_bar BOOLEAN NOT NULL DEFAULT true,
    randomize_questions BOOLEAN NOT NULL DEFAULT false,
    
    -- الإحصائيات
    total_responses INTEGER NOT NULL DEFAULT 0,
    total_completed INTEGER NOT NULL DEFAULT 0,
    total_views INTEGER NOT NULL DEFAULT 0,
    
    -- معلومات الإنشاء
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ
);

-- فهارس للأداء
CREATE INDEX idx_surveys_status ON public.surveys(status);
CREATE INDEX idx_surveys_survey_type ON public.surveys(survey_type);
CREATE INDEX idx_surveys_access_type ON public.surveys(access_type);
CREATE INDEX idx_surveys_created_by ON public.surveys(created_by);
CREATE INDEX idx_surveys_committee_id ON public.surveys(committee_id);
CREATE INDEX idx_surveys_dates ON public.surveys(start_date, end_date);

-- =====================================================
-- 2. جدول أقسام الاستبيان (survey_sections)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.survey_sections (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    
    title TEXT NOT NULL,
    description TEXT,
    
    -- الترتيب
    section_order INTEGER NOT NULL DEFAULT 0,
    
    -- إعدادات القسم
    is_required BOOLEAN NOT NULL DEFAULT true,
    show_section_title BOOLEAN NOT NULL DEFAULT true,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(survey_id, section_order)
);

CREATE INDEX idx_survey_sections_survey_id ON public.survey_sections(survey_id);
CREATE INDEX idx_survey_sections_order ON public.survey_sections(survey_id, section_order);

-- =====================================================
-- 3. جدول الأسئلة (survey_questions)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.survey_questions (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    section_id INTEGER REFERENCES public.survey_sections(id) ON DELETE CASCADE,
    
    -- محتوى السؤال
    question_text TEXT NOT NULL,
    question_description TEXT,
    
    -- نوع السؤال (دعم شامل لجميع الأنواع)
    question_type TEXT NOT NULL CHECK (question_type IN (
        'short_text',           -- نص قصير
        'long_text',            -- نص طويل (paragraph)
        'single_choice',        -- اختيار واحد (radio)
        'multiple_choice',      -- اختيارات متعددة (checkbox)
        'dropdown',             -- قائمة منسدلة
        'linear_scale',         -- مقياس خطي (1-5, 1-10, etc)
        'rating_stars',         -- تقييم بالنجوم
        'rating_hearts',        -- تقييم بالقلوب
        'rating_emojis',        -- تقييم بالإيموجي
        'number',               -- رقم
        'email',                -- بريد إلكتروني
        'phone',                -- رقم هاتف
        'url',                  -- رابط
        'date',                 -- تاريخ
        'time',                 -- وقت
        'datetime',             -- تاريخ ووقت
        'file_upload',          -- رفع ملف
        'image_choice',         -- اختيار من صور
        'matrix_single',        -- مصفوفة اختيار واحد
        'matrix_multiple',      -- مصفوفة اختيارات متعددة
        'ranking',              -- ترتيب الخيارات
        'slider',               -- شريط منزلق
        'yes_no',               -- نعم/لا
        'agreement_scale',      -- مقياس الموافقة (موافق بشدة...غير موافق بشدة)
        'nps',                  -- Net Promoter Score
        'location',             -- موقع جغرافي
        'signature'             -- توقيع
    )),
    
    -- الترتيب
    question_order INTEGER NOT NULL DEFAULT 0,
    
    -- الإعدادات
    is_required BOOLEAN NOT NULL DEFAULT false,
    allow_other_option BOOLEAN NOT NULL DEFAULT false,
    
    -- خيارات السؤال (JSON للمرونة)
    options JSONB, -- للاختيارات، المقاييس، المصفوفات، إلخ
    
    -- قواعد التحقق
    validation_rules JSONB, -- {min, max, pattern, file_types, max_size, etc}
    
    -- المنطق الشرطي (للربط المستقبلي)
    conditional_logic JSONB, -- {show_if: {question_id: X, answer: Y}}
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_survey_questions_survey_id ON public.survey_questions(survey_id);
CREATE INDEX idx_survey_questions_section_id ON public.survey_questions(section_id);
CREATE INDEX idx_survey_questions_order ON public.survey_questions(survey_id, question_order);
CREATE INDEX idx_survey_questions_type ON public.survey_questions(question_type);

-- =====================================================
-- 4. جدول الاستجابات (survey_responses)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.survey_responses (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    
    -- معلومات المستجيب
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_anonymous BOOLEAN NOT NULL DEFAULT false,
    
    -- معلومات الاتصال (اختيارية)
    respondent_email TEXT,
    respondent_phone TEXT,
    respondent_name TEXT,
    
    -- الحالة
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    
    -- التقدم
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    
    -- الوقت
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    time_spent_seconds INTEGER, -- إجمالي الوقت المستغرق
    
    -- معلومات تقنية
    ip_address TEXT,
    user_agent TEXT,
    device_type TEXT, -- mobile, tablet, desktop
    
    -- بيانات إضافية
    metadata JSONB, -- أي بيانات إضافية مرنة
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_survey_responses_survey_id ON public.survey_responses(survey_id);
CREATE INDEX idx_survey_responses_user_id ON public.survey_responses(user_id);
CREATE INDEX idx_survey_responses_status ON public.survey_responses(status);
CREATE INDEX idx_survey_responses_completed_at ON public.survey_responses(completed_at);

-- =====================================================
-- 5. جدول الإجابات (survey_answers)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.survey_answers (
    id SERIAL PRIMARY KEY,
    response_id INTEGER NOT NULL REFERENCES public.survey_responses(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES public.survey_questions(id) ON DELETE CASCADE,
    
    -- الإجابة (مرنة لدعم جميع الأنواع)
    answer_text TEXT, -- للنصوص
    answer_number NUMERIC, -- للأرقام والمقاييس
    answer_date DATE, -- للتواريخ
    answer_time TIME, -- للأوقات
    answer_datetime TIMESTAMPTZ, -- للتاريخ والوقت
    answer_boolean BOOLEAN, -- لنعم/لا
    answer_json JSONB, -- للإجابات المعقدة (اختيارات متعددة، مصفوفات، إلخ)
    answer_file_url TEXT, -- لرفع الملفات
    
    -- معلومات إضافية
    answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    time_spent_seconds INTEGER, -- الوقت المستغرق على هذا السؤال
    
    UNIQUE(response_id, question_id)
);

CREATE INDEX idx_survey_answers_response_id ON public.survey_answers(response_id);
CREATE INDEX idx_survey_answers_question_id ON public.survey_answers(question_id);

-- =====================================================
-- 6. جدول القوالب (survey_templates)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.survey_templates (
    id SERIAL PRIMARY KEY,
    template_name TEXT NOT NULL,
    template_description TEXT,
    
    category TEXT NOT NULL CHECK (category IN ('general', 'membership', 'event', 'feedback', 'evaluation', 'custom')),
    
    -- بنية القالب (JSON كامل للاستبيان)
    template_structure JSONB NOT NULL,
    
    -- الإعدادات
    is_public BOOLEAN NOT NULL DEFAULT false,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    
    -- الاستخدام
    usage_count INTEGER NOT NULL DEFAULT 0,
    
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_survey_templates_category ON public.survey_templates(category);
CREATE INDEX idx_survey_templates_is_public ON public.survey_templates(is_public);

-- =====================================================
-- 7. جدول المشاركة (survey_shares)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.survey_shares (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    
    -- رابط المشاركة
    share_token TEXT UNIQUE NOT NULL,
    share_url TEXT NOT NULL,
    
    -- نوع المشاركة
    share_type TEXT NOT NULL CHECK (share_type IN ('public', 'private', 'limited')),
    
    -- القيود
    max_responses INTEGER, -- حد أقصى للاستجابات
    current_responses INTEGER NOT NULL DEFAULT 0,
    
    expires_at TIMESTAMPTZ,
    
    -- الإحصائيات
    click_count INTEGER NOT NULL DEFAULT 0,
    
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_survey_shares_survey_id ON public.survey_shares(survey_id);
CREATE INDEX idx_survey_shares_token ON public.survey_shares(share_token);
CREATE INDEX idx_survey_shares_is_active ON public.survey_shares(is_active);

-- =====================================================
-- 8. جدول الإشعارات (survey_notifications)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.survey_notifications (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    
    notification_type TEXT NOT NULL CHECK (notification_type IN ('new_response', 'survey_completed', 'milestone_reached', 'survey_closed')),
    
    recipient_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_survey_notifications_survey_id ON public.survey_notifications(survey_id);
CREATE INDEX idx_survey_notifications_recipient ON public.survey_notifications(recipient_user_id);
CREATE INDEX idx_survey_notifications_is_read ON public.survey_notifications(is_read);

-- =====================================================
-- 9. جدول التحليلات (survey_analytics)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.survey_analytics (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES public.survey_questions(id) ON DELETE CASCADE,
    
    -- نوع التحليل
    analytics_type TEXT NOT NULL CHECK (analytics_type IN ('question_summary', 'response_rate', 'completion_time', 'drop_off_rate', 'device_stats')),
    
    -- البيانات التحليلية (JSON مرن)
    analytics_data JSONB NOT NULL,
    
    -- الفترة الزمنية
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_survey_analytics_survey_id ON public.survey_analytics(survey_id);
CREATE INDEX idx_survey_analytics_question_id ON public.survey_analytics(question_id);
CREATE INDEX idx_survey_analytics_type ON public.survey_analytics(analytics_type);

-- =====================================================
-- الدوال المساعدة (Helper Functions)
-- =====================================================

-- دالة لتحديث updated_at تلقائياً
CREATE TRIGGER update_surveys_updated_at BEFORE UPDATE ON public.surveys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_survey_sections_updated_at BEFORE UPDATE ON public.survey_sections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_survey_questions_updated_at BEFORE UPDATE ON public.survey_questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_survey_responses_updated_at BEFORE UPDATE ON public.survey_responses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_survey_templates_updated_at BEFORE UPDATE ON public.survey_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- دالة لتحديث إحصائيات الاستبيان
-- =====================================================
CREATE OR REPLACE FUNCTION update_survey_statistics()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE public.surveys
        SET 
            total_responses = (
                SELECT COUNT(DISTINCT id) 
                FROM public.survey_responses 
                WHERE survey_id = NEW.survey_id
            ),
            total_completed = (
                SELECT COUNT(DISTINCT id) 
                FROM public.survey_responses 
                WHERE survey_id = NEW.survey_id AND status = 'completed'
            )
        WHERE id = NEW.survey_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_survey_statistics
    AFTER INSERT OR UPDATE ON public.survey_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_survey_statistics();

-- =====================================================
-- دالة لإنشاء رابط مشاركة فريد
-- =====================================================
CREATE OR REPLACE FUNCTION generate_survey_share_token()
RETURNS TEXT AS $$
DECLARE
    new_token TEXT;
    token_exists BOOLEAN;
BEGIN
    LOOP
        new_token := encode(gen_random_bytes(16), 'hex');
        
        SELECT EXISTS(SELECT 1 FROM public.survey_shares WHERE share_token = new_token) INTO token_exists;
        
        EXIT WHEN NOT token_exists;
    END LOOP;
    
    RETURN new_token;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- دالة للحصول على نتائج سؤال محدد
-- =====================================================
CREATE OR REPLACE FUNCTION get_question_results(p_question_id INTEGER)
RETURNS TABLE (
    question_text TEXT,
    question_type TEXT,
    total_answers BIGINT,
    results JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.question_text,
        q.question_type,
        COUNT(a.id) as total_answers,
        CASE 
            WHEN q.question_type IN ('single_choice', 'multiple_choice', 'dropdown') THEN
                jsonb_agg(
                    jsonb_build_object(
                        'answer', a.answer_json,
                        'count', 1
                    )
                )
            WHEN q.question_type IN ('linear_scale', 'rating_stars', 'number', 'slider') THEN
                jsonb_build_object(
                    'average', AVG(a.answer_number),
                    'min', MIN(a.answer_number),
                    'max', MAX(a.answer_number),
                    'count', COUNT(a.id)
                )
            ELSE
                jsonb_agg(
                    jsonb_build_object(
                        'answer', COALESCE(a.answer_text, a.answer_json::text),
                        'answered_at', a.answered_at
                    )
                )
        END as results
    FROM public.survey_questions q
    LEFT JOIN public.survey_answers a ON q.id = a.question_id
    WHERE q.id = p_question_id
    GROUP BY q.id, q.question_text, q.question_type;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- دالة للحصول على معدل الإكمال
-- =====================================================
CREATE OR REPLACE FUNCTION get_survey_completion_rate(p_survey_id INTEGER)
RETURNS NUMERIC AS $$
DECLARE
    total_started INTEGER;
    total_completed INTEGER;
    completion_rate NUMERIC;
BEGIN
    SELECT COUNT(*) INTO total_started
    FROM public.survey_responses
    WHERE survey_id = p_survey_id;
    
    SELECT COUNT(*) INTO total_completed
    FROM public.survey_responses
    WHERE survey_id = p_survey_id AND status = 'completed';
    
    IF total_started > 0 THEN
        completion_rate := (total_completed::NUMERIC / total_started::NUMERIC) * 100;
    ELSE
        completion_rate := 0;
    END IF;
    
    RETURN ROUND(completion_rate, 2);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Views (طرق العرض) للاستعلامات الشائعة
-- =====================================================

-- عرض شامل للاستبيانات مع الإحصائيات
CREATE OR REPLACE VIEW surveys_overview AS
SELECT 
    s.id,
    s.title,
    s.description,
    s.status,
    s.survey_type,
    s.access_type,
    s.total_responses,
    s.total_completed,
    s.total_views,
    s.start_date,
    s.end_date,
    s.created_at,
    s.published_at,
    p.full_name as created_by_name,
    c.committee_name_ar as committee_name,
    CASE 
        WHEN s.total_responses > 0 THEN 
            ROUND((s.total_completed::NUMERIC / s.total_responses::NUMERIC) * 100, 2)
        ELSE 0
    END as completion_rate,
    COUNT(DISTINCT sq.id) as total_questions
FROM public.surveys s
LEFT JOIN public.profiles p ON s.created_by = p.id
LEFT JOIN public.committees c ON s.committee_id = c.id
LEFT JOIN public.survey_questions sq ON s.id = sq.survey_id
GROUP BY s.id, p.full_name, c.committee_name_ar;

-- عرض تفصيلي للاستجابات
CREATE OR REPLACE VIEW survey_responses_detailed AS
SELECT 
    sr.id,
    sr.survey_id,
    s.title as survey_title,
    sr.user_id,
    p.full_name as respondent_name,
    sr.respondent_email,
    sr.respondent_phone,
    sr.is_anonymous,
    sr.status,
    sr.progress_percentage,
    sr.started_at,
    sr.completed_at,
    sr.time_spent_seconds,
    sr.device_type,
    COUNT(DISTINCT sa.id) as answers_count
FROM public.survey_responses sr
JOIN public.surveys s ON sr.survey_id = s.id
LEFT JOIN public.profiles p ON sr.user_id = p.id
LEFT JOIN public.survey_answers sa ON sr.id = sa.response_id
GROUP BY sr.id, s.title, p.full_name;

-- =====================================================
-- دالة لزيادة عدد المشاهدات
-- =====================================================
CREATE OR REPLACE FUNCTION increment_survey_views(survey_id INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE public.surveys
    SET total_views = total_views + 1
    WHERE id = survey_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- تعليقات ختامية
-- =====================================================
COMMENT ON TABLE public.surveys IS 'جدول الاستبيانات الرئيسي - نظام مرن ومستقل';
COMMENT ON TABLE public.survey_sections IS 'أقسام الاستبيان لتنظيم الأسئلة';
COMMENT ON TABLE public.survey_questions IS 'الأسئلة - دعم شامل لجميع الأنواع';
COMMENT ON TABLE public.survey_responses IS 'استجابات المشاركين';
COMMENT ON TABLE public.survey_answers IS 'الإجابات الفردية على الأسئلة';
COMMENT ON TABLE public.survey_templates IS 'قوالب جاهزة للاستبيانات';
COMMENT ON TABLE public.survey_shares IS 'روابط المشاركة والتوزيع';
COMMENT ON TABLE public.survey_notifications IS 'إشعارات نظام الاستبيانات';
COMMENT ON TABLE public.survey_analytics IS 'التحليلات والإحصائيات المتقدمة';
