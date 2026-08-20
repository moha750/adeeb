-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260504015304   الاسم: site_visits_rpcs_part1

-- 7.1 get_visit_stats
CREATE OR REPLACE FUNCTION get_visit_stats(
    start_date TIMESTAMPTZ,
    end_date   TIMESTAMPTZ
)
RETURNS TABLE (
    total_visits      BIGINT,
    unique_visitors   BIGINT,
    unique_sessions   BIGINT,
    avg_duration      NUMERIC,
    bounce_rate       NUMERIC,
    member_visits     BIGINT,
    pages_per_session NUMERIC
)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
    SELECT
        COUNT(*)::BIGINT,
        COUNT(DISTINCT visitor_id)::BIGINT,
        COUNT(DISTINCT session_id)::BIGINT,
        ROUND(AVG(NULLIF(total_seconds, 0))::numeric, 1),
        ROUND(100.0 * COUNT(*) FILTER (WHERE is_bounce = true) / NULLIF(COUNT(*), 0)::numeric, 1),
        COUNT(*) FILTER (WHERE user_id IS NOT NULL)::BIGINT,
        ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT session_id), 0)::numeric, 2)
    FROM site_pageviews
    WHERE visited_at >= start_date AND visited_at < end_date
      AND is_bot = false AND is_admin_page = false AND current_user_is_admin();
$$;

-- 7.2 get_top_pages
CREATE OR REPLACE FUNCTION get_top_pages(
    days_back INTEGER DEFAULT 30,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    page_path TEXT, page_title TEXT, visit_count BIGINT,
    unique_visitors BIGINT, avg_duration NUMERIC
)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
    WITH titles AS (
        SELECT DISTINCT ON (page_path) page_path, page_title
        FROM site_pageviews
        WHERE visited_at >= now() - (days_back || ' days')::interval
          AND is_bot = false AND is_admin_page = false AND page_title IS NOT NULL
        ORDER BY page_path, visited_at DESC
    )
    SELECT pv.page_path,
           COALESCE(t.page_title, pv.page_path),
           COUNT(*)::BIGINT,
           COUNT(DISTINCT pv.visitor_id)::BIGINT,
           ROUND(AVG(NULLIF(pv.total_seconds, 0))::numeric, 1)
    FROM site_pageviews pv
    LEFT JOIN titles t ON t.page_path = pv.page_path
    WHERE pv.visited_at >= now() - (days_back || ' days')::interval
      AND pv.is_bot = false AND pv.is_admin_page = false AND current_user_is_admin()
    GROUP BY pv.page_path, t.page_title
    ORDER BY COUNT(*) DESC
    LIMIT limit_count;
$$;

-- 7.3 get_visits_by_day
CREATE OR REPLACE FUNCTION get_visits_by_day(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
    visit_date DATE, total_visits BIGINT, unique_visitors BIGINT,
    sessions BIGINT, avg_duration NUMERIC
)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
    WITH series AS (
        SELECT generate_series((now() - (days_back || ' days')::interval)::date,
                               now()::date, '1 day')::date AS d
    ),
    agg AS (
        SELECT visited_at::date AS d,
               COUNT(*) AS total_visits,
               COUNT(DISTINCT visitor_id) AS unique_visitors,
               COUNT(DISTINCT session_id) AS sessions,
               ROUND(AVG(NULLIF(total_seconds, 0))::numeric, 1) AS avg_duration
        FROM site_pageviews
        WHERE visited_at >= now() - (days_back || ' days')::interval
          AND is_bot = false AND is_admin_page = false AND current_user_is_admin()
        GROUP BY 1
    )
    SELECT s.d, COALESCE(a.total_visits, 0)::BIGINT,
           COALESCE(a.unique_visitors, 0)::BIGINT,
           COALESCE(a.sessions, 0)::BIGINT,
           COALESCE(a.avg_duration, 0)::NUMERIC
    FROM series s LEFT JOIN agg a ON a.d = s.d
    ORDER BY s.d DESC;
$$;

-- 7.4 get_device_stats
CREATE OR REPLACE FUNCTION get_device_stats(days_back INTEGER DEFAULT 30)
RETURNS TABLE (device_type TEXT, visit_count BIGINT, unique_visitors BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
    SELECT COALESCE(device_type, 'unknown'),
           COUNT(*)::BIGINT,
           COUNT(DISTINCT visitor_id)::BIGINT
    FROM site_pageviews
    WHERE visited_at >= now() - (days_back || ' days')::interval
      AND is_bot = false AND is_admin_page = false AND current_user_is_admin()
    GROUP BY 1
    ORDER BY 2 DESC;
$$;

-- 7.5 get_browser_stats
CREATE OR REPLACE FUNCTION get_browser_stats(days_back INTEGER DEFAULT 30)
RETURNS TABLE (browser_name TEXT, visit_count BIGINT, percentage NUMERIC)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
    WITH base AS (
        SELECT COALESCE(browser_name, 'Unknown') AS browser_name
        FROM site_pageviews
        WHERE visited_at >= now() - (days_back || ' days')::interval
          AND is_bot = false AND is_admin_page = false AND current_user_is_admin()
    )
    SELECT browser_name, COUNT(*)::BIGINT,
           ROUND(100.0 * COUNT(*) / NULLIF((SELECT COUNT(*) FROM base), 0)::numeric, 1)
    FROM base GROUP BY browser_name ORDER BY COUNT(*) DESC;
$$;

-- 7.6/7.7/7.8 wrappers
CREATE OR REPLACE FUNCTION get_today_visits_stats()
RETURNS TABLE (total_visits BIGINT, unique_visitors BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
    SELECT COUNT(*)::BIGINT, COUNT(DISTINCT visitor_id)::BIGINT
    FROM site_pageviews
    WHERE visited_at::date = CURRENT_DATE
      AND is_bot = false AND is_admin_page = false AND current_user_is_admin();
$$;

CREATE OR REPLACE FUNCTION get_week_visits_stats()
RETURNS TABLE (total_visits BIGINT, unique_visitors BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
    SELECT COUNT(*)::BIGINT, COUNT(DISTINCT visitor_id)::BIGINT
    FROM site_pageviews
    WHERE visited_at >= now() - interval '7 days'
      AND is_bot = false AND is_admin_page = false AND current_user_is_admin();
$$;

CREATE OR REPLACE FUNCTION get_month_visits_stats()
RETURNS TABLE (total_visits BIGINT, unique_visitors BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
    SELECT COUNT(*)::BIGINT, COUNT(DISTINCT visitor_id)::BIGINT
    FROM site_pageviews
    WHERE visited_at >= now() - interval '30 days'
      AND is_bot = false AND is_admin_page = false AND current_user_is_admin();
$$;
