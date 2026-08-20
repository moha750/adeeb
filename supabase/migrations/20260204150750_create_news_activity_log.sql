-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260204150750   الاسم: create_news_activity_log

-- جدول سجل نشاطات الأخبار
CREATE TABLE IF NOT EXISTS news_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id uuid NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id),
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- إضافة indexes
CREATE INDEX IF NOT EXISTS idx_news_activity_log_news_id ON news_activity_log(news_id);
CREATE INDEX IF NOT EXISTS idx_news_activity_log_user_id ON news_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_news_activity_log_action ON news_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_news_activity_log_created_at ON news_activity_log(created_at DESC);

-- تعليق
COMMENT ON TABLE news_activity_log IS 'سجل جميع النشاطات على الأخبار (إنشاء، تعديل، تعيين، نشر، إلخ)';

-- تفعيل RLS
ALTER TABLE news_activity_log ENABLE ROW LEVEL SECURITY;

-- سياسات RLS
CREATE POLICY "الجميع يمكنهم قراءة سجل النشاطات" ON news_activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

CREATE POLICY "النظام يمكنه إضافة سجلات" ON news_activity_log
  FOR INSERT WITH CHECK (true);
