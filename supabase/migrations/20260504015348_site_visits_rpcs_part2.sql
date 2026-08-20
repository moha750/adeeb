-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260504015348   الاسم: site_visits_rpcs_part2

-- 7.9 get_countries_stats
CREATE OR REPLACE FUNCTION get_countries_stats(
    days_back INTEGER DEFAULT 30,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (country_code TEXT, country_name TEXT, visit_count BIGINT, unique_visitors BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
    SELECT pv.country_code,
           COALESCE(c.name_ar, pv.country_code),
           COUNT(*)::BIGINT,
           COUNT(DISTINCT pv.visitor_id)::BIGINT
    FROM site_pageviews pv
    LEFT JOIN iso_countries c ON c.code = pv.country_code
    WHERE pv.visited_at >= now() - (days_back || ' days')::interval
      AND pv.country_code IS NOT NULL
      AND pv.is_bot = false AND pv.is_admin_page = false AND current_user_is_admin()
    GROUP BY pv.country_code, c.name_ar
    ORDER BY COUNT(*) DESC
    LIMIT limit_count;
$$;

-- 7.10 get_cities_stats
CREATE OR REPLACE FUNCTION get_cities_stats(
    days_back INTEGER DEFAULT 30,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (city TEXT, country_code TEXT, country_name TEXT, visit_count BIGINT, unique_visitors BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
    SELECT pv.city, pv.country_code,
           COALESCE(c.name_ar, pv.country_code),
           COUNT(*)::BIGINT,
           COUNT(DISTINCT pv.visitor_id)::BIGINT
    FROM site_pageviews pv
    LEFT JOIN iso_countries c ON c.code = pv.country_code
    WHERE pv.visited_at >= now() - (days_back || ' days')::interval
      AND pv.city IS NOT NULL
      AND pv.is_bot = false AND pv.is_admin_page = false AND current_user_is_admin()
    GROUP BY pv.city, pv.country_code, c.name_ar
    ORDER BY COUNT(*) DESC
    LIMIT limit_count;
$$;

-- 7.11 get_new_vs_returning
CREATE OR REPLACE FUNCTION get_new_vs_returning(days_back INTEGER DEFAULT 30)
RETURNS TABLE (visit_date DATE, new_visitors BIGINT, returning_visitors BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
    WITH series AS (
        SELECT generate_series((now() - (days_back || ' days')::interval)::date,
                               now()::date, '1 day')::date AS d
    ),
    daily_visitors AS (
        SELECT DISTINCT visited_at::date AS d, visitor_id
        FROM site_pageviews
        WHERE visited_at >= now() - (days_back || ' days')::interval
          AND is_bot = false AND is_admin_page = false AND current_user_is_admin()
    ),
    classified AS (
        SELECT dv.d,
               CASE WHEN sv.first_seen_at::date = dv.d THEN 'new' ELSE 'returning' END AS kind
        FROM daily_visitors dv
        JOIN site_visitors sv ON sv.id = dv.visitor_id
    )
    SELECT s.d,
           COALESCE(SUM(CASE WHEN c.kind = 'new'       THEN 1 ELSE 0 END), 0)::BIGINT,
           COALESCE(SUM(CASE WHEN c.kind = 'returning' THEN 1 ELSE 0 END), 0)::BIGINT
    FROM series s LEFT JOIN classified c ON c.d = s.d
    GROUP BY s.d ORDER BY s.d DESC;
$$;

-- 7.12 get_top_referrers
CREATE OR REPLACE FUNCTION get_top_referrers(
    days_back INTEGER DEFAULT 30,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (referrer_host TEXT, visit_count BIGINT, unique_visitors BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
    SELECT referrer_host,
           COUNT(*)::BIGINT,
           COUNT(DISTINCT visitor_id)::BIGINT
    FROM site_pageviews
    WHERE visited_at >= now() - (days_back || ' days')::interval
      AND referrer_host IS NOT NULL
      AND is_bot = false AND is_admin_page = false AND current_user_is_admin()
    GROUP BY referrer_host ORDER BY COUNT(*) DESC LIMIT limit_count;
$$;

-- 7.13 get_visits_heatmap
CREATE OR REPLACE FUNCTION get_visits_heatmap(days_back INTEGER DEFAULT 30)
RETURNS TABLE (day_of_week INTEGER, hour_of_day INTEGER, visit_count BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
    SELECT EXTRACT(DOW  FROM visited_at)::INTEGER,
           EXTRACT(HOUR FROM visited_at)::INTEGER,
           COUNT(*)::BIGINT
    FROM site_pageviews
    WHERE visited_at >= now() - (days_back || ' days')::interval
      AND is_bot = false AND is_admin_page = false AND current_user_is_admin()
    GROUP BY 1, 2 ORDER BY 1, 2;
$$;

-- 7.14 get_exit_pages
CREATE OR REPLACE FUNCTION get_exit_pages(
    days_back INTEGER DEFAULT 30,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (page_path TEXT, page_title TEXT, exit_count BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
    WITH last_in_session AS (
        SELECT DISTINCT ON (session_id) page_path, page_title
        FROM site_pageviews
        WHERE visited_at >= now() - (days_back || ' days')::interval
          AND is_bot = false AND is_admin_page = false AND current_user_is_admin()
        ORDER BY session_id, visited_at DESC
    )
    SELECT page_path, MAX(page_title), COUNT(*)::BIGINT
    FROM last_in_session GROUP BY page_path
    ORDER BY COUNT(*) DESC LIMIT limit_count;
$$;

-- 7.15 export_visits_for_admin
CREATE OR REPLACE FUNCTION export_visits_for_admin(
    start_date TIMESTAMPTZ,
    end_date   TIMESTAMPTZ
)
RETURNS TABLE (
    visited_at TIMESTAMPTZ, page_path TEXT, page_title TEXT,
    country_code TEXT, country_name TEXT, city TEXT,
    device_type TEXT, browser_name TEXT, os_name TEXT,
    referrer_host TEXT, total_seconds INTEGER, is_bounce BOOLEAN
)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
    SELECT pv.visited_at, pv.page_path, pv.page_title,
           pv.country_code, COALESCE(c.name_ar, pv.country_code), pv.city,
           pv.device_type, pv.browser_name, pv.os_name,
           pv.referrer_host, pv.total_seconds, pv.is_bounce
    FROM site_pageviews pv
    LEFT JOIN iso_countries c ON c.code = pv.country_code
    WHERE pv.visited_at >= start_date AND pv.visited_at < end_date
      AND pv.is_bot = false AND pv.is_admin_page = false AND current_user_is_admin()
    ORDER BY pv.visited_at DESC;
$$;
