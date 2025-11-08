-- جدول رسائل التواصل
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول اشتراكات النشرة البريدية
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ
);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_status ON newsletter_subscriptions(status);

-- تفعيل Row Level Security
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان - السماح بالإدراج للجميع (من الموقع)
CREATE POLICY "Allow public insert on contact_messages" 
  ON contact_messages FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public insert on newsletter_subscriptions" 
  ON newsletter_subscriptions FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

-- سياسات الأمان - السماح بالقراءة والتحديث للمصادقين فقط (الإداريين)
CREATE POLICY "Allow authenticated read on contact_messages" 
  ON contact_messages FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated update on contact_messages" 
  ON contact_messages FOR UPDATE 
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read on newsletter_subscriptions" 
  ON newsletter_subscriptions FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated update on newsletter_subscriptions" 
  ON newsletter_subscriptions FOR UPDATE 
  TO authenticated
  USING (true);

-- دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق الدالة على جدول contact_messages
CREATE TRIGGER update_contact_messages_updated_at
  BEFORE UPDATE ON contact_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- تعليقات توضيحية
COMMENT ON TABLE contact_messages IS 'رسائل التواصل من نموذج "تواصل معنا" في الموقع';
COMMENT ON TABLE newsletter_subscriptions IS 'اشتراكات النشرة البريدية من نموذج "انضم إلى مجتمعنا"';
COMMENT ON COLUMN contact_messages.status IS 'حالة الرسالة: new (جديدة), read (مقروءة), replied (تم الرد), archived (مؤرشفة)';
COMMENT ON COLUMN newsletter_subscriptions.status IS 'حالة الاشتراك: active (نشط), unsubscribed (ملغي)';
