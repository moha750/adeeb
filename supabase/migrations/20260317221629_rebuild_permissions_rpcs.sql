-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260317221629   الاسم: rebuild_permissions_rpcs


-- إسقاط الدالتين القديمتين أولاً
DROP FUNCTION IF EXISTS get_user_permissions(uuid);
DROP FUNCTION IF EXISTS get_user_all_permissions(uuid);

-- ============================================================
-- get_user_permissions — تُستدعى من PermissionsHelper.js
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE (
    permission_key      TEXT,
    permission_name_ar  TEXT,
    category            TEXT
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

-- ============================================================
-- get_user_all_permissions — تُستدعى من AdeebPermissionsManager.js
-- تعيد نفس البيانات + حقول إضافية للتوافق
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_all_permissions(p_user_id UUID)
RETURNS TABLE (
    permission_key      TEXT,
    permission_name_ar  TEXT,
    category            TEXT,
    source              TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.permission_key,
        p.permission_name_ar,
        p.category,
        p.source
    FROM get_user_permissions(p_user_id) p;
    -- source يبقى NULL هنا لأن get_user_permissions لا يُعيده
    -- لكن العمود موجود للتوافق مع الكود القديم
END;
$$;

-- نعيد تعريف get_user_all_permissions بشكل صحيح
DROP FUNCTION IF EXISTS get_user_all_permissions(uuid);

CREATE OR REPLACE FUNCTION get_user_all_permissions(p_user_id UUID)
RETURNS TABLE (
    permission_key      TEXT,
    permission_name_ar  TEXT,
    category            TEXT,
    source              TEXT
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
        'user_specific'::TEXT AS source
    FROM user_specific_permissions usp
    JOIN permissions perm ON perm.id = usp.permission_id
    WHERE usp.user_id   = p_user_id
      AND usp.is_granted = true
      AND (usp.expires_at IS NULL OR usp.expires_at > now())

    EXCEPT

    SELECT DISTINCT
        perm.permission_key,
        perm.permission_name_ar,
        perm.category,
        'revoked'::TEXT AS source
    FROM user_specific_permissions usp
    JOIN permissions perm ON perm.id = usp.permission_id
    WHERE usp.user_id   = p_user_id
      AND usp.is_granted = false
      AND (usp.expires_at IS NULL OR usp.expires_at > now());
END;
$$;

