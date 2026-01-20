-- =====================================================
-- نظام تتبع زيارات الموقع
-- =====================================================
-- تاريخ الإنشاء: 2026-01-20
-- الوصف: جدول لتخزين وتتبع زيارات الموقع
-- =====================================================

-- =====================================================
-- 1. جدول الزيارات (site_visits)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.site_visits (
    id BIGSERIAL PRIMARY KEY,
    
    -- معلومات الصفحة
    page_url TEXT NOT NULL,
    page_title TEXT,
    page_path TEXT NOT NULL,
    referrer TEXT,
    
    -- معلومات الزائر (مجهولة)
    visitor_id TEXT, -- معرف مجهول من localStorage
    session_id TEXT, -- معرف الجلسة
    
    -- معلومات تقنية
    ip_address INET,
    user_agent TEXT,
    browser_name TEXT,
    browser_version TEXT,
    os_name TEXT,
    os_version TEXT,
    device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'unknown')),
    device_vendor TEXT,
    
    -- معلومات جغرافية (اختيارية - يمكن إضافتها لاحقاً)
    country TEXT,
    city TEXT,
    
    -- معلومات الزيارة
    visit_duration INTEGER, -- بالثواني
    is_bounce BOOLEAN DEFAULT false, -- هل غادر مباشرة
    screen_width INTEGER,
    screen_height INTEGER,
    
    -- الطوابع الزمنية
    visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 2. الفهارس لتحسين الأداء
-- =====================================================
CREATE INDEX idx_site_visits_visited_at ON public.site_visits(visited_at DESC);
CREATE INDEX idx_site_visits_page_path ON public.site_visits(page_path);
CREATE INDEX idx_site_visits_visitor_id ON public.site_visits(visitor_id);
CREATE INDEX idx_site_visits_session_id ON public.site_visits(session_id);
CREATE INDEX idx_site_visits_device_type ON public.site_visits(device_type);

-- =====================================================
-- 3. جدول إحصائيات يومية (للأداء)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.site_visits_daily_stats (
    id SERIAL PRIMARY KEY,
    visit_date DATE NOT NULL,
    page_path TEXT NOT NULL,
    
    -- الإحصائيات
    total_visits INTEGER NOT NULL DEFAULT 0,
    unique_visitors INTEGER NOT NULL DEFAULT 0,
    desktop_visits INTEGER NOT NULL DEFAULT 0,
    mobile_visits INTEGER NOT NULL DEFAULT 0,
    tablet_visits INTEGER NOT NULL DEFAULT 0,
    avg_duration INTEGER, -- متوسط مدة الزيارة بالثواني
    bounce_rate DECIMAL(5,2), -- نسبة الارتداد
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(visit_date, page_path)
);

-- فهارس للإحصائيات اليومية
CREATE INDEX idx_daily_stats_date ON public.site_visits_daily_stats(visit_date DESC);
CREATE INDEX idx_daily_stats_page_path ON public.site_visits_daily_stats(page_path);

-- =====================================================
-- 4. دالة لتحديث الإحصائيات اليومية
-- =====================================================
CREATE OR REPLACE FUNCTION update_daily_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.site_visits_daily_stats (
        visit_date,
        page_path,
        total_visits,
        unique_visitors,
        desktop_visits,
        mobile_visits,
        tablet_visits
    )
    VALUES (
        (NEW.visited_at::date),
        NEW.page_path,
        1,
        1,
        CASE WHEN NEW.device_type = 'desktop' THEN 1 ELSE 0 END,
        CASE WHEN NEW.device_type = 'mobile' THEN 1 ELSE 0 END,
        CASE WHEN NEW.device_type = 'tablet' THEN 1 ELSE 0 END
    )
    ON CONFLICT (visit_date, page_path)
    DO UPDATE SET
        total_visits = site_visits_daily_stats.total_visits + 1,
        desktop_visits = site_visits_daily_stats.desktop_visits + 
            CASE WHEN NEW.device_type = 'desktop' THEN 1 ELSE 0 END,
        mobile_visits = site_visits_daily_stats.mobile_visits + 
            CASE WHEN NEW.device_type = 'mobile' THEN 1 ELSE 0 END,
        tablet_visits = site_visits_daily_stats.tablet_visits + 
            CASE WHEN NEW.device_type = 'tablet' THEN 1 ELSE 0 END,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. المشغل لتحديث الإحصائيات تلقائياً
-- =====================================================
CREATE TRIGGER trigger_update_daily_stats
    AFTER INSERT ON public.site_visits
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_stats();

-- =====================================================
-- 6. دالة لحساب الإحصائيات العامة
-- =====================================================
CREATE OR REPLACE FUNCTION get_visit_stats(
    start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    total_visits BIGINT,
    unique_visitors BIGINT,
    avg_duration NUMERIC,
    bounce_rate NUMERIC,
    desktop_percentage NUMERIC,
    mobile_percentage NUMERIC,
    tablet_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_visits,
        COUNT(DISTINCT visitor_id)::BIGINT as unique_visitors,
        ROUND(AVG(visit_duration)::NUMERIC, 2) as avg_duration,
        ROUND((COUNT(*) FILTER (WHERE is_bounce = true)::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2) as bounce_rate,
        ROUND((COUNT(*) FILTER (WHERE device_type = 'desktop')::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2) as desktop_percentage,
        ROUND((COUNT(*) FILTER (WHERE device_type = 'mobile')::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2) as mobile_percentage,
        ROUND((COUNT(*) FILTER (WHERE device_type = 'tablet')::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2) as tablet_percentage
    FROM public.site_visits
    WHERE visited_at BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. دالة للحصول على أكثر الصفحات زيارة
-- =====================================================
CREATE OR REPLACE FUNCTION get_top_pages(
    days_back INTEGER DEFAULT 30,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    page_path TEXT,
    page_title TEXT,
    visit_count BIGINT,
    unique_visitors BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sv.page_path,
        MAX(sv.page_title) as page_title,
        COUNT(*)::BIGINT as visit_count,
        COUNT(DISTINCT sv.visitor_id)::BIGINT as unique_visitors
    FROM public.site_visits sv
    WHERE sv.visited_at >= NOW() - (days_back || ' days')::INTERVAL
    GROUP BY sv.page_path
    ORDER BY visit_count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. دالة للحصول على الزيارات حسب اليوم
-- =====================================================
CREATE OR REPLACE FUNCTION get_visits_by_day(
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    visit_date DATE,
    total_visits BIGINT,
    unique_visitors BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (sv.visited_at::date) as visit_date,
        COUNT(*)::BIGINT as total_visits,
        COUNT(DISTINCT sv.visitor_id)::BIGINT as unique_visitors
    FROM public.site_visits sv
    WHERE sv.visited_at >= NOW() - (days_back || ' days')::INTERVAL
    GROUP BY (sv.visited_at::date)
    ORDER BY visit_date DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. تعليقات على الجداول
-- =====================================================
COMMENT ON TABLE public.site_visits IS 'جدول تخزين بيانات زيارات الموقع';
COMMENT ON TABLE public.site_visits_daily_stats IS 'إحصائيات يومية مجمعة لتحسين الأداء';
COMMENT ON COLUMN public.site_visits.visitor_id IS 'معرف مجهول للزائر من localStorage';
COMMENT ON COLUMN public.site_visits.session_id IS 'معرف جلسة التصفح';
COMMENT ON COLUMN public.site_visits.is_bounce IS 'هل غادر الزائر مباشرة دون تفاعل';
