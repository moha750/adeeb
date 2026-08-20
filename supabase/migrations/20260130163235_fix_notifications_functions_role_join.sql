-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260130163235   الاسم: fix_notifications_functions_role_join


-- Drop and recreate get_user_notifications with proper role join
DROP FUNCTION IF EXISTS get_user_notifications(UUID, INT);

CREATE OR REPLACE FUNCTION get_user_notifications(
    p_user_id UUID,
    p_limit INT DEFAULT 50
)
RETURNS TABLE (
    id INT,
    title TEXT,
    message TEXT,
    type TEXT,
    priority TEXT,
    icon TEXT,
    action_url TEXT,
    action_label TEXT,
    created_at TIMESTAMPTZ,
    is_read BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.title,
        n.message,
        n.type,
        n.priority,
        n.icon,
        n.action_url,
        n.action_label,
        n.created_at,
        (nr.id IS NOT NULL) as is_read
    FROM notifications n
    LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = p_user_id
    WHERE 
        (n.expires_at IS NULL OR n.expires_at > NOW())
        AND (
            n.target_audience = 'all'
            OR (n.target_audience = 'specific_users' AND p_user_id = ANY(n.target_user_ids))
            OR (n.target_audience = 'members' AND EXISTS (
                SELECT 1 FROM member_details WHERE user_id = p_user_id
            ))
            OR (n.target_audience = 'committee_leaders' AND EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = p_user_id AND r.role_name = 'committee_leader'
            ))
            OR (n.target_audience = 'admins' AND EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = p_user_id AND r.role_name IN ('admin', 'super_admin')
            ))
            OR (n.target_audience = 'specific_committee' AND EXISTS (
                SELECT 1 FROM user_roles WHERE user_id = p_user_id AND committee_id = n.target_committee_id
            ))
        )
    ORDER BY n.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate get_unread_notifications_count with proper role join
DROP FUNCTION IF EXISTS get_unread_notifications_count(UUID);

CREATE OR REPLACE FUNCTION get_unread_notifications_count(
    p_user_id UUID
)
RETURNS INT AS $$
DECLARE
    unread_count INT;
BEGIN
    SELECT COUNT(*)::INT INTO unread_count
    FROM notifications n
    LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = p_user_id
    WHERE 
        nr.id IS NULL
        AND (n.expires_at IS NULL OR n.expires_at > NOW())
        AND (
            n.target_audience = 'all'
            OR (n.target_audience = 'specific_users' AND p_user_id = ANY(n.target_user_ids))
            OR (n.target_audience = 'members' AND EXISTS (
                SELECT 1 FROM member_details WHERE user_id = p_user_id
            ))
            OR (n.target_audience = 'committee_leaders' AND EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = p_user_id AND r.role_name = 'committee_leader'
            ))
            OR (n.target_audience = 'admins' AND EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = p_user_id AND r.role_name IN ('admin', 'super_admin')
            ))
            OR (n.target_audience = 'specific_committee' AND EXISTS (
                SELECT 1 FROM user_roles WHERE user_id = p_user_id AND committee_id = n.target_committee_id
            ))
        );
    
    RETURN unread_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

