-- =============================================
-- حماية انتقالات حالة الانتخاب على مستوى قاعدة البيانات
-- draft → candidacy_open → candidacy_closed → voting_open → voting_closed → completed
-- cancelled مسموح من أي حالة غير نهائية
-- completed / cancelled نهائيّتان
-- =============================================

CREATE OR REPLACE FUNCTION enforce_election_status_transition()
RETURNS TRIGGER AS $$
DECLARE
    v_allowed BOOLEAN := false;
BEGIN
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- خريطة الانتقالات المسموحة
    v_allowed := CASE
        WHEN OLD.status = 'draft'             AND NEW.status IN ('candidacy_open','cancelled')   THEN true
        WHEN OLD.status = 'candidacy_open'    AND NEW.status IN ('candidacy_closed','cancelled') THEN true
        WHEN OLD.status = 'candidacy_closed'  AND NEW.status IN ('voting_open','cancelled')      THEN true
        WHEN OLD.status = 'voting_open'       AND NEW.status IN ('voting_closed','cancelled')    THEN true
        WHEN OLD.status = 'voting_closed'     AND NEW.status IN ('completed','cancelled')        THEN true
        ELSE false
    END;

    IF NOT v_allowed THEN
        RAISE EXCEPTION 'انتقال غير مسموح في حالة الانتخاب: % → %', OLD.status, NEW.status
            USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_election_status_transition ON elections;
CREATE TRIGGER trg_enforce_election_status_transition
    BEFORE UPDATE OF status ON elections
    FOR EACH ROW
    EXECUTE FUNCTION enforce_election_status_transition();
