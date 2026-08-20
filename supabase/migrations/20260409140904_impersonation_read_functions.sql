-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260409140904   الاسم: impersonation_read_functions


-- =====================================================
-- دوال التنكر للقراءة فقط (SECURITY DEFINER)
-- تسمح للمسؤول المتنكر برؤية بيانات المستخدم المستهدف
-- =====================================================

-- دالة مساعدة داخلية: التحقق من صلاحية التنكر
CREATE OR REPLACE FUNCTION verify_impersonation_access(p_target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- التحقق من أن المستدعي لديه صلاحية تنكر (مستوى 9+)
    IF NOT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 9
    ) THEN
        RETURN FALSE;
    END IF;

    -- التحقق من وجود جلسة تنكر نشطة لهذا المستخدم المستهدف
    IF NOT EXISTS (
        SELECT 1 FROM impersonation_sessions
        WHERE admin_user_id = auth.uid()
        AND impersonated_user_id = p_target_user_id
        AND is_active = true
    ) THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$;

-- =====================================================
-- 1. جلب الاستبيانات المشاركة مع المستخدم المستهدف
-- =====================================================
CREATE OR REPLACE FUNCTION impersonate_get_shared_surveys(p_target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
BEGIN
    -- التحقق من صلاحية التنكر
    IF NOT verify_impersonation_access(p_target_user_id) THEN
        RAISE EXCEPTION 'غير مصرح لك بهذه العملية أو لا توجد جلسة تنكر نشطة';
    END IF;

    SELECT json_agg(row_to_json(t))
    INTO v_result
    FROM (
        SELECT 
            ss.*,
            json_build_object(
                'id', s.id,
                'title', s.title,
                'description', s.description,
                'status', s.status,
                'access_type', s.access_type,
                'created_by', s.created_by,
                'created_at', s.created_at,
                'start_date', s.start_date,
                'end_date', s.end_date,
                'allow_multiple_responses', s.allow_multiple_responses,
                'allow_anonymous', s.allow_anonymous,
                'welcome_message', s.welcome_message,
                'show_progress_bar', s.show_progress_bar,
                'views_count', s.views_count
            ) AS survey,
            json_build_object(
                'full_name', p.full_name
            ) AS shared_by_profile
        FROM survey_sharing ss
        JOIN surveys s ON ss.survey_id = s.id
        LEFT JOIN profiles p ON ss.shared_by = p.id
        WHERE ss.shared_with = p_target_user_id
    ) t;

    RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- =====================================================
-- 2. جلب الاستبيانات التي أنشأها المستخدم المستهدف
-- =====================================================
CREATE OR REPLACE FUNCTION impersonate_get_user_surveys(p_target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
BEGIN
    -- التحقق من صلاحية التنكر
    IF NOT verify_impersonation_access(p_target_user_id) THEN
        RAISE EXCEPTION 'غير مصرح لك بهذه العملية أو لا توجد جلسة تنكر نشطة';
    END IF;

    SELECT json_agg(row_to_json(t))
    INTO v_result
    FROM (
        SELECT 
            s.*,
            json_build_object(
                'full_name', p.full_name
            ) AS created_by_profile,
            (SELECT json_agg(json_build_object('id', sq.id))
             FROM survey_questions sq WHERE sq.survey_id = s.id
            ) AS survey_questions
        FROM surveys s
        LEFT JOIN profiles p ON s.created_by = p.id
        WHERE s.created_by = p_target_user_id
        AND s.status NOT IN ('archived', 'deleted')
        ORDER BY s.created_at DESC
    ) t;

    RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- =====================================================
-- 3. جلب استجابات الاستبيانات للمستخدم المستهدف
-- =====================================================
CREATE OR REPLACE FUNCTION impersonate_get_survey_responses(p_target_user_id UUID, p_survey_id INTEGER DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
BEGIN
    -- التحقق من صلاحية التنكر
    IF NOT verify_impersonation_access(p_target_user_id) THEN
        RAISE EXCEPTION 'غير مصرح لك بهذه العملية أو لا توجد جلسة تنكر نشطة';
    END IF;

    SELECT json_agg(row_to_json(t))
    INTO v_result
    FROM (
        SELECT sr.*
        FROM survey_responses sr
        WHERE sr.user_id = p_target_user_id
        AND (p_survey_id IS NULL OR sr.survey_id = p_survey_id)
        ORDER BY sr.started_at DESC
    ) t;

    RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- =====================================================
-- 4. دالة عامة لقراءة بيانات المستخدم المستهدف (للجداول الشائعة)
-- =====================================================
CREATE OR REPLACE FUNCTION impersonate_read(
    p_target_user_id UUID,
    p_table_name TEXT,
    p_user_column TEXT DEFAULT 'user_id'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
    v_query TEXT;
    v_allowed_tables TEXT[] := ARRAY[
        'survey_responses',
        'survey_sharing',
        'notifications',
        'activity_reservations',
        'user_roles'
    ];
    v_allowed_columns TEXT[] := ARRAY[
        'user_id',
        'shared_with',
        'recipient_id'
    ];
BEGIN
    -- التحقق من صلاحية التنكر
    IF NOT verify_impersonation_access(p_target_user_id) THEN
        RAISE EXCEPTION 'غير مصرح لك بهذه العملية أو لا توجد جلسة تنكر نشطة';
    END IF;

    -- التحقق من أن الجدول مسموح
    IF NOT (p_table_name = ANY(v_allowed_tables)) THEN
        RAISE EXCEPTION 'الجدول "%" غير مسموح للتنكر', p_table_name;
    END IF;

    -- التحقق من أن العمود مسموح (منع SQL injection)
    IF NOT (p_user_column = ANY(v_allowed_columns)) THEN
        RAISE EXCEPTION 'العمود "%" غير مسموح', p_user_column;
    END IF;

    -- بناء وتنفيذ الاستعلام
    v_query := format(
        'SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM %I WHERE %I = $1 ORDER BY created_at DESC LIMIT 200) t',
        p_table_name,
        p_user_column
    );

    EXECUTE v_query INTO v_result USING p_target_user_id;

    RETURN COALESCE(v_result, '[]'::json);
END;
$$;

