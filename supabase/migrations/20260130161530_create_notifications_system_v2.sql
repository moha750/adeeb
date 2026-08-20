-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260130161530   الاسم: create_notifications_system_v2

-- حذف الجداول القديمة إن وجدت
DROP TABLE IF EXISTS notification_reads CASCADE;
DROP TABLE IF EXISTS push_subscriptions CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;

-- جدول الإشعارات
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error', 'announcement')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    icon TEXT,
    action_url TEXT,
    action_label TEXT,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    target_audience TEXT NOT NULL CHECK (target_audience IN ('all', 'members', 'committee_leaders', 'admins', 'specific_users', 'specific_committee')),
    target_committee_id INTEGER REFERENCES committees(id) ON DELETE CASCADE,
    target_user_ids UUID[],
    is_push_enabled BOOLEAN DEFAULT true,
    push_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- جدول قراءة الإشعارات
CREATE TABLE notification_reads (
    id SERIAL PRIMARY KEY,
    notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(notification_id, user_id)
);

-- جدول اشتراكات Push Notifications
CREATE TABLE push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
    browser TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, endpoint)
);

-- Indexes
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_target_audience ON notifications(target_audience);
CREATE INDEX idx_notifications_expires_at ON notifications(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_notification_reads_user_id ON notification_reads(user_id);
CREATE INDEX idx_notification_reads_notification_id ON notification_reads(notification_id);
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id) WHERE is_active = true;

-- Function لجلب الإشعارات
CREATE OR REPLACE FUNCTION get_user_notifications(p_user_id UUID, p_limit INT DEFAULT 50)
RETURNS TABLE (
    id INTEGER,
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
                SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role_name = 'committee_leader'
            ))
            OR (n.target_audience = 'admins' AND EXISTS (
                SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role_name IN ('admin', 'super_admin')
            ))
            OR (n.target_audience = 'specific_committee' AND EXISTS (
                SELECT 1 FROM user_roles WHERE user_id = p_user_id AND committee_id = n.target_committee_id
            ))
        )
    ORDER BY n.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function لعد الإشعارات غير المقروءة
CREATE OR REPLACE FUNCTION get_unread_notifications_count(p_user_id UUID)
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
                SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role_name = 'committee_leader'
            ))
            OR (n.target_audience = 'admins' AND EXISTS (
                SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role_name IN ('admin', 'super_admin')
            ))
            OR (n.target_audience = 'specific_committee' AND EXISTS (
                SELECT 1 FROM user_roles WHERE user_id = p_user_id AND committee_id = n.target_committee_id
            ))
        );
    
    RETURN unread_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
