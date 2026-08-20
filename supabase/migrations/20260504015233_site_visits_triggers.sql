-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260504015233   الاسم: site_visits_triggers

-- Triggers
CREATE OR REPLACE FUNCTION trg_pv_upsert_visitor()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO site_visitors AS v (id, user_id, first_seen_at, last_seen_at,
                                    total_pageviews, distinct_sessions,
                                    country_code, city)
    VALUES (NEW.visitor_id, NEW.user_id, NEW.visited_at, NEW.visited_at,
            1, 1, NEW.country_code, NEW.city)
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

CREATE OR REPLACE FUNCTION trg_pv_compute_bounce()
RETURNS TRIGGER AS $$
DECLARE
    v_session_pv_count INTEGER;
BEGIN
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
