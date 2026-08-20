-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260203102643   الاسم: fix_impersonation_function_return_types

-- إصلاح دالة get_active_impersonation - تعديل نوع البيانات المُرجع
DROP FUNCTION IF EXISTS get_active_impersonation();

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
        p.full_name::TEXT,
        au.email::TEXT,
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
