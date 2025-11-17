-- جدول أخبار أديب
-- يحتوي على جميع الأخبار المنشورة في الموقع

CREATE TABLE IF NOT EXISTS news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  image_url TEXT,
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT,
  authors TEXT[], -- Array of author names
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  views INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_news_status ON news(status);
CREATE INDEX IF NOT EXISTS idx_news_published_at ON news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_featured ON news(is_featured) WHERE is_featured = true;

-- تحديث تلقائي لـ updated_at
CREATE OR REPLACE FUNCTION update_news_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_news_updated_at
  BEFORE UPDATE ON news
  FOR EACH ROW
  EXECUTE FUNCTION update_news_updated_at();

-- Row Level Security (RLS)
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- السماح للجميع بقراءة الأخبار المنشورة
CREATE POLICY "Allow public read published news"
  ON news FOR SELECT
  USING (status = 'published');

-- السماح للمصادقين بقراءة جميع الأخبار
CREATE POLICY "Allow authenticated read all news"
  ON news FOR SELECT
  TO authenticated
  USING (true);

-- السماح للمصادقين بإضافة أخبار
CREATE POLICY "Allow authenticated insert news"
  ON news FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- السماح للمصادقين بتحديث الأخبار
CREATE POLICY "Allow authenticated update news"
  ON news FOR UPDATE
  TO authenticated
  USING (true);

-- السماح للمصادقين بحذف الأخبار
CREATE POLICY "Allow authenticated delete news"
  ON news FOR DELETE
  TO authenticated
  USING (true);

-- إضافة تعليقات للجدول
COMMENT ON TABLE news IS 'جدول أخبار أديب - يحتوي على جميع الأخبار المنشورة في الموقع';
COMMENT ON COLUMN news.title IS 'عنوان الخبر';
COMMENT ON COLUMN news.content IS 'محتوى الخبر الكامل (HTML)';
COMMENT ON COLUMN news.summary IS 'ملخص قصير للخبر';
COMMENT ON COLUMN news.image_url IS 'رابط صورة الخبر';
COMMENT ON COLUMN news.author_id IS 'معرف الكاتب من جدول المستخدمين';
COMMENT ON COLUMN news.author_name IS 'اسم الكاتب';
COMMENT ON COLUMN news.status IS 'حالة الخبر: draft (مسودة), published (منشور), archived (مؤرشف)';
COMMENT ON COLUMN news.views IS 'عدد المشاهدات';
COMMENT ON COLUMN news.is_featured IS 'هل الخبر مميز (يظهر في الصفحة الرئيسية)';
COMMENT ON COLUMN news.published_at IS 'تاريخ النشر';
