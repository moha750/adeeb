-- =====================================================
-- دوال مساعدة إضافية لإحصائيات الزيارات
-- =====================================================
-- تاريخ الإنشاء: 2026-01-22
-- الوصف: دوال إضافية لحل مشكلة RLS في الاستعلامات المباشرة
-- =====================================================

-- =====================================================
-- 1. دالة للحصول على إحصائيات اليوم
-- =====================================================
CREATE OR REPLACE FUNCTION get_today_visits_stats()
RETURNS TABLE (
    total_visits BIGINT,
    unique_visitors BIGINT
) AS $$
DECLARE
    today_start TIMESTAMPTZ;
BEGIN
    today_start := date_trunc('day', NOW());
    
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_visits,
        COUNT(DISTINCT visitor_id)::BIGINT as unique_visitors
    FROM public.site_visits
    WHERE visited_at >= today_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. دالة للحصول على إحصائيات الأسبوع
-- =====================================================
CREATE OR REPLACE FUNCTION get_week_visits_stats()
RETURNS TABLE (
    total_visits BIGINT,
    unique_visitors BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_visits,
        COUNT(DISTINCT visitor_id)::BIGINT as unique_visitors
    FROM public.site_visits
    WHERE visited_at >= NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. دالة للحصول على إحصائيات الشهر
-- =====================================================
CREATE OR REPLACE FUNCTION get_month_visits_stats()
RETURNS TABLE (
    total_visits BIGINT,
    unique_visitors BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_visits,
        COUNT(DISTINCT visitor_id)::BIGINT as unique_visitors
    FROM public.site_visits
    WHERE visited_at >= NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. دالة للحصول على إحصائيات الأجهزة
-- =====================================================
CREATE OR REPLACE FUNCTION get_device_stats(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
    device_type TEXT,
    visit_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(sv.device_type, 'unknown') as device_type,
        COUNT(*)::BIGINT as visit_count
    FROM public.site_visits sv
    WHERE sv.visited_at >= NOW() - (days_back || ' days')::INTERVAL
    GROUP BY sv.device_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. دالة للحصول على إحصائيات المتصفحات
-- =====================================================
CREATE OR REPLACE FUNCTION get_browser_stats(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
    browser_name TEXT,
    visit_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(sv.browser_name, 'Unknown') as browser_name,
        COUNT(*)::BIGINT as visit_count
    FROM public.site_visits sv
    WHERE sv.visited_at >= NOW() - (days_back || ' days')::INTERVAL
    GROUP BY sv.browser_name
    ORDER BY visit_count DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. منح صلاحيات تنفيذ الدوال
-- =====================================================
GRANT EXECUTE ON FUNCTION get_today_visits_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_week_visits_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_month_visits_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_device_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_browser_stats TO authenticated;

-- =====================================================
-- 7. تعليقات على الدوال
-- =====================================================
COMMENT ON FUNCTION get_today_visits_stats IS 'الحصول على إحصائيات زيارات اليوم الحالي';
COMMENT ON FUNCTION get_week_visits_stats IS 'الحصول على إحصائيات زيارات آخر 7 أيام';
COMMENT ON FUNCTION get_month_visits_stats IS 'الحصول على إحصائيات زيارات آخر 30 يوم';
COMMENT ON FUNCTION get_device_stats IS 'الحصول على توزيع الزيارات حسب نوع الجهاز';
COMMENT ON FUNCTION get_browser_stats IS 'الحصول على توزيع الزيارات حسب المتصفح';
