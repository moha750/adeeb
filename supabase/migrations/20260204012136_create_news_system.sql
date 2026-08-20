-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260204012136   الاسم: create_news_system

-- إنشاء جدول الأخبار
CREATE TABLE IF NOT EXISTS news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE,
    summary TEXT,
    content TEXT NOT NULL,
    image_url TEXT,
    author_name TEXT,
    authors TEXT[],
    is_featured BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    published_at TIMESTAMPTZ,
    views INTEGER DEFAULT 0,
    tags TEXT[],
    category TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- إنشاء فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_news_status ON news(status);
CREATE INDEX IF NOT EXISTS idx_news_published_at ON news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_is_featured ON news(is_featured);
CREATE INDEX IF NOT EXISTS idx_news_slug ON news(slug);

-- إنشاء جدول تعليقات الأخبار (اختياري)
CREATE TABLE IF NOT EXISTS news_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    news_id UUID NOT NULL REFERENCES news(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    comment_text TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_news_comments_news_id ON news_comments(news_id);
CREATE INDEX IF NOT EXISTS idx_news_comments_approved ON news_comments(is_approved);

-- تفعيل RLS
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_comments ENABLE ROW LEVEL SECURITY;

-- سياسات RLS للأخبار
-- الجميع يمكنهم قراءة الأخبار المنشورة
CREATE POLICY "Anyone can view published news"
    ON news FOR SELECT
    USING (status = 'published');

-- المستخدمون المصادق عليهم يمكنهم إنشاء أخبار
CREATE POLICY "Authenticated users can create news"
    ON news FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- المستخدمون يمكنهم تحديث الأخبار التي أنشأوها
CREATE POLICY "Users can update their own news"
    ON news FOR UPDATE
    TO authenticated
    USING (created_by = auth.uid());

-- المستخدمون يمكنهم حذف الأخبار التي أنشأوها
CREATE POLICY "Users can delete their own news"
    ON news FOR DELETE
    TO authenticated
    USING (created_by = auth.uid());

-- سياسات RLS للتعليقات
CREATE POLICY "Anyone can view approved comments"
    ON news_comments FOR SELECT
    USING (is_approved = true);

CREATE POLICY "Authenticated users can create comments"
    ON news_comments FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Users can update their own comments"
    ON news_comments FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
    ON news_comments FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_news_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لتحديث updated_at
DROP TRIGGER IF EXISTS news_updated_at_trigger ON news;
CREATE TRIGGER news_updated_at_trigger
    BEFORE UPDATE ON news
    FOR EACH ROW
    EXECUTE FUNCTION update_news_updated_at();

DROP TRIGGER IF EXISTS news_comments_updated_at_trigger ON news_comments;
CREATE TRIGGER news_comments_updated_at_trigger
    BEFORE UPDATE ON news_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_news_updated_at();

-- دالة لتوليد slug تلقائياً
CREATE OR REPLACE FUNCTION generate_news_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug = lower(regexp_replace(NEW.title, '[^a-zA-Z0-9\u0600-\u06FF]+', '-', 'g'));
        NEW.slug = trim(both '-' from NEW.slug);
        NEW.slug = NEW.slug || '-' || substr(md5(random()::text), 1, 8);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS news_slug_trigger ON news;
CREATE TRIGGER news_slug_trigger
    BEFORE INSERT ON news
    FOR EACH ROW
    EXECUTE FUNCTION generate_news_slug();
