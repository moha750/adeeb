-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260419160727   الاسم: election_candidates_review

ALTER TABLE election_candidates
    DROP CONSTRAINT IF EXISTS election_candidates_status_check;

ALTER TABLE election_candidates
    ADD CONSTRAINT election_candidates_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn', 'needs_edit'));

ALTER TABLE election_candidates
    ADD COLUMN IF NOT EXISTS edit_request_note  TEXT,
    ADD COLUMN IF NOT EXISTS edit_requested_at  TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS edit_requested_by  UUID REFERENCES profiles(id);

CREATE INDEX IF NOT EXISTS idx_election_candidates_status
    ON election_candidates(status);
