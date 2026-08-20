-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260130161618   الاسم: notifications_rls_policies_v2

-- تفعيل RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies للإشعارات
CREATE POLICY "Users can view their notifications"
ON notifications FOR SELECT
USING (
    target_audience = 'all'
    OR (target_audience = 'specific_users' AND auth.uid() = ANY(target_user_ids))
    OR (target_audience = 'members' AND EXISTS (
        SELECT 1 FROM member_details WHERE user_id = auth.uid()
    ))
    OR (target_audience = 'committee_leaders' AND EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.role_level >= 7
    ))
    OR (target_audience = 'admins' AND EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.role_level >= 9
    ))
    OR (target_audience = 'specific_committee' AND EXISTS (
        SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND committee_id = target_committee_id
    ))
);

-- رئيس النادي فقط يمكنه إنشاء إشعارات
CREATE POLICY "Club president can create notifications"
ON notifications FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() 
        AND r.role_level >= 10
        AND ur.is_active = true
    )
);

CREATE POLICY "Club president can update notifications"
ON notifications FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() 
        AND r.role_level >= 10
        AND ur.is_active = true
    )
);

CREATE POLICY "Club president can delete notifications"
ON notifications FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() 
        AND r.role_level >= 10
        AND ur.is_active = true
    )
);

-- Policies لقراءة الإشعارات
CREATE POLICY "Users can view their own reads"
ON notification_reads FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can mark notifications as read"
ON notification_reads FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Policies لاشتراكات Push
CREATE POLICY "Users can view their own subscriptions"
ON push_subscriptions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own subscriptions"
ON push_subscriptions FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own subscriptions"
ON push_subscriptions FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own subscriptions"
ON push_subscriptions FOR DELETE
USING (user_id = auth.uid());
