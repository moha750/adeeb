-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260504015700   الاسم: site_visits_revoke_public_grants

-- إصلاح أمني: REVOKE EXECUTE من PUBLIC (الافتراضي في PostgreSQL يمنح PUBLIC)
-- ثم GRANT صريح فقط للـ authenticated مع تطبيق current_user_is_admin() داخل الدالة

-- Trigger functions: لا يجب أن تُستدعى مباشرة عبر RPC من أي role
REVOKE EXECUTE ON FUNCTION trg_pv_upsert_visitor()  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION trg_pv_set_entry()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION trg_pv_compute_bounce()  FROM PUBLIC, anon, authenticated;

-- Maintenance functions: فقط لـ pg_cron (يعمل كـ postgres role)
REVOKE EXECUTE ON FUNCTION aggregate_yesterday_into_summary() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION cleanup_pageviews_older_than(integer) FROM PUBLIC, anon, authenticated;

-- Stats RPCs: نسحب من PUBLIC و anon ثم نمنح للـ authenticated فقط
-- (الدوال نفسها تتحقق من current_user_is_admin() داخلياً)
REVOKE EXECUTE ON FUNCTION get_visit_stats(timestamptz, timestamptz)      FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION get_top_pages(integer, integer)                FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION get_visits_by_day(integer)                     FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION get_device_stats(integer)                      FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION get_browser_stats(integer)                     FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION get_today_visits_stats()                       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION get_week_visits_stats()                        FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION get_month_visits_stats()                       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION get_countries_stats(integer, integer)          FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION get_cities_stats(integer, integer)             FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION get_new_vs_returning(integer)                  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION get_top_referrers(integer, integer)            FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION get_visits_heatmap(integer)                    FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION get_exit_pages(integer, integer)               FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION export_visits_for_admin(timestamptz, timestamptz) FROM PUBLIC, anon;
