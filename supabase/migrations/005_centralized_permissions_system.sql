-- =====================================================
-- نظام الصلاحيات المركزي لنادي أدِيب
-- Centralized Permissions System for Adeeb Club
-- =====================================================
-- تاريخ الإنشاء: 2026-01-17
-- الوصف: نظام صلاحيات مركزي مستقل يُلغي الحاجة لتعريف الصلاحيات في كل جدول
-- =====================================================

-- =====================================================
-- 1. تحديث جدول الصلاحيات (permissions)
-- =====================================================

-- حذف الجدول القديم إذا كان موجوداً وإعادة إنشائه بالبنية الجديدة
DROP TABLE IF EXISTS public.role_permissions CASCADE;
DROP TABLE IF EXISTS public.permissions CASCADE;

-- إنشاء جدول الصلاحيات المركزي
CREATE TABLE IF NOT EXISTS public.permissions (
    id SERIAL PRIMARY KEY,
    permission_key TEXT UNIQUE NOT NULL,
    permission_name_ar TEXT NOT NULL,
    permission_name_en TEXT NOT NULL,
    description TEXT,
    module TEXT NOT NULL,
    resource_type TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- إنشاء فهارس للأداء
CREATE INDEX idx_permissions_module ON public.permissions(module);
CREATE INDEX idx_permissions_key ON public.permissions(permission_key);
CREATE INDEX idx_permissions_is_system ON public.permissions(is_system);

-- =====================================================
-- 2. جدول ربط الأدوار بالصلاحيات (role_permissions)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    scope TEXT DEFAULT 'all' CHECK (scope IN ('all', 'own', 'committee', 'department')),
    conditions JSONB DEFAULT '{}'::JSONB,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    granted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    UNIQUE(role_id, permission_id, scope)
);

-- إنشاء فهارس
CREATE INDEX idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON public.role_permissions(permission_id);
CREATE INDEX idx_role_permissions_scope ON public.role_permissions(scope);

-- =====================================================
-- 3. جدول الصلاحيات الخاصة للمستخدمين (user_specific_permissions)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_specific_permissions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    scope TEXT DEFAULT 'all' CHECK (scope IN ('all', 'own', 'committee', 'department')),
    conditions JSONB DEFAULT '{}'::JSONB,
    is_granted BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    granted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    UNIQUE(user_id, permission_id, scope)
);

-- إنشاء فهارس
CREATE INDEX idx_user_specific_permissions_user_id ON public.user_specific_permissions(user_id);
CREATE INDEX idx_user_specific_permissions_permission_id ON public.user_specific_permissions(permission_id);
CREATE INDEX idx_user_specific_permissions_expires_at ON public.user_specific_permissions(expires_at);
CREATE INDEX idx_user_specific_permissions_is_granted ON public.user_specific_permissions(is_granted);

