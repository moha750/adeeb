-- =============================================
-- إعادة بناء نظام احتساب الزيارات
-- =============================================
-- يبني من الصفر:
--   1) الجداول: site_pageviews, site_visitors, site_visits_daily_summary
--   2) lookup: iso_countries
--   3) RLS: anon مرفوض كلياً، الإدراج عبر Edge Function (service_role)
--   4) Triggers: تحديث site_visitors، تحديد entry_pageview، حساب is_bounce
--   5) RPCs: 13 دالة لجميع الإحصائيات
--   6) pg_cron: تجميع يومي + تنظيف بعد 180 يوم

-- =========================================================
-- 0) إسقاط الإصدارات القديمة (آمن لو لم تكن موجودة)
-- =========================================================
-- RPCs قديمة بـ return types مختلفة — يجب DROP لأن CREATE OR REPLACE لا يغيّر return type
DROP FUNCTION IF EXISTS get_visit_stats(timestamptz, timestamptz)        CASCADE;
DROP FUNCTION IF EXISTS get_top_pages(integer, integer)                  CASCADE;
DROP FUNCTION IF EXISTS get_visits_by_day(integer)                       CASCADE;
DROP FUNCTION IF EXISTS get_device_stats(integer)                        CASCADE;
DROP FUNCTION IF EXISTS get_browser_stats(integer)                       CASCADE;
DROP FUNCTION IF EXISTS get_today_visits_stats()                         CASCADE;
DROP FUNCTION IF EXISTS get_week_visits_stats()                          CASCADE;
DROP FUNCTION IF EXISTS get_month_visits_stats()                         CASCADE;

-- جداول قديمة (المستخدم وافق على إعادة بناء كاملة)
DROP TABLE IF EXISTS site_visits_daily_stats CASCADE;
DROP TABLE IF EXISTS site_visits             CASCADE;

-- =========================================================
-- 1) Lookup: iso_countries
-- =========================================================
CREATE TABLE IF NOT EXISTS iso_countries (
    code     TEXT PRIMARY KEY CHECK (length(code) = 2),
    name_ar  TEXT NOT NULL,
    name_en  TEXT NOT NULL
);

ALTER TABLE iso_countries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS iso_countries_select_all ON iso_countries;
CREATE POLICY iso_countries_select_all ON iso_countries
    FOR SELECT USING (true);

