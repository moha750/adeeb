-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260331122400   الاسم: elections_tables


-- 1. جدول أوزان التصويت
CREATE TABLE IF NOT EXISTS election_vote_weights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_name TEXT NOT NULL UNIQUE,
    weight NUMERIC(3,1) NOT NULL,
    description_ar TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO election_vote_weights (role_name, weight, description_ar) VALUES
    ('club_president',              3.0, 'رئيس النادي'),
    ('president_advisor',           3.0, 'المستشار'),
    ('executive_council_president', 3.0, 'الرئيس التنفيذي'),
    ('hr_committee_leader',         2.5, 'قائد لجنة الموارد البشرية'),
    ('qa_committee_leader',         2.5, 'قائد لجنة الضمان والجودة'),
    ('department_head',             2.0, 'رئيس القسم'),
    ('hr_admin_member',             2.0, 'عضو الموارد البشرية'),
    ('qa_admin_member',             2.0, 'عضو الضمان والجودة'),
    ('committee_leader',            1.5, 'قائد اللجنة'),
    ('deputy_committee_leader',     1.5, 'نائب اللجنة'),
    ('committee_member',            1.0, 'العضو')
ON CONFLICT (role_name) DO UPDATE SET weight = EXCLUDED.weight, description_ar = EXCLUDED.description_ar;

-- 2. جدول الانتخابات
CREATE TABLE IF NOT EXISTS elections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    target_role_id INTEGER NOT NULL REFERENCES roles(id),
    target_committee_id INTEGER REFERENCES committees(id),
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','candidacy_open','candidacy_closed','voting_open','voting_closed','completed','cancelled')),
    candidacy_start TIMESTAMPTZ,
    candidacy_end TIMESTAMPTZ,
    voting_start TIMESTAMPTZ,
    voting_end TIMESTAMPTZ,
    winner_user_id UUID REFERENCES profiles(id),
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_elections_status ON elections(status);
CREATE INDEX IF NOT EXISTS idx_elections_target_committee ON elections(target_committee_id);

-- 3. جدول المرشحين
CREATE TABLE IF NOT EXISTS election_candidates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id),
    election_file_url TEXT,
    candidacy_statement TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','approved','rejected','withdrawn')),
    reviewed_by UUID REFERENCES profiles(id),
    review_note TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(election_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_election_candidates_election ON election_candidates(election_id);
CREATE INDEX IF NOT EXISTS idx_election_candidates_user ON election_candidates(user_id);

-- 4. جدول الأصوات
CREATE TABLE IF NOT EXISTS election_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL REFERENCES profiles(id),
    candidate_id UUID NOT NULL REFERENCES election_candidates(id),
    vote_weight NUMERIC(3,1) NOT NULL DEFAULT 1.0,
    voter_role_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(election_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_election_votes_election ON election_votes(election_id);
CREATE INDEX IF NOT EXISTS idx_election_votes_candidate ON election_votes(candidate_id);

