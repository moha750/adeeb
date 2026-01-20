-- إنشاء جدول رسائل التواصل
-- يحتوي على جميع الرسائل المرسلة من نموذج تواصل معنا

CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    replied_by UUID REFERENCES auth.users(id),
    replied_at TIMESTAMPTZ,
    reply_message TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء فهرس للبحث السريع
CREATE INDEX idx_contact_messages_status ON contact_messages(status);
CREATE INDEX idx_contact_messages_created_at ON contact_messages(created_at DESC);
CREATE INDEX idx_contact_messages_email ON contact_messages(email);

-- إنشاء دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_contact_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء محفز لتحديث updated_at
CREATE TRIGGER trigger_update_contact_messages_updated_at
    BEFORE UPDATE ON contact_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_contact_messages_updated_at();

-- إضافة تعليقات على الجدول والأعمدة
COMMENT ON TABLE contact_messages IS 'جدول رسائل التواصل من نموذج تواصل معنا';
COMMENT ON COLUMN contact_messages.status IS 'حالة الرسالة: new (جديدة), read (مقروءة), replied (تم الرد), archived (مؤرشفة)';
COMMENT ON COLUMN contact_messages.priority IS 'أولوية الرسالة: low, normal, high, urgent';