-- بذر الدول الأكثر شيوعاً (الجزيرة العربية + العالم العربي + الدول الكبرى)
INSERT INTO iso_countries (code, name_ar, name_en) VALUES
    ('SA', 'المملكة العربية السعودية', 'Saudi Arabia'),
    ('AE', 'الإمارات العربية المتحدة', 'United Arab Emirates'),
    ('KW', 'الكويت', 'Kuwait'),
    ('QA', 'قطر', 'Qatar'),
    ('BH', 'البحرين', 'Bahrain'),
    ('OM', 'سلطنة عُمان', 'Oman'),
    ('YE', 'اليمن', 'Yemen'),
    ('IQ', 'العراق', 'Iraq'),
    ('SY', 'سوريا', 'Syria'),
    ('JO', 'الأردن', 'Jordan'),
    ('LB', 'لبنان', 'Lebanon'),
    ('PS', 'فلسطين', 'Palestine'),
    ('EG', 'مصر', 'Egypt'),
    ('SD', 'السودان', 'Sudan'),
    ('LY', 'ليبيا', 'Libya'),
    ('TN', 'تونس', 'Tunisia'),
    ('DZ', 'الجزائر', 'Algeria'),
    ('MA', 'المغرب', 'Morocco'),
    ('MR', 'موريتانيا', 'Mauritania'),
    ('DJ', 'جيبوتي', 'Djibouti'),
    ('SO', 'الصومال', 'Somalia'),
    ('KM', 'جزر القمر', 'Comoros'),
    ('TR', 'تركيا', 'Turkey'),
    ('IR', 'إيران', 'Iran'),
    ('PK', 'باكستان', 'Pakistan'),
    ('AF', 'أفغانستان', 'Afghanistan'),
    ('IN', 'الهند', 'India'),
    ('BD', 'بنغلاديش', 'Bangladesh'),
    ('ID', 'إندونيسيا', 'Indonesia'),
    ('MY', 'ماليزيا', 'Malaysia'),
    ('SG', 'سنغافورة', 'Singapore'),
    ('TH', 'تايلاند', 'Thailand'),
    ('PH', 'الفلبين', 'Philippines'),
    ('VN', 'فيتنام', 'Vietnam'),
    ('CN', 'الصين', 'China'),
    ('JP', 'اليابان', 'Japan'),
    ('KR', 'كوريا الجنوبية', 'South Korea'),
    ('US', 'الولايات المتحدة', 'United States'),
    ('CA', 'كندا', 'Canada'),
    ('MX', 'المكسيك', 'Mexico'),
    ('BR', 'البرازيل', 'Brazil'),
    ('AR', 'الأرجنتين', 'Argentina'),
    ('CL', 'تشيلي', 'Chile'),
    ('GB', 'المملكة المتحدة', 'United Kingdom'),
    ('IE', 'أيرلندا', 'Ireland'),
    ('FR', 'فرنسا', 'France'),
    ('DE', 'ألمانيا', 'Germany'),
    ('ES', 'إسبانيا', 'Spain'),
    ('PT', 'البرتغال', 'Portugal'),
    ('IT', 'إيطاليا', 'Italy'),
    ('NL', 'هولندا', 'Netherlands'),
    ('BE', 'بلجيكا', 'Belgium'),
    ('CH', 'سويسرا', 'Switzerland'),
    ('AT', 'النمسا', 'Austria'),
    ('SE', 'السويد', 'Sweden'),
    ('NO', 'النرويج', 'Norway'),
    ('DK', 'الدنمارك', 'Denmark'),
    ('FI', 'فنلندا', 'Finland'),
    ('PL', 'بولندا', 'Poland'),
    ('CZ', 'تشيكيا', 'Czechia'),
    ('GR', 'اليونان', 'Greece'),
    ('HU', 'المجر', 'Hungary'),
    ('RO', 'رومانيا', 'Romania'),
    ('BG', 'بلغاريا', 'Bulgaria'),
    ('UA', 'أوكرانيا', 'Ukraine'),
    ('RU', 'روسيا', 'Russia'),
    ('BY', 'بيلاروسيا', 'Belarus'),
    ('KZ', 'كازاخستان', 'Kazakhstan'),
    ('UZ', 'أوزبكستان', 'Uzbekistan'),
    ('AZ', 'أذربيجان', 'Azerbaijan'),
    ('AM', 'أرمينيا', 'Armenia'),
    ('GE', 'جورجيا', 'Georgia'),
    ('IL', 'إسرائيل', 'Israel'),
    ('CY', 'قبرص', 'Cyprus'),
    ('AU', 'أستراليا', 'Australia'),
    ('NZ', 'نيوزيلندا', 'New Zealand'),
    ('ZA', 'جنوب أفريقيا', 'South Africa'),
    ('NG', 'نيجيريا', 'Nigeria'),
    ('KE', 'كينيا', 'Kenya'),
    ('ET', 'إثيوبيا', 'Ethiopia'),
    ('GH', 'غانا', 'Ghana'),
    ('SN', 'السنغال', 'Senegal'),
    ('CI', 'ساحل العاج', 'Côte d''Ivoire'),
    ('CM', 'الكاميرون', 'Cameroon'),
    ('TZ', 'تنزانيا', 'Tanzania'),
    ('UG', 'أوغندا', 'Uganda'),
    ('ZW', 'زيمبابوي', 'Zimbabwe'),
    ('AO', 'أنغولا', 'Angola'),
    ('MZ', 'موزمبيق', 'Mozambique'),
    ('MG', 'مدغشقر', 'Madagascar'),
    ('LK', 'سريلانكا', 'Sri Lanka'),
    ('NP', 'نيبال', 'Nepal'),
    ('MM', 'ميانمار', 'Myanmar'),
    ('KH', 'كمبوديا', 'Cambodia'),
    ('LA', 'لاوس', 'Laos'),
    ('TW', 'تايوان', 'Taiwan'),
    ('HK', 'هونغ كونغ', 'Hong Kong'),
    ('MO', 'ماكاو', 'Macao'),
    ('AL', 'ألبانيا', 'Albania'),
    ('BA', 'البوسنة والهرسك', 'Bosnia and Herzegovina'),
    ('HR', 'كرواتيا', 'Croatia'),
    ('RS', 'صربيا', 'Serbia'),
    ('SI', 'سلوفينيا', 'Slovenia'),
    ('SK', 'سلوفاكيا', 'Slovakia'),
    ('MK', 'مقدونيا الشمالية', 'North Macedonia'),
    ('IS', 'آيسلندا', 'Iceland'),
    ('LU', 'لوكسمبورغ', 'Luxembourg'),
    ('MT', 'مالطا', 'Malta'),
    ('LV', 'لاتفيا', 'Latvia'),
    ('LT', 'ليتوانيا', 'Lithuania'),
    ('EE', 'إستونيا', 'Estonia'),
    ('VE', 'فنزويلا', 'Venezuela'),
    ('CO', 'كولومبيا', 'Colombia'),
    ('PE', 'بيرو', 'Peru'),
    ('EC', 'الإكوادور', 'Ecuador'),
    ('UY', 'الأوروغواي', 'Uruguay'),
    ('PY', 'باراغواي', 'Paraguay'),
    ('BO', 'بوليفيا', 'Bolivia'),
    ('CR', 'كوستاريكا', 'Costa Rica'),
    ('PA', 'بنما', 'Panama')
ON CONFLICT (code) DO UPDATE
    SET name_ar = EXCLUDED.name_ar,
        name_en = EXCLUDED.name_en;

