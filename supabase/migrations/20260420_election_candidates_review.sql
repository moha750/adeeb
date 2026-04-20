-- =============================================
-- تطوير مراجعة المرشحين: طلب تعديل + حقول مراجعة
-- =============================================

-- 1) توسيع حالات المرشحين لتشمل needs_edit
ALTER TABLE election_candidates
    DROP CONSTRAINT IF EXISTS election_candidates_status_check;

ALTER TABLE election_candidates
    ADD CONSTRAINT election_candidates_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn', 'needs_edit'));

-- 2) حقول طلب التعديل
ALTER TABLE election_candidates
    ADD COLUMN IF NOT EXISTS edit_request_note  TEXT,
    ADD COLUMN IF NOT EXISTS edit_requested_at  TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS edit_requested_by  UUID REFERENCES profiles(id);

CREATE INDEX IF NOT EXISTS idx_election_candidates_status
    ON election_candidates(status);
