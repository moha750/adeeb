-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260203100906   الاسم: create_impersonation_system

-- جدول لتتبع جلسات التنكر
CREATE TABLE IF NOT EXISTS impersonation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    impersonated_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    reason TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- فهرس لتسريع البحث
CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_admin ON impersonation_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_impersonated ON impersonation_sessions(impersonated_user_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_active ON impersonation_sessions(is_active) WHERE is_active = true;

-- تفعيل RLS
ALTER TABLE impersonation_sessions ENABLE ROW LEVEL SECURITY;

-- سياسة: رئيس النادي فقط يمكنه رؤية جميع الجلسات
CREATE POLICY "Presidents can view all impersonation sessions"
    ON impersonation_sessions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND ur.is_active = true
            AND r.role_level >= 10
        )
    );

-- سياسة: رئيس النادي فقط يمكنه إنشاء جلسات تنكر
CREATE POLICY "Presidents can create impersonation sessions"
    ON impersonation_sessions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND ur.is_active = true
            AND r.role_level >= 10
        )
    );

-- سياسة: رئيس النادي فقط يمكنه تحديث جلسات التنكر
CREATE POLICY "Presidents can update impersonation sessions"
    ON impersonation_sessions
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND ur.is_active = true
            AND r.role_level >= 10
        )
    );

-- دالة للتحقق من وجود جلسة تنكر نشطة
CREATE OR REPLACE FUNCTION get_active_impersonation()
RETURNS TABLE (
    session_id UUID,
    admin_user_id UUID,
    impersonated_user_id UUID,
    admin_name TEXT,
    admin_email TEXT,
    started_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.admin_user_id,
        i.impersonated_user_id,
        p.full_name,
        au.email,
        i.started_at
    FROM impersonation_sessions i
    JOIN auth.users au ON i.admin_user_id = au.id
    LEFT JOIN profiles p ON i.admin_user_id = p.id
    WHERE i.is_active = true
    AND (i.admin_user_id = auth.uid() OR i.impersonated_user_id = auth.uid())
    ORDER BY i.started_at DESC
    LIMIT 1;
END;
$$;

-- دالة لبدء جلسة تنكر
CREATE OR REPLACE FUNCTION start_impersonation(
    p_target_user_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id UUID;
    v_is_president BOOLEAN;
BEGIN
    -- التحقق من أن المستخدم الحالي هو رئيس النادي
    SELECT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 10
    ) INTO v_is_president;
    
    IF NOT v_is_president THEN
        RAISE EXCEPTION 'غير مصرح لك بهذه العملية';
    END IF;
    
    -- التحقق من عدم وجود جلسة نشطة
    IF EXISTS (
        SELECT 1 FROM impersonation_sessions
        WHERE admin_user_id = auth.uid()
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'لديك جلسة تنكر نشطة بالفعل';
    END IF;
    
    -- إنهاء أي جلسات قديمة غير منتهية
    UPDATE impersonation_sessions
    SET is_active = false, ended_at = NOW()
    WHERE admin_user_id = auth.uid()
    AND is_active = true;
    
    -- إنشاء جلسة جديدة
    INSERT INTO impersonation_sessions (
        admin_user_id,
        impersonated_user_id,
        reason,
        is_active
    ) VALUES (
        auth.uid(),
        p_target_user_id,
        p_reason,
        true
    ) RETURNING id INTO v_session_id;
    
    -- تسجيل النشاط
    PERFORM log_activity(
        auth.uid(),
        'impersonate_start',
        'user',
        p_target_user_id::TEXT,
        jsonb_build_object(
            'session_id', v_session_id,
            'reason', p_reason
        ),
        NULL
    );
    
    RETURN v_session_id;
END;
$$;

-- دالة لإنهاء جلسة التنكر
CREATE OR REPLACE FUNCTION end_impersonation(p_session_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id UUID;
    v_impersonated_user_id UUID;
BEGIN
    -- إذا لم يتم تحديد session_id، استخدم الجلسة النشطة
    IF p_session_id IS NULL THEN
        SELECT id, impersonated_user_id INTO v_session_id, v_impersonated_user_id
        FROM impersonation_sessions
        WHERE admin_user_id = auth.uid()
        AND is_active = true
        ORDER BY started_at DESC
        LIMIT 1;
    ELSE
        SELECT id, impersonated_user_id INTO v_session_id, v_impersonated_user_id
        FROM impersonation_sessions
        WHERE id = p_session_id
        AND admin_user_id = auth.uid()
        AND is_active = true;
    END IF;
    
    IF v_session_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- إنهاء الجلسة
    UPDATE impersonation_sessions
    SET is_active = false, ended_at = NOW(), updated_at = NOW()
    WHERE id = v_session_id;
    
    -- تسجيل النشاط
    PERFORM log_activity(
        auth.uid(),
        'impersonate_end',
        'user',
        v_impersonated_user_id::TEXT,
        jsonb_build_object('session_id', v_session_id),
        NULL
    );
    
    RETURN true;
END;
$$;

-- دالة للحصول على سجل التنكر
CREATE OR REPLACE FUNCTION get_impersonation_history(
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    session_id UUID,
    admin_user_id UUID,
    admin_name TEXT,
    admin_email TEXT,
    impersonated_user_id UUID,
    impersonated_name TEXT,
    impersonated_email TEXT,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_minutes INT,
    is_active BOOLEAN,
    reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- التحقق من أن المستخدم رئيس النادي
    IF NOT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 10
    ) THEN
        RAISE EXCEPTION 'غير مصرح لك بهذه العملية';
    END IF;
    
    RETURN QUERY
    SELECT 
        i.id,
        i.admin_user_id,
        ap.full_name,
        au_admin.email,
        i.impersonated_user_id,
        ip.full_name,
        au_imp.email,
        i.started_at,
        i.ended_at,
        CASE 
            WHEN i.ended_at IS NOT NULL THEN 
                EXTRACT(EPOCH FROM (i.ended_at - i.started_at))::INT / 60
            ELSE 
                EXTRACT(EPOCH FROM (NOW() - i.started_at))::INT / 60
        END,
        i.is_active,
        i.reason
    FROM impersonation_sessions i
    JOIN auth.users au_admin ON i.admin_user_id = au_admin.id
    JOIN auth.users au_imp ON i.impersonated_user_id = au_imp.id
    LEFT JOIN profiles ap ON i.admin_user_id = ap.id
    LEFT JOIN profiles ip ON i.impersonated_user_id = ip.id
    ORDER BY i.started_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;
