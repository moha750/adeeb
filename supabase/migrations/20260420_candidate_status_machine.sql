-- =============================================
-- آلة حالة المرشّح (Candidate State Machine)
-- انتقالات مسموحة:
--   pending      → approved, rejected, needs_edit, withdrawn
--   needs_edit   → pending (بعد التعديل وإعادة الإرسال), withdrawn
--   approved     → withdrawn (فقط — انسحاب بعد القبول)
--   rejected     → (نهائي)
--   withdrawn    → (نهائي)
-- =============================================

CREATE OR REPLACE FUNCTION enforce_candidate_status_transition()
RETURNS TRIGGER AS $$
DECLARE
    v_allowed BOOLEAN := false;
BEGIN
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    v_allowed := CASE
        WHEN OLD.status = 'pending'    AND NEW.status IN ('approved','rejected','needs_edit','withdrawn') THEN true
        WHEN OLD.status = 'needs_edit' AND NEW.status IN ('pending','withdrawn')                          THEN true
        WHEN OLD.status = 'approved'   AND NEW.status IN ('withdrawn')                                    THEN true
        ELSE false
    END;

    IF NOT v_allowed THEN
        RAISE EXCEPTION 'انتقال غير مسموح في حالة المرشّح: % → %', OLD.status, NEW.status
            USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_candidate_status_transition ON election_candidates;
CREATE TRIGGER trg_enforce_candidate_status_transition
    BEFORE UPDATE OF status ON election_candidates
    FOR EACH ROW
    EXECUTE FUNCTION enforce_candidate_status_transition();
