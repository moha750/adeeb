-- =============================================
-- إزالة نظام Web Push بالكامل
-- • حذف جدول push_subscriptions
-- • حذف عمودَي is_push_enabled و push_sent_at من notifications
-- • تحديث _send_election_notification (حذف إدراج is_push_enabled)
-- =============================================

-- (1) حذف جدول push_subscriptions
DROP TABLE IF EXISTS public.push_subscriptions CASCADE;

-- (2) حذف الأعمدة
ALTER TABLE public.notifications
    DROP COLUMN IF EXISTS is_push_enabled,
    DROP COLUMN IF EXISTS push_sent_at;

-- (3) تحديث _send_election_notification
CREATE OR REPLACE FUNCTION public._send_election_notification(
    p_election_id UUID,
    p_audience    TEXT,
    p_title       TEXT,
    p_message     TEXT,
    p_type        TEXT DEFAULT 'info',
    p_priority    TEXT DEFAULT 'normal',
    p_user_ids    UUID[] DEFAULT NULL,
    p_metadata    JSONB DEFAULT '{}'::jsonb
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id INTEGER;
BEGIN
    INSERT INTO notifications (
        title, message, type, priority, icon,
        target_audience, target_election_id, target_user_ids,
        sender_id, metadata
    )
    VALUES (
        p_title, p_message, p_type, p_priority, 'fa-poll-h',
        p_audience, p_election_id, p_user_ids,
        auth.uid(), p_metadata
    )
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;
