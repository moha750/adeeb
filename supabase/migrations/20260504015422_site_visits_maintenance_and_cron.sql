-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260504015422   الاسم: site_visits_maintenance_and_cron

-- GRANT EXECUTE
GRANT EXECUTE ON FUNCTION get_visit_stats(TIMESTAMPTZ, TIMESTAMPTZ)         TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_pages(INTEGER, INTEGER)                   TO authenticated;
GRANT EXECUTE ON FUNCTION get_visits_by_day(INTEGER)                        TO authenticated;
GRANT EXECUTE ON FUNCTION get_device_stats(INTEGER)                         TO authenticated;
GRANT EXECUTE ON FUNCTION get_browser_stats(INTEGER)                        TO authenticated;
GRANT EXECUTE ON FUNCTION get_today_visits_stats()                          TO authenticated;
GRANT EXECUTE ON FUNCTION get_week_visits_stats()                           TO authenticated;
GRANT EXECUTE ON FUNCTION get_month_visits_stats()                          TO authenticated;
GRANT EXECUTE ON FUNCTION get_countries_stats(INTEGER, INTEGER)             TO authenticated;
GRANT EXECUTE ON FUNCTION get_cities_stats(INTEGER, INTEGER)                TO authenticated;
GRANT EXECUTE ON FUNCTION get_new_vs_returning(INTEGER)                     TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_referrers(INTEGER, INTEGER)               TO authenticated;
GRANT EXECUTE ON FUNCTION get_visits_heatmap(INTEGER)                       TO authenticated;
GRANT EXECUTE ON FUNCTION get_exit_pages(INTEGER, INTEGER)                  TO authenticated;
GRANT EXECUTE ON FUNCTION export_visits_for_admin(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- Maintenance: aggregate yesterday
CREATE OR REPLACE FUNCTION aggregate_yesterday_into_summary()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_date DATE := (CURRENT_DATE - INTERVAL '1 day')::date;
BEGIN
    INSERT INTO site_visits_daily_summary (
        summary_date, total_pageviews, unique_visitors, unique_sessions,
        bot_pageviews, member_pageviews,
        avg_duration_seconds, bounce_rate,
        top_pages, device_breakdown, country_breakdown,
        browser_breakdown, referrer_breakdown, hourly_distribution
    )
    SELECT
        v_date,
        COUNT(*) FILTER (WHERE NOT is_bot AND NOT is_admin_page),
        COUNT(DISTINCT visitor_id) FILTER (WHERE NOT is_bot AND NOT is_admin_page),
        COUNT(DISTINCT session_id) FILTER (WHERE NOT is_bot AND NOT is_admin_page),
        COUNT(*) FILTER (WHERE is_bot),
        COUNT(*) FILTER (WHERE user_id IS NOT NULL AND NOT is_bot AND NOT is_admin_page),
        COALESCE(ROUND(AVG(NULLIF(total_seconds, 0)) FILTER (WHERE NOT is_bot AND NOT is_admin_page)::numeric, 2), 0),
        COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE is_bounce AND NOT is_bot AND NOT is_admin_page)
                       / NULLIF(COUNT(*) FILTER (WHERE NOT is_bot AND NOT is_admin_page), 0)::numeric, 2), 0),
        COALESCE((SELECT jsonb_agg(jsonb_build_object('path', page_path, 'count', cnt))
                  FROM (SELECT page_path, COUNT(*) AS cnt FROM site_pageviews
                        WHERE visited_at::date = v_date AND NOT is_bot AND NOT is_admin_page
                        GROUP BY page_path ORDER BY cnt DESC LIMIT 20) t), '[]'::jsonb),
        COALESCE((SELECT jsonb_object_agg(COALESCE(device_type, 'unknown'), cnt)
                  FROM (SELECT device_type, COUNT(*) AS cnt FROM site_pageviews
                        WHERE visited_at::date = v_date AND NOT is_bot AND NOT is_admin_page
                        GROUP BY device_type) t), '{}'::jsonb),
        COALESCE((SELECT jsonb_object_agg(country_code, cnt)
                  FROM (SELECT country_code, COUNT(*) AS cnt FROM site_pageviews
                        WHERE visited_at::date = v_date AND NOT is_bot AND NOT is_admin_page AND country_code IS NOT NULL
                        GROUP BY country_code) t), '{}'::jsonb),
        COALESCE((SELECT jsonb_object_agg(COALESCE(browser_name, 'Unknown'), cnt)
                  FROM (SELECT browser_name, COUNT(*) AS cnt FROM site_pageviews
                        WHERE visited_at::date = v_date AND NOT is_bot AND NOT is_admin_page
                        GROUP BY browser_name) t), '{}'::jsonb),
        COALESCE((SELECT jsonb_object_agg(referrer_host, cnt)
                  FROM (SELECT referrer_host, COUNT(*) AS cnt FROM site_pageviews
                        WHERE visited_at::date = v_date AND NOT is_bot AND NOT is_admin_page AND referrer_host IS NOT NULL
                        GROUP BY referrer_host ORDER BY cnt DESC LIMIT 20) t), '{}'::jsonb),
        COALESCE((SELECT jsonb_object_agg(hour::TEXT, cnt)
                  FROM (SELECT EXTRACT(HOUR FROM visited_at)::INTEGER AS hour, COUNT(*) AS cnt
                        FROM site_pageviews WHERE visited_at::date = v_date AND NOT is_bot AND NOT is_admin_page
                        GROUP BY 1) t), '{}'::jsonb)
    FROM site_pageviews WHERE visited_at::date = v_date
    ON CONFLICT (summary_date) DO UPDATE
    SET total_pageviews = EXCLUDED.total_pageviews,
        unique_visitors = EXCLUDED.unique_visitors,
        unique_sessions = EXCLUDED.unique_sessions,
        bot_pageviews = EXCLUDED.bot_pageviews,
        member_pageviews = EXCLUDED.member_pageviews,
        avg_duration_seconds = EXCLUDED.avg_duration_seconds,
        bounce_rate = EXCLUDED.bounce_rate,
        top_pages = EXCLUDED.top_pages,
        device_breakdown = EXCLUDED.device_breakdown,
        country_breakdown = EXCLUDED.country_breakdown,
        browser_breakdown = EXCLUDED.browser_breakdown,
        referrer_breakdown = EXCLUDED.referrer_breakdown,
        hourly_distribution = EXCLUDED.hourly_distribution;
END;
$$;

REVOKE EXECUTE ON FUNCTION aggregate_yesterday_into_summary() FROM PUBLIC;

-- cleanup_pageviews_older_than
CREATE OR REPLACE FUNCTION cleanup_pageviews_older_than(p_days INTEGER DEFAULT 180)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE v_deleted BIGINT;
BEGIN
    PERFORM aggregate_yesterday_into_summary();
    DELETE FROM site_pageviews
    WHERE visited_at < (now() - (p_days || ' days')::interval);
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$;

REVOKE EXECUTE ON FUNCTION cleanup_pageviews_older_than(INTEGER) FROM PUBLIC;

-- pg_cron schedules
DO $$
BEGIN
    PERFORM cron.unschedule('site-visits-daily-aggregate');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    PERFORM cron.unschedule('site-visits-monthly-cleanup');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
    'site-visits-daily-aggregate', '0 3 * * *',
    $cron$SELECT public.aggregate_yesterday_into_summary();$cron$
);

SELECT cron.schedule(
    'site-visits-monthly-cleanup', '0 4 1 * *',
    $cron$SELECT public.cleanup_pageviews_older_than(180);$cron$
);
