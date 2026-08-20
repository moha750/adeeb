-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260203092108   الاسم: create_admin_impersonation_logs

-- جدول لتسجيل عمليات دخول المسؤولين كمراقبين لحسابات المستخدمين
CREATE TABLE IF NOT EXISTS admin_impersonation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    ip_address TEXT,
    user_agent TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- إنشاء فهرس لتسريع البحث
CREATE INDEX IF NOT EXISTS idx_impersonation_admin_id ON admin_impersonation_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_target_user_id ON admin_impersonation_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_started_at ON admin_impersonation_logs(started_at DESC);

-- تفعيل RLS
ALTER TABLE admin_impersonation_logs ENABLE ROW LEVEL SECURITY;

-- سياسة: رئيس النادي فقط يمكنه رؤية جميع السجلات
CREATE POLICY "Club president can view all impersonation logs"
ON admin_impersonation_logs
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_level = 10
        AND ur.is_active = true
    )
);

-- سياسة: رئيس النادي فقط يمكنه إضافة سجلات
CREATE POLICY "Club president can insert impersonation logs"
ON admin_impersonation_logs
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_level = 10
        AND ur.is_active = true
    )
);

-- سياسة: رئيس النادي فقط يمكنه تحديث السجلات (لإنهاء الجلسة)
CREATE POLICY "Club president can update impersonation logs"
ON admin_impersonation_logs
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_level = 10
        AND ur.is_active = true
    )
);

COMMENT ON TABLE admin_impersonation_logs IS 'سجل عمليات دخول المسؤولين كمراقبين لحسابات المستخدمين';
COMMENT ON COLUMN admin_impersonation_logs.admin_id IS 'معرف المسؤول الذي قام بالدخول كمراقب';
COMMENT ON COLUMN admin_impersonation_logs.target_user_id IS 'معرف المستخدم المستهدف';
COMMENT ON COLUMN admin_impersonation_logs.started_at IS 'وقت بدء المراقبة';
COMMENT ON COLUMN admin_impersonation_logs.ended_at IS 'وقت انتهاء المراقبة';