-- =====================================================
-- 4. جدول سجل تغييرات الصلاحيات (permissions_audit_log)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.permissions_audit_log (
    id SERIAL PRIMARY KEY,
    action_type TEXT NOT NULL CHECK (action_type IN ('grant', 'revoke', 'modify', 'create', 'delete')),
    target_type TEXT NOT NULL CHECK (target_type IN ('role_permission', 'user_permission', 'permission')),
    target_id INTEGER NOT NULL,
    permission_key TEXT,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    role_id INTEGER REFERENCES public.roles(id) ON DELETE SET NULL,
    performed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    old_value JSONB,
    new_value JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- إنشاء فهارس
CREATE INDEX idx_permissions_audit_log_action_type ON public.permissions_audit_log(action_type);
CREATE INDEX idx_permissions_audit_log_target_type ON public.permissions_audit_log(target_type);
CREATE INDEX idx_permissions_audit_log_user_id ON public.permissions_audit_log(user_id);
CREATE INDEX idx_permissions_audit_log_created_at ON public.permissions_audit_log(created_at DESC);

-- =====================================================
-- 5. تطبيق trigger لتحديث updated_at
-- =====================================================

CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON public.permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. دالة التحقق من الصلاحية (check_permission)
-- =====================================================

CREATE OR REPLACE FUNCTION check_permission(
    p_user_id UUID,
    p_permission_key TEXT,
    p_scope TEXT DEFAULT 'all',
    p_context JSONB DEFAULT '{}'::JSONB
)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- 7. دالة الحصول على جميع صلاحيات المستخدم
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_all_permissions(p_user_id UUID)
RETURNS TABLE (
    permission_key TEXT,
    permission_name_ar TEXT,
    permission_name_en TEXT,
    module TEXT,
    scope TEXT,
    source TEXT,
    expires_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    -- صلاحيات من الأدوار
    SELECT DISTINCT
        p.permission_key,
        p.permission_name_ar,
        p.permission_name_en,
        p.module,
        rp.scope,
        'role'::TEXT as source,
        NULL::TIMESTAMPTZ as expires_at
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = p_user_id
        AND ur.is_active = true
    
    UNION
    
    -- صلاحيات خاصة بالمستخدم (الممنوحة فقط)
    SELECT
        p.permission_key,
        p.permission_name_ar,
        p.permission_name_en,
        p.module,
        usp.scope,
        'user_specific'::TEXT as source,
        usp.expires_at
    FROM public.user_specific_permissions usp
    JOIN public.permissions p ON usp.permission_id = p.id
    WHERE usp.user_id = p_user_id
        AND usp.is_granted = true
        AND (usp.expires_at IS NULL OR usp.expires_at > NOW())
    
    ORDER BY module, permission_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- 8. دالة الحصول على صلاحيات المستخدم حسب القسم
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_permissions_by_module(
    p_user_id UUID,
    p_module TEXT
)
RETURNS TABLE (
    permission_key TEXT,
    permission_name_ar TEXT,
    scope TEXT,
    source TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.permission_key,
        up.permission_name_ar,
        up.scope,
        up.source
    FROM get_user_all_permissions(p_user_id) up
    WHERE up.module = p_module;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- 9. دالة التحقق من صلاحيات متعددة
-- =====================================================

CREATE OR REPLACE FUNCTION check_any_permission(
    p_user_id UUID,
    p_permission_keys TEXT[],
    p_scope TEXT DEFAULT 'all'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_key TEXT;
BEGIN
    FOREACH v_key IN ARRAY p_permission_keys
    LOOP
        IF check_permission(p_user_id, v_key, p_scope) THEN
            RETURN true;
        END IF;
    END LOOP;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- 10. دالة منح صلاحية لدور
-- =====================================================

CREATE OR REPLACE FUNCTION grant_permission_to_role(
    p_role_id INTEGER,
    p_permission_key TEXT,
    p_scope TEXT DEFAULT 'all',
    p_granted_by UUID DEFAULT NULL,
    p_conditions JSONB DEFAULT '{}'::JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
    v_permission_id INTEGER;
    v_role_permission_id INTEGER;
BEGIN
    -- الحصول على معرف الصلاحية
    SELECT id INTO v_permission_id
    FROM public.permissions
    WHERE permission_key = p_permission_key;
    
    IF v_permission_id IS NULL THEN
        RAISE EXCEPTION 'Permission key % not found', p_permission_key;
    END IF;
    
    -- إدراج أو تحديث الصلاحية
    INSERT INTO public.role_permissions (role_id, permission_id, scope, conditions, granted_by)
    VALUES (p_role_id, v_permission_id, p_scope, p_conditions, p_granted_by)
    ON CONFLICT (role_id, permission_id, scope) 
    DO UPDATE SET 
        conditions = p_conditions,
        granted_at = NOW(),
        granted_by = p_granted_by
    RETURNING id INTO v_role_permission_id;
    
    -- تسجيل في سجل التدقيق
    INSERT INTO public.permissions_audit_log (
        action_type, target_type, target_id, permission_key, 
        role_id, performed_by, new_value
    )
    VALUES (
        'grant', 'role_permission', v_role_permission_id, p_permission_key,
        p_role_id, p_granted_by, 
        jsonb_build_object('scope', p_scope, 'conditions', p_conditions)
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 11. دالة إلغاء صلاحية من دور
-- =====================================================

CREATE OR REPLACE FUNCTION revoke_permission_from_role(
    p_role_id INTEGER,
    p_permission_key TEXT,
    p_scope TEXT DEFAULT 'all',
    p_revoked_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_permission_id INTEGER;
    v_deleted_id INTEGER;
BEGIN
    -- الحصول على معرف الصلاحية
    SELECT id INTO v_permission_id
    FROM public.permissions
    WHERE permission_key = p_permission_key;
    
    IF v_permission_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- حذف الصلاحية
    DELETE FROM public.role_permissions
    WHERE role_id = p_role_id 
        AND permission_id = v_permission_id
        AND scope = p_scope
    RETURNING id INTO v_deleted_id;
    
    IF v_deleted_id IS NOT NULL THEN
        -- تسجيل في سجل التدقيق
        INSERT INTO public.permissions_audit_log (
            action_type, target_type, target_id, permission_key,
            role_id, performed_by
        )
        VALUES (
            'revoke', 'role_permission', v_deleted_id, p_permission_key,
            p_role_id, p_revoked_by
        );
        
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 12. دالة منح صلاحية خاصة لمستخدم
-- =====================================================

CREATE OR REPLACE FUNCTION grant_user_specific_permission(
    p_user_id UUID,
    p_permission_key TEXT,
    p_scope TEXT DEFAULT 'all',
    p_is_granted BOOLEAN DEFAULT true,
    p_expires_at TIMESTAMPTZ DEFAULT NULL,
    p_granted_by UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_permission_id INTEGER;
    v_user_permission_id INTEGER;
BEGIN
    -- الحصول على معرف الصلاحية
    SELECT id INTO v_permission_id
    FROM public.permissions
    WHERE permission_key = p_permission_key;
    
    IF v_permission_id IS NULL THEN
        RAISE EXCEPTION 'Permission key % not found', p_permission_key;
    END IF;
    
    -- إدراج أو تحديث الصلاحية
    INSERT INTO public.user_specific_permissions (
        user_id, permission_id, scope, is_granted, 
        expires_at, granted_by, notes
    )
    VALUES (
        p_user_id, v_permission_id, p_scope, p_is_granted,
        p_expires_at, p_granted_by, p_notes
    )
    ON CONFLICT (user_id, permission_id, scope)
    DO UPDATE SET
        is_granted = p_is_granted,
        expires_at = p_expires_at,
        granted_at = NOW(),
        granted_by = p_granted_by,
        notes = p_notes
    RETURNING id INTO v_user_permission_id;
    
    -- تسجيل في سجل التدقيق
    INSERT INTO public.permissions_audit_log (
        action_type, target_type, target_id, permission_key,
        user_id, performed_by, new_value
    )
    VALUES (
        CASE WHEN p_is_granted THEN 'grant' ELSE 'revoke' END,
        'user_permission', v_user_permission_id, p_permission_key,
        p_user_id, p_granted_by,
        jsonb_build_object(
            'scope', p_scope, 
            'is_granted', p_is_granted,
            'expires_at', p_expires_at,
            'notes', p_notes
        )
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 13. دالة الحصول على صلاحيات دور معين
-- =====================================================

CREATE OR REPLACE FUNCTION get_role_permissions(p_role_id INTEGER)
RETURNS TABLE (
    permission_key TEXT,
    permission_name_ar TEXT,
    permission_name_en TEXT,
    module TEXT,
    scope TEXT,
    granted_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.permission_key,
        p.permission_name_ar,
        p.permission_name_en,
        p.module,
        rp.scope,
        rp.granted_at
    FROM public.role_permissions rp
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE rp.role_id = p_role_id
    ORDER BY p.module, p.permission_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- تعليقات على الجداول والدوال
-- =====================================================

COMMENT ON TABLE public.permissions IS 'جدول الصلاحيات المركزي - يحتوي على جميع صلاحيات النظام';
COMMENT ON TABLE public.role_permissions IS 'ربط الأدوار بالصلاحيات مع تحديد النطاق';
COMMENT ON TABLE public.user_specific_permissions IS 'صلاحيات خاصة للمستخدمين - تتجاوز صلاحيات الأدوار';
COMMENT ON TABLE public.permissions_audit_log IS 'سجل تدقيق جميع التغييرات على الصلاحيات';

COMMENT ON FUNCTION check_permission IS 'التحقق من صلاحية معينة لمستخدم';
COMMENT ON FUNCTION get_user_all_permissions IS 'الحصول على جميع صلاحيات المستخدم من الأدوار والصلاحيات الخاصة';
COMMENT ON FUNCTION grant_permission_to_role IS 'منح صلاحية لدور معين';
COMMENT ON FUNCTION revoke_permission_from_role IS 'إلغاء صلاحية من دور معين';
COMMENT ON FUNCTION grant_user_specific_permission IS 'منح أو حظر صلاحية خاصة لمستخدم';
