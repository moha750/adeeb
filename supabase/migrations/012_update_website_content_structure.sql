-- =====================================================
-- Migration: إعادة إنشاء جداول محتوى الموقع
-- الوصف: حذف الجداول القديمة وإنشائها من جديد بالبنية الصحيحة
-- التاريخ: 2026-01-18
-- =====================================================

-- =====================================================
-- 1. حذف الجداول القديمة (مع CASCADE)
-- =====================================================

DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS faq CASCADE;
DROP TABLE IF EXISTS works CASCADE;
DROP TABLE IF EXISTS sponsors CASCADE;

-- =====================================================
-- 2. إنشاء جدول الإنجازات (achievements)
-- =====================================================

CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    label TEXT NOT NULL,
    icon_class TEXT,
    count_number INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    plus_flag BOOLEAN DEFAULT false,
    created_by UUID REFERENCES profiles(id)
);

-- الفهارس
CREATE INDEX idx_achievements_order ON achievements("order");
CREATE INDEX idx_achievements_created_by ON achievements(created_by);

-- التعليقات
COMMENT ON TABLE achievements IS 'جدول الإنجازات المعروضة في الموقع';
COMMENT ON COLUMN achievements.label IS 'التسمية أو العنوان (مثال: عدد الأعضاء)';
COMMENT ON COLUMN achievements.icon_class IS 'اسم فئة الأيقونة (Font Awesome)';
COMMENT ON COLUMN achievements.count_number IS 'الرقم المعروض';
COMMENT ON COLUMN achievements."order" IS 'ترتيب العرض';
COMMENT ON COLUMN achievements.plus_flag IS 'إضافة علامة + بعد الرقم';
COMMENT ON COLUMN achievements.created_by IS 'معرف المستخدم الذي أنشأ الإنجاز';

-- تفعيل RLS
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- سياسات RLS
CREATE POLICY achievements_select_all ON achievements
    FOR SELECT USING (true);

CREATE POLICY achievements_insert_authenticated ON achievements
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY achievements_update_authenticated ON achievements
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY achievements_delete_authenticated ON achievements
    FOR DELETE TO authenticated
    USING (true);

-- =====================================================
-- 3. إنشاء جدول الأسئلة الشائعة (faq)
-- =====================================================

CREATE TABLE faq (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES profiles(id)
);

-- الفهارس
CREATE INDEX idx_faq_order ON faq("order");
CREATE INDEX idx_faq_created_by ON faq(created_by);

-- Trigger للـ updated_at
CREATE TRIGGER update_faq_updated_at
    BEFORE UPDATE ON faq
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- التعليقات
COMMENT ON TABLE faq IS 'جدول الأسئلة الشائعة';
COMMENT ON COLUMN faq.question IS 'نص السؤال';
COMMENT ON COLUMN faq.answer IS 'نص الإجابة';
COMMENT ON COLUMN faq."order" IS 'ترتيب العرض';
COMMENT ON COLUMN faq.created_by IS 'معرف المستخدم الذي أنشأ السؤال';

-- تفعيل RLS
ALTER TABLE faq ENABLE ROW LEVEL SECURITY;

-- سياسات RLS
CREATE POLICY faq_select_all ON faq
    FOR SELECT USING (true);

CREATE POLICY faq_insert_authenticated ON faq
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY faq_update_authenticated ON faq
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY faq_delete_authenticated ON faq
    FOR DELETE TO authenticated
    USING (true);

-- =====================================================
-- 4. إنشاء جدول الأعمال (works)
-- =====================================================

CREATE TABLE works (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    title TEXT NOT NULL,
    category TEXT,
    image_url TEXT NOT NULL,
    link_url TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES profiles(id)
);

-- الفهارس
CREATE INDEX idx_works_order ON works("order");
CREATE INDEX idx_works_category ON works(category);
CREATE INDEX idx_works_created_by ON works(created_by);

-- التعليقات
COMMENT ON TABLE works IS 'جدول أعمال النادي';
COMMENT ON COLUMN works.title IS 'عنوان العمل';
COMMENT ON COLUMN works.category IS 'الفئة (كتاب، مقال، فيديو، إلخ)';
COMMENT ON COLUMN works.image_url IS 'رابط صورة العمل';
COMMENT ON COLUMN works.link_url IS 'رابط العمل';
COMMENT ON COLUMN works."order" IS 'ترتيب العرض';
COMMENT ON COLUMN works.created_by IS 'معرف المستخدم الذي أنشأ العمل';

-- تفعيل RLS
ALTER TABLE works ENABLE ROW LEVEL SECURITY;

-- سياسات RLS
CREATE POLICY works_select_all ON works
    FOR SELECT USING (true);

CREATE POLICY works_insert_authenticated ON works
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY works_update_authenticated ON works
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY works_delete_authenticated ON works
    FOR DELETE TO authenticated
    USING (true);

-- =====================================================
-- 5. إنشاء جدول الشركاء (sponsors)
-- =====================================================

CREATE TABLE sponsors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    badge TEXT,
    logo_url TEXT NOT NULL,
    link_url TEXT,
    description TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES profiles(id)
);

-- الفهارس
CREATE INDEX idx_sponsors_order ON sponsors("order");
CREATE INDEX idx_sponsors_created_by ON sponsors(created_by);

-- التعليقات
COMMENT ON TABLE sponsors IS 'جدول الشركاء والرعاة';
COMMENT ON COLUMN sponsors.name IS 'اسم الشريك';
COMMENT ON COLUMN sponsors.badge IS 'شارة أو تصنيف الشريك';
COMMENT ON COLUMN sponsors.logo_url IS 'رابط شعار الشريك';
COMMENT ON COLUMN sponsors.link_url IS 'رابط موقع الشريك';
COMMENT ON COLUMN sponsors.description IS 'وصف الشريك';
COMMENT ON COLUMN sponsors."order" IS 'ترتيب العرض';
COMMENT ON COLUMN sponsors.created_by IS 'معرف المستخدم الذي أنشأ الشريك';

-- تفعيل RLS
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;

-- سياسات RLS
CREATE POLICY sponsors_select_all ON sponsors
    FOR SELECT USING (true);

CREATE POLICY sponsors_insert_authenticated ON sponsors
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY sponsors_update_authenticated ON sponsors
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY sponsors_delete_authenticated ON sponsors
    FOR DELETE TO authenticated
    USING (true);