-- =========================================================
-- 2) Main: site_pageviews
-- =========================================================
CREATE TABLE IF NOT EXISTS site_pageviews (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id          UUID NOT NULL,
    session_id          UUID NOT NULL,
    user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    page_path           TEXT NOT NULL,
    page_url            TEXT NOT NULL,
    page_title          TEXT,
    referrer            TEXT,
    referrer_host       TEXT GENERATED ALWAYS AS (
        CASE
            WHEN referrer IS NULL OR referrer = '' THEN NULL
            ELSE regexp_replace(referrer, '^https?://([^/]+).*$', '\1')
        END
    ) STORED,
    is_admin_page       BOOLEAN NOT NULL DEFAULT false,

    entry_pageview_id   UUID,

    user_agent          TEXT,
    browser_name        TEXT,
    browser_version     TEXT,
    os_name             TEXT,
    os_version          TEXT,
    device_type         TEXT CHECK (device_type IN ('mobile','tablet','desktop','bot','unknown')),
    device_vendor       TEXT,

    screen_width        SMALLINT,
    screen_height       SMALLINT,
    language            TEXT,

    ip_hash             BYTEA,
    country_code        TEXT CHECK (country_code IS NULL OR length(country_code) = 2),
    city                TEXT,

    is_bot              BOOLEAN NOT NULL DEFAULT false,
    total_seconds       INTEGER NOT NULL DEFAULT 0 CHECK (total_seconds >= 0 AND total_seconds <= 14400),
    last_heartbeat_at   TIMESTAMPTZ,
    is_bounce           BOOLEAN,

    visited_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pv_visited_at        ON site_pageviews (visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_pv_visitor_id        ON site_pageviews (visitor_id);
CREATE INDEX IF NOT EXISTS idx_pv_session_id        ON site_pageviews (session_id);
CREATE INDEX IF NOT EXISTS idx_pv_page_path         ON site_pageviews (page_path);
CREATE INDEX IF NOT EXISTS idx_pv_country           ON site_pageviews (country_code) WHERE country_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pv_user_id           ON site_pageviews (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pv_not_bot           ON site_pageviews (visited_at DESC) WHERE is_bot = false AND is_admin_page = false;
CREATE INDEX IF NOT EXISTS idx_pv_referrer_host     ON site_pageviews (referrer_host) WHERE referrer_host IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pv_visited_brin      ON site_pageviews USING brin (visited_at);

-- =========================================================
-- 3) site_visitors (UPSERT-driven from trigger)
-- =========================================================
CREATE TABLE IF NOT EXISTS site_visitors (
    id                  UUID PRIMARY KEY,
    user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    first_seen_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    total_pageviews     INTEGER NOT NULL DEFAULT 1,
    distinct_sessions   INTEGER NOT NULL DEFAULT 1,
    country_code        TEXT,
    city                TEXT,
    is_member           BOOLEAN GENERATED ALWAYS AS (user_id IS NOT NULL) STORED
);

CREATE INDEX IF NOT EXISTS idx_visitors_first_seen ON site_visitors (first_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_last_seen  ON site_visitors (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_user_id    ON site_visitors (user_id) WHERE user_id IS NOT NULL;

-- =========================================================
-- 4) site_visits_daily_summary (للحفظ بعد cleanup)
-- =========================================================
CREATE TABLE IF NOT EXISTS site_visits_daily_summary (
    summary_date            DATE PRIMARY KEY,
    total_pageviews         INTEGER NOT NULL DEFAULT 0,
    unique_visitors         INTEGER NOT NULL DEFAULT 0,
    unique_sessions         INTEGER NOT NULL DEFAULT 0,
    bot_pageviews           INTEGER NOT NULL DEFAULT 0,
    member_pageviews        INTEGER NOT NULL DEFAULT 0,
    avg_duration_seconds    NUMERIC(10,2) NOT NULL DEFAULT 0,
    bounce_rate             NUMERIC(5,2) NOT NULL DEFAULT 0,
    top_pages               JSONB NOT NULL DEFAULT '[]'::jsonb,
    device_breakdown        JSONB NOT NULL DEFAULT '{}'::jsonb,
    country_breakdown       JSONB NOT NULL DEFAULT '{}'::jsonb,
    browser_breakdown       JSONB NOT NULL DEFAULT '{}'::jsonb,
    referrer_breakdown      JSONB NOT NULL DEFAULT '{}'::jsonb,
    hourly_distribution     JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- =========================================================
-- 5) RLS — anon مرفوض كلياً، Admin SELECT only
-- =========================================================
ALTER TABLE site_pageviews            ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_visitors             ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_visits_daily_summary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pv_admin_select       ON site_pageviews;
DROP POLICY IF EXISTS visitors_admin_select ON site_visitors;
DROP POLICY IF EXISTS summary_admin_select  ON site_visits_daily_summary;

CREATE POLICY pv_admin_select ON site_pageviews
    FOR SELECT TO authenticated
    USING (current_user_is_admin());

CREATE POLICY visitors_admin_select ON site_visitors
    FOR SELECT TO authenticated
    USING (current_user_is_admin());

CREATE POLICY summary_admin_select ON site_visits_daily_summary
    FOR SELECT TO authenticated
    USING (current_user_is_admin());

-- لا policies للـ anon: كل الكتابة عبر service_role في Edge Function
-- service_role يتجاوز RLS تلقائياً

-- =========================================================
-- 6) Triggers
-- =========================================================

-- 6a) UPSERT site_visitors عند INSERT لـ pageview جديد
CREATE OR REPLACE FUNCTION trg_pv_upsert_visitor()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO site_visitors AS v (id, user_id, first_seen_at, last_seen_at,
                                    total_pageviews, distinct_sessions,
                                    country_code, city)
    VALUES (NEW.visitor_id, NEW.user_id, NEW.visited_at, NEW.visited_at,
            1, 1,
            NEW.country_code, NEW.city)
    ON CONFLICT (id) DO UPDATE
        SET last_seen_at      = GREATEST(v.last_seen_at, EXCLUDED.last_seen_at),
            total_pageviews   = v.total_pageviews + 1,
            distinct_sessions = v.distinct_sessions + (
                CASE WHEN NOT EXISTS (
                    SELECT 1 FROM site_pageviews
                    WHERE visitor_id = NEW.visitor_id
                      AND session_id = NEW.session_id
                      AND id <> NEW.id
                ) THEN 1 ELSE 0 END
            ),
            user_id           = COALESCE(v.user_id, EXCLUDED.user_id),
            country_code      = COALESCE(EXCLUDED.country_code, v.country_code),
            city              = COALESCE(EXCLUDED.city, v.city);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_pv_after_insert ON site_pageviews;
CREATE TRIGGER trg_pv_after_insert
    AFTER INSERT ON site_pageviews
    FOR EACH ROW EXECUTE FUNCTION trg_pv_upsert_visitor();

-- 6b) تعيين entry_pageview_id قبل INSERT
CREATE OR REPLACE FUNCTION trg_pv_set_entry()
RETURNS TRIGGER AS $$
DECLARE
    v_entry_id UUID;
