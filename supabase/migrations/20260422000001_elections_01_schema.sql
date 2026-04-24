-- =============================================
-- نظام الانتخابات — 01: الجداول والفهارس
-- =============================================
-- 4 جداول رئيسية + سجل تدقيق + indexes + seed أوزان التصويت.

-- =============================================
-- 1) جدول أوزان التصويت (مرجعي)
-- =============================================
CREATE TABLE IF NOT EXISTS election_vote_weights (
    role_name       TEXT PRIMARY KEY,
    weight          NUMERIC(3,1) NOT NULL CHECK (weight > 0),
    description_ar  TEXT
);

-- الأوزان حسب المواصفات الجديدة (QA غير مذكور عمداً — يسقط إلى 1.0 افتراضياً)
INSERT INTO election_vote_weights (role_name, weight, description_ar) VALUES
    ('club_president',              4.0, 'رئيس أديب'),
    ('president_advisor',           3.5, 'المستشار'),
    ('executive_council_president', 3.5, 'الرئيس التنفيذي'),
    ('hr_committee_leader',         3.0, 'قائد إدارة الموارد البشرية'),
    ('hr_admin_member',             2.5, 'عضو الموارد البشرية'),
    ('department_head',             2.5, 'رئيس القسم'),
    ('committee_leader',            2.0, 'قائد اللجنة'),
    ('deputy_committee_leader',     1.5, 'نائب قائد اللجنة'),
    ('committee_member',            1.0, 'عضو لجنة')
ON CONFLICT (role_name) DO UPDATE
SET weight = EXCLUDED.weight,
    description_ar = EXCLUDED.description_ar;

-- =============================================
-- 2) جدول الانتخابات
-- =============================================
CREATE TABLE IF NOT EXISTS elections (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- نطاق الانتخاب
    target_role_name      TEXT NOT NULL
        CHECK (target_role_name IN ('department_head','committee_leader','deputy_committee_leader')),
    target_committee_id   INTEGER REFERENCES committees(id),
    target_department_id  INTEGER REFERENCES departments(id),

    -- الحالة + الأرشفة
    status                TEXT NOT NULL DEFAULT 'candidacy_open'
        CHECK (status IN ('candidacy_open','candidacy_closed','voting_open','voting_closed','completed','cancelled')),
    archived_at           TIMESTAMPTZ,

    -- الجدولة
    candidacy_opened_at   TIMESTAMPTZ DEFAULT now(),
    candidacy_end         TIMESTAMPTZ,
    voting_opened_at      TIMESTAMPTZ,
    voting_end            TIMESTAMPTZ,

    -- النتيجة
    winner_candidate_id   UUID,
    winner_declared_at    TIMESTAMPTZ,
    winner_declared_by    UUID REFERENCES profiles(id),

    -- ميتاداتا
    title_ar              TEXT,
    description_ar        TEXT,
    created_by            UUID NOT NULL REFERENCES profiles(id),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- النطاق: department_head -> department فقط؛ committee roles -> committee فقط
    CONSTRAINT elections_scope_check CHECK (
        (target_role_name = 'department_head'
            AND target_department_id IS NOT NULL
            AND target_committee_id IS NULL)
        OR
        (target_role_name IN ('committee_leader','deputy_committee_leader')
            AND target_committee_id IS NOT NULL
            AND target_department_id IS NULL)
    )
);

-- لا انتخابان نشطان في نفس المنصب/النطاق
CREATE UNIQUE INDEX IF NOT EXISTS elections_active_committee_uniq
    ON elections (target_role_name, target_committee_id)
    WHERE target_committee_id IS NOT NULL
      AND archived_at IS NULL
      AND status NOT IN ('completed','cancelled');

CREATE UNIQUE INDEX IF NOT EXISTS elections_active_department_uniq
    ON elections (target_role_name, target_department_id)
    WHERE target_department_id IS NOT NULL
      AND archived_at IS NULL
      AND status NOT IN ('completed','cancelled');

