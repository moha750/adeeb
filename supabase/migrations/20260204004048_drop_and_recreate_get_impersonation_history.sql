-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260204004048   الاسم: drop_and_recreate_get_impersonation_history


-- حذف الدالة القديمة
DROP FUNCTION IF EXISTS public.get_impersonation_history(integer, integer);

-- إعادة إنشاء الدالة بنوع البيانات الصحيح
CREATE OR REPLACE FUNCTION public.get_impersonation_history(p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS TABLE(
    session_id uuid, 
    admin_user_id uuid, 
    admin_name text, 
    admin_email text,
    impersonated_user_id uuid, 
    impersonated_name text, 
    impersonated_email text,
    started_at timestamp with time zone, 
    ended_at timestamp with time zone, 
    duration_minutes integer, 
    is_active boolean, 
    reason text
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
        au_admin.email::text,
        i.impersonated_user_id,
        ip.full_name,
        au_imp.email::text,
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