BEGIN
    SELECT id INTO v_entry_id
    FROM site_pageviews
    WHERE session_id = NEW.session_id
    ORDER BY visited_at ASC
    LIMIT 1;

    NEW.entry_pageview_id := COALESCE(v_entry_id, NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_pv_before_insert_entry ON site_pageviews;
CREATE TRIGGER trg_pv_before_insert_entry
    BEFORE INSERT ON site_pageviews
    FOR EACH ROW EXECUTE FUNCTION trg_pv_set_entry();

-- 6c) حساب is_bounce على UPDATE (heartbeat/end)
CREATE OR REPLACE FUNCTION trg_pv_compute_bounce()
RETURNS TRIGGER AS $$
DECLARE
    v_session_pv_count INTEGER;
BEGIN
    -- bounce = الجلسة فيها صفحة واحدة فقط، والمدة أقل من 10 ثوانٍ
    SELECT COUNT(*) INTO v_session_pv_count
    FROM site_pageviews
    WHERE session_id = NEW.session_id;

    NEW.is_bounce := (v_session_pv_count = 1 AND NEW.total_seconds < 10);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_pv_before_update_bounce ON site_pageviews;
CREATE TRIGGER trg_pv_before_update_bounce
    BEFORE UPDATE OF total_seconds ON site_pageviews
    FOR EACH ROW
    WHEN (OLD.total_seconds IS DISTINCT FROM NEW.total_seconds)
    EXECUTE FUNCTION trg_pv_compute_bounce();

-- =========================================================
-- 7) RPC functions (كلها admin-only، تستثني bots و admin pages افتراضياً)
-- =========================================================

-- 7.1 get_visit_stats(start, end)
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
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT
        COUNT(*)::BIGINT                                                          AS total_visits,
        COUNT(DISTINCT visitor_id)::BIGINT                                        AS unique_visitors,
        COUNT(DISTINCT session_id)::BIGINT                                        AS unique_sessions,
        ROUND(AVG(NULLIF(total_seconds, 0))::numeric, 1)                          AS avg_duration,
        ROUND(100.0 * COUNT(*) FILTER (WHERE is_bounce = true)
              / NULLIF(COUNT(*), 0)::numeric, 1)                                  AS bounce_rate,
        COUNT(*) FILTER (WHERE user_id IS NOT NULL)::BIGINT                       AS member_visits,
        ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT session_id), 0)::numeric, 2) AS pages_per_session
    FROM site_pageviews
    WHERE visited_at >= start_date
      AND visited_at <  end_date
      AND is_bot = false
      AND is_admin_page = false
      AND current_user_is_admin();
$$;

