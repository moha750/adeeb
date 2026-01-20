-- =====================================================
-- إنشاء جداول محتوى الموقع
-- Create Website Content Tables
-- =====================================================
-- تاريخ الإنشاء: 2026-01-17
-- الوصف: إنشاء جداول أعمالنا، الإنجازات، الشركاء، والأسئلة الشائعة
-- =====================================================

-- =====================================================
-- 1. جدول أعمالنا (works)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.works (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    image_url TEXT,
    link_url TEXT,
    is_published BOOLEAN NOT NULL DEFAULT false,
    publish_date DATE,
    display_order INTEGER DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- إنشاء فهارس للأداء
CREATE INDEX idx_works_is_published ON public.works(is_published);
CREATE INDEX idx_works_category ON public.works(category);
CREATE INDEX idx_works_display_order ON public.works(display_order);
CREATE INDEX idx_works_created_by ON public.works(created_by);

-- تحديث timestamp تلقائياً
CREATE OR REPLACE FUNCTION update_works_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_works_updated_at
    BEFORE UPDATE ON public.works
    FOR EACH ROW
    EXECUTE FUNCTION update_works_updated_at();

-- =====================================================
-- 2. جدول الإنجازات (achievements)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.achievements (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    achievement_date DATE,
    image_url TEXT,
    category TEXT,
    display_order INTEGER DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- إنشاء فهارس للأداء
CREATE INDEX idx_achievements_category ON public.achievements(category);
CREATE INDEX idx_achievements_display_order ON public.achievements(display_order);
CREATE INDEX idx_achievements_achievement_date ON public.achievements(achievement_date);
CREATE INDEX idx_achievements_created_by ON public.achievements(created_by);

-- تحديث timestamp تلقائياً
CREATE OR REPLACE FUNCTION update_achievements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_achievements_updated_at
    BEFORE UPDATE ON public.achievements
    FOR EACH ROW
    EXECUTE FUNCTION update_achievements_updated_at();

-- =====================================================
-- 3. جدول الشركاء (sponsors)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.sponsors (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    logo TEXT,
    logo_url TEXT,
    link TEXT,
    link_url TEXT,
    badge TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- إنشاء فهارس للأداء
CREATE INDEX idx_sponsors_is_active ON public.sponsors(is_active);
CREATE INDEX idx_sponsors_display_order ON public.sponsors(display_order);
CREATE INDEX idx_sponsors_created_by ON public.sponsors(created_by);

-- تحديث timestamp تلقائياً
CREATE OR REPLACE FUNCTION update_sponsors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sponsors_updated_at
    BEFORE UPDATE ON public.sponsors
    FOR EACH ROW
    EXECUTE FUNCTION update_sponsors_updated_at();

-- =====================================================
-- 4. جدول الأسئلة الشائعة (faq)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.faq (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- إنشاء فهارس للأداء
CREATE INDEX idx_faq_is_active ON public.faq(is_active);
CREATE INDEX idx_faq_category ON public.faq(category);
CREATE INDEX idx_faq_display_order ON public.faq(display_order);
CREATE INDEX idx_faq_created_by ON public.faq(created_by);

-- تحديث timestamp تلقائياً
CREATE OR REPLACE FUNCTION update_faq_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_faq_updated_at
    BEFORE UPDATE ON public.faq
    FOR EACH ROW
    EXECUTE FUNCTION update_faq_updated_at();

-- =====================================================
-- إضافة تعليقات للجداول
-- =====================================================
COMMENT ON TABLE public.works IS 'جدول أعمال النادي المنشورة على الموقع';
COMMENT ON TABLE public.achievements IS 'جدول إنجازات النادي';
COMMENT ON TABLE public.sponsors IS 'جدول شركاء ورعاة النادي';
COMMENT ON TABLE public.faq IS 'جدول الأسئلة الشائعة';
