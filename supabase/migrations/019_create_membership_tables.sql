-- إنشاء جدول طلبات العضوية
CREATE TABLE IF NOT EXISTS membership_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT NOT NULL,
    degree TEXT,
    college TEXT,
    major TEXT,
    skills TEXT,
    preferred_committee TEXT,
    portfolio_url TEXT,
    social_twitter TEXT,
    social_instagram TEXT,
    social_linkedin TEXT,
    about TEXT NOT NULL,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'under_review', 'accepted', 'rejected', 'archived')),
    admin_notes TEXT,
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    visitor_id TEXT,
    session_id TEXT,
    path TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء جدول إعدادات التسجيل
CREATE TABLE IF NOT EXISTS membership_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    join_open BOOLEAN DEFAULT true,
    join_membership_countdown BOOLEAN DEFAULT false,
    join_schedule_enabled BOOLEAN DEFAULT false,
    join_schedule_mode TEXT DEFAULT 'range' CHECK (join_schedule_mode IN ('range', 'open_only', 'close_only')),
    join_schedule_open_at TIMESTAMPTZ,
    join_schedule_close_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id)
);

-- إدراج الإعدادات الافتراضية
INSERT INTO membership_settings (id, join_open, join_membership_countdown, join_schedule_enabled)
VALUES ('default', true, false, false)
ON CONFLICT (id) DO NOTHING;

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_membership_applications_status ON membership_applications(status);
CREATE INDEX IF NOT EXISTS idx_membership_applications_created_at ON membership_applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_membership_applications_email ON membership_applications(email);
CREATE INDEX IF NOT EXISTS idx_membership_applications_preferred_committee ON membership_applications(preferred_committee);

-- تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_membership_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_membership_applications_updated_at
    BEFORE UPDATE ON membership_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_membership_applications_updated_at();

CREATE OR REPLACE FUNCTION update_membership_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_membership_settings_updated_at
    BEFORE UPDATE ON membership_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_membership_settings_updated_at();

-- إضافة تعليقات توضيحية
COMMENT ON TABLE membership_applications IS 'جدول طلبات التسجيل في العضوية';
COMMENT ON TABLE membership_settings IS 'إعدادات التحكم في فتح وإغلاق باب التسجيل';
COMMENT ON COLUMN membership_applications.status IS 'حالة الطلب: new, under_review, accepted, rejected, archived';
COMMENT ON COLUMN membership_settings.join_open IS 'هل باب التسجيل مفتوح (تحكم يدوي)';
COMMENT ON COLUMN membership_settings.join_membership_countdown IS 'إظهار العد التنازلي لإغلاق التسجيل';
COMMENT ON COLUMN membership_settings.join_schedule_enabled IS 'تفعيل الجدولة التلقائية';
COMMENT ON COLUMN membership_settings.join_schedule_mode IS 'نمط الجدولة: range (نطاق زمني), open_only (فتح فقط), close_only (إغلاق فقط)';