-- 7.2 get_top_pages(days, limit)
CREATE OR REPLACE FUNCTION get_top_pages(
    days_back   INTEGER DEFAULT 30,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    page_path       TEXT,
    page_title      TEXT,
    visit_count     BIGINT,
    unique_visitors BIGINT,
    avg_duration    NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    WITH titles AS (
        SELECT DISTINCT ON (page_path)
            page_path, page_title
        FROM site_pageviews
        WHERE visited_at >= now() - (days_back || ' days')::interval
          AND is_bot = false
          AND is_admin_page = false
          AND page_title IS NOT NULL
        ORDER BY page_path, visited_at DESC
    )
    SELECT
        pv.page_path,
        COALESCE(t.page_title, pv.page_path)              AS page_title,
        COUNT(*)::BIGINT                                  AS visit_count,
        COUNT(DISTINCT pv.visitor_id)::BIGINT             AS unique_visitors,
        ROUND(AVG(NULLIF(pv.total_seconds, 0))::numeric, 1) AS avg_duration
    FROM site_pageviews pv
    LEFT JOIN titles t ON t.page_path = pv.page_path
    WHERE pv.visited_at >= now() - (days_back || ' days')::interval
      AND pv.is_bot = false
      AND pv.is_admin_page = false
      AND current_user_is_admin()
    GROUP BY pv.page_path, t.page_title
    ORDER BY visit_count DESC
    LIMIT limit_count;
$$;

-- 7.3 get_visits_by_day(days)
CREATE OR REPLACE FUNCTION get_visits_by_day(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
    visit_date      DATE,
    total_visits    BIGINT,
    unique_visitors BIGINT,
    sessions        BIGINT,
    avg_duration    NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    WITH series AS (
        SELECT generate_series(
            (now() - (days_back || ' days')::interval)::date,
            now()::date,
            '1 day'
        )::date AS d
    ),
    agg AS (
        SELECT
            visited_at::date AS d,
            COUNT(*)                                AS total_visits,
            COUNT(DISTINCT visitor_id)              AS unique_visitors,
            COUNT(DISTINCT session_id)              AS sessions,
            ROUND(AVG(NULLIF(total_seconds, 0))::numeric, 1) AS avg_duration
        FROM site_pageviews
        WHERE visited_at >= now() - (days_back || ' days')::interval
          AND is_bot = false
          AND is_admin_page = false
          AND current_user_is_admin()
        GROUP BY 1
    )
    SELECT
        s.d                                AS visit_date,
        COALESCE(a.total_visits, 0)::BIGINT,
        COALESCE(a.unique_visitors, 0)::BIGINT,
        COALESCE(a.sessions, 0)::BIGINT,
        COALESCE(a.avg_duration, 0)::NUMERIC
    FROM series s
    LEFT JOIN agg a ON a.d = s.d
    ORDER BY s.d DESC;
$$;

-- 7.4 get_device_stats(days)
CREATE OR REPLACE FUNCTION get_device_stats(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
    device_type     TEXT,
    visit_count     BIGINT,
    unique_visitors BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT
        COALESCE(device_type, 'unknown')      AS device_type,
        COUNT(*)::BIGINT                      AS visit_count,
        COUNT(DISTINCT visitor_id)::BIGINT    AS unique_visitors
    FROM site_pageviews
    WHERE visited_at >= now() - (days_back || ' days')::interval
      AND is_bot = false
      AND is_admin_page = false
      AND current_user_is_admin()
    GROUP BY 1
    ORDER BY visit_count DESC;
$$;

-- 7.5 get_browser_stats(days)
CREATE OR REPLACE FUNCTION get_browser_stats(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
    browser_name TEXT,
    visit_count  BIGINT,
    percentage   NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    WITH base AS (
        SELECT COALESCE(browser_name, 'Unknown') AS browser_name
        FROM site_pageviews
        WHERE visited_at >= now() - (days_back || ' days')::interval
          AND is_bot = false
          AND is_admin_page = false
          AND current_user_is_admin()
    )
    SELECT
        browser_name,
        COUNT(*)::BIGINT                                                    AS visit_count,
        ROUND(100.0 * COUNT(*) / NULLIF((SELECT COUNT(*) FROM base), 0)::numeric, 1) AS percentage
    FROM base
    GROUP BY browser_name
    ORDER BY visit_count DESC;
$$;

-- 7.6 / 7.7 / 7.8 wrappers (today/week/month)
CREATE OR REPLACE FUNCTION get_today_visits_stats()
RETURNS TABLE (total_visits BIGINT, unique_visitors BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
    SELECT
        COUNT(*)::BIGINT,
        COUNT(DISTINCT visitor_id)::BIGINT
    FROM site_pageviews
    WHERE visited_at::date = CURRENT_DATE
      AND is_bot = false
      AND is_admin_page = false
      AND current_user_is_admin();
$$;

CREATE OR REPLACE FUNCTION get_week_visits_stats()
RETURNS TABLE (total_visits BIGINT, unique_visitors BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
    SELECT
        COUNT(*)::BIGINT,
        COUNT(DISTINCT visitor_id)::BIGINT
    FROM site_pageviews
    WHERE visited_at >= now() - interval '7 days'
      AND is_bot = false
      AND is_admin_page = false
      AND current_user_is_admin();
$$;

CREATE OR REPLACE FUNCTION get_month_visits_stats()
RETURNS TABLE (total_visits BIGINT, unique_visitors BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
    SELECT
        COUNT(*)::BIGINT,
        COUNT(DISTINCT visitor_id)::BIGINT
    FROM site_pageviews
    WHERE visited_at >= now() - interval '30 days'
      AND is_bot = false
      AND is_admin_page = false
      AND current_user_is_admin();
$$;

-- 7.9 get_countries_stats(days, limit)
CREATE OR REPLACE FUNCTION get_countries_stats(
    days_back   INTEGER DEFAULT 30,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    country_code    TEXT,
    country_name    TEXT,
    visit_count     BIGINT,
    unique_visitors BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT
        pv.country_code,
        COALESCE(c.name_ar, pv.country_code)  AS country_name,
        COUNT(*)::BIGINT                      AS visit_count,
        COUNT(DISTINCT pv.visitor_id)::BIGINT AS unique_visitors
    FROM site_pageviews pv
    LEFT JOIN iso_countries c ON c.code = pv.country_code
    WHERE pv.visited_at >= now() - (days_back || ' days')::interval
      AND pv.country_code IS NOT NULL
      AND pv.is_bot = false
      AND pv.is_admin_page = false
      AND current_user_is_admin()
    GROUP BY pv.country_code, c.name_ar
    ORDER BY visit_count DESC
    LIMIT limit_count;
$$;

-- 7.10 get_cities_stats(days, limit)
CREATE OR REPLACE FUNCTION get_cities_stats(
    days_back   INTEGER DEFAULT 30,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    city            TEXT,
    country_code    TEXT,
    country_name    TEXT,
    visit_count     BIGINT,
    unique_visitors BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT
        pv.city,
        pv.country_code,
        COALESCE(c.name_ar, pv.country_code)  AS country_name,
        COUNT(*)::BIGINT                      AS visit_count,
        COUNT(DISTINCT pv.visitor_id)::BIGINT AS unique_visitors
    FROM site_pageviews pv
    LEFT JOIN iso_countries c ON c.code = pv.country_code
    WHERE pv.visited_at >= now() - (days_back || ' days')::interval
      AND pv.city IS NOT NULL
      AND pv.is_bot = false
      AND pv.is_admin_page = false
      AND current_user_is_admin()
    GROUP BY pv.city, pv.country_code, c.name_ar
    ORDER BY visit_count DESC
    LIMIT limit_count;
$$;

-- 7.11 get_new_vs_returning(days)
CREATE OR REPLACE FUNCTION get_new_vs_returning(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
    visit_date          DATE,
    new_visitors        BIGINT,
    returning_visitors  BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    WITH series AS (
        SELECT generate_series(
            (now() - (days_back || ' days')::interval)::date,
            now()::date,
            '1 day'
        )::date AS d
    ),
    daily_visitors AS (
        SELECT DISTINCT visited_at::date AS d, visitor_id
        FROM site_pageviews
        WHERE visited_at >= now() - (days_back || ' days')::interval
          AND is_bot = false
          AND is_admin_page = false
          AND current_user_is_admin()
    ),
    classified AS (
        SELECT
            dv.d,
            CASE WHEN sv.first_seen_at::date = dv.d THEN 'new' ELSE 'returning' END AS kind
        FROM daily_visitors dv
        JOIN site_visitors sv ON sv.id = dv.visitor_id
    )
    SELECT
        s.d AS visit_date,
        COALESCE(SUM(CASE WHEN c.kind = 'new'       THEN 1 ELSE 0 END), 0)::BIGINT AS new_visitors,
        COALESCE(SUM(CASE WHEN c.kind = 'returning' THEN 1 ELSE 0 END), 0)::BIGINT AS returning_visitors
    FROM series s
    LEFT JOIN classified c ON c.d = s.d
    GROUP BY s.d
    ORDER BY s.d DESC;
$$;

-- 7.12 get_top_referrers(days, limit)
CREATE OR REPLACE FUNCTION get_top_referrers(
    days_back   INTEGER DEFAULT 30,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    referrer_host   TEXT,
    visit_count     BIGINT,
    unique_visitors BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT
        referrer_host,
        COUNT(*)::BIGINT                   AS visit_count,
        COUNT(DISTINCT visitor_id)::BIGINT AS unique_visitors
    FROM site_pageviews
    WHERE visited_at >= now() - (days_back || ' days')::interval
      AND referrer_host IS NOT NULL
      AND is_bot = false
      AND is_admin_page = false
      AND current_user_is_admin()
    GROUP BY referrer_host
    ORDER BY visit_count DESC
    LIMIT limit_count;
$$;

-- 7.13 get_visits_heatmap(days)
CREATE OR REPLACE FUNCTION get_visits_heatmap(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
    day_of_week INTEGER,
    hour_of_day INTEGER,
    visit_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT
        EXTRACT(DOW  FROM visited_at)::INTEGER AS day_of_week,
        EXTRACT(HOUR FROM visited_at)::INTEGER AS hour_of_day,
        COUNT(*)::BIGINT                       AS visit_count
    FROM site_pageviews
    WHERE visited_at >= now() - (days_back || ' days')::interval
      AND is_bot = false
      AND is_admin_page = false
      AND current_user_is_admin()
    GROUP BY 1, 2
    ORDER BY 1, 2;
$$;

-- 7.14 get_exit_pages(days, limit)
CREATE OR REPLACE FUNCTION get_exit_pages(
    days_back   INTEGER DEFAULT 30,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    page_path  TEXT,
    page_title TEXT,
    exit_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    WITH last_in_session AS (
        SELECT DISTINCT ON (session_id)
            page_path, page_title
        FROM site_pageviews
        WHERE visited_at >= now() - (days_back || ' days')::interval
          AND is_bot = false
          AND is_admin_page = false
          AND current_user_is_admin()
        ORDER BY session_id, visited_at DESC
    )
    SELECT
        page_path,
        MAX(page_title)  AS page_title,
        COUNT(*)::BIGINT AS exit_count
    FROM last_in_session
    GROUP BY page_path
    ORDER BY exit_count DESC
    LIMIT limit_count;
$$;

-- 7.15 export_visits_for_admin(start, end)
CREATE OR REPLACE FUNCTION export_visits_for_admin(
    start_date TIMESTAMPTZ,
    end_date   TIMESTAMPTZ
)
RETURNS TABLE (
    visited_at      TIMESTAMPTZ,
    page_path       TEXT,
    page_title      TEXT,
    country_code    TEXT,
    country_name    TEXT,
    city            TEXT,
    device_type     TEXT,
    browser_name    TEXT,
    os_name         TEXT,
    referrer_host   TEXT,
    total_seconds   INTEGER,
    is_bounce       BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT
        pv.visited_at,
        pv.page_path,
        pv.page_title,
        pv.country_code,
        COALESCE(c.name_ar, pv.country_code) AS country_name,
        pv.city,
        pv.device_type,
        pv.browser_name,
        pv.os_name,
        pv.referrer_host,
        pv.total_seconds,
        pv.is_bounce
    FROM site_pageviews pv
    LEFT JOIN iso_countries c ON c.code = pv.country_code
    WHERE pv.visited_at >= start_date
      AND pv.visited_at <  end_date
      AND pv.is_bot = false
      AND pv.is_admin_page = false
      AND current_user_is_admin()
    ORDER BY pv.visited_at DESC;
$$;

-- =========================================================
-- 8) GRANT EXECUTE
-- =========================================================
GRANT EXECUTE ON FUNCTION get_visit_stats(TIMESTAMPTZ, TIMESTAMPTZ)        TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_pages(INTEGER, INTEGER)                  TO authenticated;
GRANT EXECUTE ON FUNCTION get_visits_by_day(INTEGER)                       TO authenticated;
GRANT EXECUTE ON FUNCTION get_device_stats(INTEGER)                        TO authenticated;
GRANT EXECUTE ON FUNCTION get_browser_stats(INTEGER)                       TO authenticated;
GRANT EXECUTE ON FUNCTION get_today_visits_stats()                         TO authenticated;
GRANT EXECUTE ON FUNCTION get_week_visits_stats()                          TO authenticated;
GRANT EXECUTE ON FUNCTION get_month_visits_stats()                         TO authenticated;
GRANT EXECUTE ON FUNCTION get_countries_stats(INTEGER, INTEGER)            TO authenticated;
GRANT EXECUTE ON FUNCTION get_cities_stats(INTEGER, INTEGER)               TO authenticated;
GRANT EXECUTE ON FUNCTION get_new_vs_returning(INTEGER)                    TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_referrers(INTEGER, INTEGER)              TO authenticated;
GRANT EXECUTE ON FUNCTION get_visits_heatmap(INTEGER)                      TO authenticated;
GRANT EXECUTE ON FUNCTION get_exit_pages(INTEGER, INTEGER)                 TO authenticated;
GRANT EXECUTE ON FUNCTION export_visits_for_admin(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- =========================================================
-- 9) Maintenance: aggregate yesterday + cleanup old rows
-- =========================================================

-- 9a) aggregate_yesterday_into_summary()
CREATE OR REPLACE FUNCTION aggregate_yesterday_into_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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
        COALESCE(ROUND(AVG(NULLIF(total_seconds, 0))
                       FILTER (WHERE NOT is_bot AND NOT is_admin_page)::numeric, 2), 0),
        COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE is_bounce AND NOT is_bot AND NOT is_admin_page)
                       / NULLIF(COUNT(*) FILTER (WHERE NOT is_bot AND NOT is_admin_page), 0)::numeric, 2), 0),
        -- top_pages
        COALESCE((
            SELECT jsonb_agg(jsonb_build_object('path', page_path, 'count', cnt))
            FROM (
                SELECT page_path, COUNT(*) AS cnt
                FROM site_pageviews
                WHERE visited_at::date = v_date AND NOT is_bot AND NOT is_admin_page
                GROUP BY page_path
                ORDER BY cnt DESC
                LIMIT 20
            ) t
        ), '[]'::jsonb),
        -- device_breakdown
        COALESCE((
            SELECT jsonb_object_agg(COALESCE(device_type, 'unknown'), cnt)
            FROM (
                SELECT device_type, COUNT(*) AS cnt
                FROM site_pageviews
                WHERE visited_at::date = v_date AND NOT is_bot AND NOT is_admin_page
                GROUP BY device_type
            ) t
        ), '{}'::jsonb),
        -- country_breakdown
        COALESCE((
            SELECT jsonb_object_agg(country_code, cnt)
            FROM (
                SELECT country_code, COUNT(*) AS cnt
                FROM site_pageviews
                WHERE visited_at::date = v_date AND NOT is_bot AND NOT is_admin_page
                  AND country_code IS NOT NULL
                GROUP BY country_code
            ) t
        ), '{}'::jsonb),
        -- browser_breakdown
        COALESCE((
            SELECT jsonb_object_agg(COALESCE(browser_name, 'Unknown'), cnt)
            FROM (
                SELECT browser_name, COUNT(*) AS cnt
                FROM site_pageviews
                WHERE visited_at::date = v_date AND NOT is_bot AND NOT is_admin_page
                GROUP BY browser_name
            ) t
        ), '{}'::jsonb),
        -- referrer_breakdown
        COALESCE((
            SELECT jsonb_object_agg(referrer_host, cnt)
            FROM (
                SELECT referrer_host, COUNT(*) AS cnt
                FROM site_pageviews
                WHERE visited_at::date = v_date AND NOT is_bot AND NOT is_admin_page
                  AND referrer_host IS NOT NULL
                GROUP BY referrer_host
                ORDER BY cnt DESC
                LIMIT 20
            ) t
        ), '{}'::jsonb),
        -- hourly_distribution
        COALESCE((
            SELECT jsonb_object_agg(hour::TEXT, cnt)
            FROM (
                SELECT EXTRACT(HOUR FROM visited_at)::INTEGER AS hour, COUNT(*) AS cnt
                FROM site_pageviews
                WHERE visited_at::date = v_date AND NOT is_bot AND NOT is_admin_page
                GROUP BY 1
            ) t
        ), '{}'::jsonb)
    FROM site_pageviews
    WHERE visited_at::date = v_date
    ON CONFLICT (summary_date) DO UPDATE
    SET total_pageviews      = EXCLUDED.total_pageviews,
        unique_visitors      = EXCLUDED.unique_visitors,
        unique_sessions      = EXCLUDED.unique_sessions,
        bot_pageviews        = EXCLUDED.bot_pageviews,
        member_pageviews     = EXCLUDED.member_pageviews,
        avg_duration_seconds = EXCLUDED.avg_duration_seconds,
        bounce_rate          = EXCLUDED.bounce_rate,
        top_pages            = EXCLUDED.top_pages,
        device_breakdown     = EXCLUDED.device_breakdown,
        country_breakdown    = EXCLUDED.country_breakdown,
        browser_breakdown    = EXCLUDED.browser_breakdown,
        referrer_breakdown   = EXCLUDED.referrer_breakdown,
        hourly_distribution  = EXCLUDED.hourly_distribution;
END;
$$;

REVOKE EXECUTE ON FUNCTION aggregate_yesterday_into_summary() FROM PUBLIC;

-- 9b) cleanup_pageviews_older_than(days)
CREATE OR REPLACE FUNCTION cleanup_pageviews_older_than(p_days INTEGER DEFAULT 180)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_deleted BIGINT;
BEGIN
    -- نتأكد من وجود ملخص لكل يوم سيُحذف قبل الحذف
    PERFORM aggregate_yesterday_into_summary();

    DELETE FROM site_pageviews
    WHERE visited_at < (now() - (p_days || ' days')::interval);

    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$;

REVOKE EXECUTE ON FUNCTION cleanup_pageviews_older_than(INTEGER) FROM PUBLIC;

-- =========================================================
-- 10) pg_cron schedules
-- =========================================================
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

-- يومياً 03:00 UTC: تجميع بيانات الأمس
SELECT cron.schedule(
    'site-visits-daily-aggregate',
    '0 3 * * *',
    $cron$SELECT public.aggregate_yesterday_into_summary();$cron$
);

-- شهرياً يوم 1 الساعة 04:00 UTC: تنظيف الصفوف الأقدم من 180 يوم
SELECT cron.schedule(
    'site-visits-monthly-cleanup',
    '0 4 1 * *',
    $cron$SELECT public.cleanup_pageviews_older_than(180);$cron$
);