CREATE INDEX IF NOT EXISTS idx_elections_status
    ON elections(status) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_elections_committee
    ON elections(target_committee_id);
CREATE INDEX IF NOT EXISTS idx_elections_department
    ON elections(target_department_id);

-- =============================================
-- 3) جدول المرشحين
-- =============================================
CREATE TABLE IF NOT EXISTS election_candidates (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id          UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    user_id              UUID NOT NULL REFERENCES profiles(id),

    -- رقم ترتيبي ثابت لكل انتخاب (1, 2, 3, ...)
    candidate_number     INTEGER NOT NULL CHECK (candidate_number > 0),

    -- محتوى الترشح
    statement_ar         TEXT NOT NULL CHECK (char_length(statement_ar) BETWEEN 20 AND 4000),
    file_url             TEXT,
    file_name            TEXT,
    file_size_bytes      INTEGER,
    file_mime            TEXT,

    -- الحالة والمراجعة
    status               TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','approved','rejected','needs_edit','withdrawn')),
    review_note_ar       TEXT,
    reviewed_by          UUID REFERENCES profiles(id),
    reviewed_at          TIMESTAMPTZ,
    withdrawn_at         TIMESTAMPTZ,

    submitted_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (election_id, user_id),
    UNIQUE (election_id, candidate_number)
);

-- FK على elections.winner_candidate_id (بعد إنشاء الجدول)
ALTER TABLE elections
    DROP CONSTRAINT IF EXISTS elections_winner_fk,
    ADD  CONSTRAINT elections_winner_fk
         FOREIGN KEY (winner_candidate_id) REFERENCES election_candidates(id);

CREATE INDEX IF NOT EXISTS idx_candidates_election
    ON election_candidates(election_id);
CREATE INDEX IF NOT EXISTS idx_candidates_user
    ON election_candidates(user_id);
CREATE INDEX IF NOT EXISTS idx_candidates_pending
    ON election_candidates(election_id) WHERE status = 'pending';

-- =============================================
-- 4) جدول الأصوات
-- =============================================
CREATE TABLE IF NOT EXISTS election_votes (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id           UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    voter_id              UUID NOT NULL REFERENCES profiles(id),
    candidate_id          UUID NOT NULL REFERENCES election_candidates(id),
    vote_weight           NUMERIC(3,1) NOT NULL CHECK (vote_weight > 0),
    voter_role_snapshot   TEXT NOT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (election_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_election
    ON election_votes(election_id);
CREATE INDEX IF NOT EXISTS idx_votes_candidate
    ON election_votes(candidate_id);

-- =============================================
-- 5) سجل التدقيق
-- =============================================
CREATE TABLE IF NOT EXISTS election_audit_log (
    id           BIGSERIAL PRIMARY KEY,
    election_id  UUID REFERENCES elections(id) ON DELETE CASCADE,
    actor_id     UUID REFERENCES profiles(id),
    event_type   TEXT NOT NULL,
    payload      JSONB DEFAULT '{}'::jsonb,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_election
    ON election_audit_log(election_id);
CREATE INDEX IF NOT EXISTS idx_audit_created
    ON election_audit_log(created_at DESC);

-- =============================================
-- 6) updated_at trigger لكل الجداول
-- =============================================
CREATE OR REPLACE FUNCTION set_updated_at_now()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS elections_set_updated_at ON elections;
CREATE TRIGGER elections_set_updated_at
    BEFORE UPDATE ON elections
    FOR EACH ROW EXECUTE FUNCTION set_updated_at_now();

DROP TRIGGER IF EXISTS candidates_set_updated_at ON election_candidates;
CREATE TRIGGER candidates_set_updated_at
    BEFORE UPDATE ON election_candidates
    FOR EACH ROW EXECUTE FUNCTION set_updated_at_now();
