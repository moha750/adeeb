-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260318001407   الاسم: fix_get_user_permissions_missing_table


-- إنشاء جدول user_specific_permissions إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS user_specific_permissions (
    id           BIGSERIAL PRIMARY KEY,
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    is_granted   BOOLEAN NOT NULL DEFAULT true,
    granted_by   UUID REFERENCES auth.users(id),
    expires_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, permission_id)
);

ALTER TABLE user_specific_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usp_select_own"
    ON user_specific_permissions FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "usp_manage_president"
    ON user_specific_permissions FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND ur.is_active = true
              AND r.role_name = 'club_president'
        )
    );

-- إعادة بناء get_user_permissions بعد إنشاء الجدول
DROP FUNCTION IF EXISTS get_user_permissions(uuid);

CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE (
    permission_key    TEXT,
    permission_name_ar TEXT,
    category          TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    -- صلاحيات الدور
    SELECT DISTINCT
        perm.permission_key,
        perm.permission_name_ar,
        perm.category
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions perm    ON perm.id = rp.permission_id
    WHERE ur.user_id  = p_user_id
      AND ur.is_active = true

    UNION

    -- الصلاحيات الفردية المضافة
    SELECT DISTINCT
        perm.permission_key,
        perm.permission_name_ar,
        perm.category
    FROM user_specific_permissions usp
    JOIN permissions perm ON perm.id = usp.permission_id
    WHERE usp.user_id   = p_user_id
      AND usp.is_granted = true
      AND (usp.expires_at IS NULL OR usp.expires_at > now())

    EXCEPT

    -- حذف الصلاحيات المحظورة صراحةً
    SELECT DISTINCT
        perm.permission_key,
        perm.permission_name_ar,
        perm.category
    FROM user_specific_permissions usp
    JOIN permissions perm ON perm.id = usp.permission_id
    WHERE usp.user_id   = p_user_id
      AND usp.is_granted = false
      AND (usp.expires_at IS NULL OR usp.expires_at > now());
END;
$$;

-- إعادة بناء get_user_all_permissions أيضاً
DROP FUNCTION IF EXISTS get_user_all_permissions(uuid);

CREATE OR REPLACE FUNCTION get_user_all_permissions(p_user_id UUID)
RETURNS TABLE (
    permission_key     TEXT,
    permission_name_ar TEXT,
    category           TEXT,
    source             TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        perm.permission_key,
        perm.permission_name_ar,
        perm.category,
        'role'::TEXT AS source
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions perm    ON perm.id = rp.permission_id
    WHERE ur.user_id  = p_user_id
      AND ur.is_active = true

    UNION

    SELECT DISTINCT
        perm.permission_key,
        perm.permission_name_ar,
        perm.category,
        'user'::TEXT AS source
    FROM user_specific_permissions usp
    JOIN permissions perm ON perm.id = usp.permission_id
    WHERE usp.user_id   = p_user_id
      AND usp.is_granted = true
      AND (usp.expires_at IS NULL OR usp.expires_at > now());
END;
$$;

