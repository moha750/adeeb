-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260130234313   الاسم: add_search_path_to_critical_functions

-- Migration: إضافة search_path للـ Functions الحرجة
-- استخدام نفس أسماء المعاملات الموجودة

-- Function: get_user_max_role_level (استخدام user_uuid كما هو موجود)
CREATE OR REPLACE FUNCTION get_user_max_role_level(user_uuid uuid)
RETURNS integer
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT COALESCE(MAX(r.role_level), 0)
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid
    AND ur.is_active = true;
$$;

-- Function: get_user_highest_role_level (استخدام user_uuid كما هو موجود)
CREATE OR REPLACE FUNCTION get_user_highest_role_level(user_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    highest_level INTEGER;
BEGIN
    SELECT MAX(r.role_level) INTO highest_level
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid AND ur.is_active = true;
    
    RETURN COALESCE(highest_level, 0);
END;
$$;

-- Function: check_permission (استخدام نفس المعاملات الموجودة)
CREATE OR REPLACE FUNCTION check_permission(
    p_user_id uuid, 
    p_permission_key text, 
    p_scope text DEFAULT 'all', 
    p_context jsonb DEFAULT '{}'
)
RETURNS boolean
LANGUAGE plpgsql
STABLE 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_has_permission BOOLEAN := false;
    v_user_specific_permission BOOLEAN;
    v_permission_id INTEGER;
BEGIN
    -- الحصول على معرف الصلاحية
    SELECT id INTO v_permission_id
    FROM public.permissions
    WHERE permission_key = p_permission_key;
    
    IF v_permission_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- 1. التحقق من الصلاحيات الخاصة بالمستخدم (أولوية قصوى)
    SELECT is_granted INTO v_user_specific_permission
    FROM public.user_specific_permissions
    WHERE user_id = p_user_id
        AND permission_id = v_permission_id
        AND (scope = p_scope OR scope = 'all')
        AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY 
        CASE WHEN scope = p_scope THEN 1 ELSE 2 END
    LIMIT 1;
    
    -- إذا وجدت صلاحية خاصة، استخدمها (سواء منح أو حظر)
    IF v_user_specific_permission IS NOT NULL THEN
        RETURN v_user_specific_permission;
    END IF;
    
    -- 2. التحقق من صلاحيات الدور
    SELECT EXISTS(
        SELECT 1
        FROM public.user_roles ur
        JOIN public.role_permissions rp ON ur.role_id = rp.role_id
        WHERE ur.user_id = p_user_id
            AND ur.is_active = true
            AND rp.permission_id = v_permission_id
            AND (rp.scope = p_scope OR rp.scope = 'all')
    ) INTO v_has_permission;
    
    RETURN v_has_permission;
END;
$$;

COMMENT ON FUNCTION get_user_max_role_level(uuid) IS 'الحصول على أعلى مستوى دور للمستخدم - محمي من SQL Injection';
COMMENT ON FUNCTION get_user_highest_role_level(uuid) IS 'الحصول على أعلى مستوى دور للمستخدم - محمي من SQL Injection';
COMMENT ON FUNCTION check_permission(uuid, text, text, jsonb) IS 'التحقق من صلاحيات المستخدم - محمي من SQL Injection';
