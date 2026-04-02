-- =============================================
-- نظام الانتخابات - Elections System
-- =============================================

-- 1. جدول أوزان التصويت (مرجعي)
CREATE TABLE IF NOT EXISTS election_vote_weights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_name TEXT NOT NULL UNIQUE,
    weight NUMERIC(3,1) NOT NULL,
    description_ar TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- بيانات الأوزان
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

-- =============================================
-- RPC Functions
-- =============================================

-- دالة جلب وزن التصويت للمستخدم
CREATE OR REPLACE FUNCTION get_vote_weight(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_weight NUMERIC(3,1) := 1.0;
BEGIN
    SELECT COALESCE(MAX(evw.weight), 1.0)
    INTO v_weight
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    JOIN election_vote_weights evw ON evw.role_name = r.role_name
    WHERE ur.user_id = p_user_id
      AND ur.is_active = true;
    RETURN v_weight;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة جلب نتائج الانتخاب
CREATE OR REPLACE FUNCTION get_election_results(p_election_id UUID)
RETURNS TABLE (
    candidate_id UUID,
    user_id UUID,
    full_name TEXT,
    avatar_url TEXT,
    candidacy_statement TEXT,
    total_weighted_votes NUMERIC,
    vote_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ec.id AS candidate_id,
        ec.user_id,
        p.full_name,
        p.avatar_url,
        ec.candidacy_statement,
        COALESCE(SUM(ev.vote_weight), 0) AS total_weighted_votes,
        COUNT(ev.id) AS vote_count
    FROM election_candidates ec
    JOIN profiles p ON ec.user_id = p.id
    LEFT JOIN election_votes ev ON ev.candidate_id = ec.id
    WHERE ec.election_id = p_election_id
      AND ec.status = 'approved'
    GROUP BY ec.id, ec.user_id, p.full_name, p.avatar_url, ec.candidacy_statement
    ORDER BY total_weighted_votes DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Row Level Security
-- =============================================

ALTER TABLE elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_vote_weights ENABLE ROW LEVEL SECURITY;

-- election_vote_weights: قراءة للجميع
CREATE POLICY "vote_weights_select" ON election_vote_weights
    FOR SELECT TO authenticated
    USING (true);

-- elections: قراءة الانتخابات غير المسودة + المسودات الخاصة
CREATE POLICY "elections_select" ON elections
    FOR SELECT TO authenticated
    USING (status != 'draft' OR created_by = auth.uid());

-- elections: إدارة للمسؤولين (role_level >= 9 أو HR)
CREATE POLICY "elections_admin_insert" ON elections
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND ur.is_active = true
              AND (r.role_level >= 9 OR r.role_name IN ('hr_committee_leader','hr_admin_member'))
        )
    );

CREATE POLICY "elections_admin_update" ON elections
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND ur.is_active = true
              AND (r.role_level >= 9 OR r.role_name IN ('hr_committee_leader','hr_admin_member'))
        )
    );

CREATE POLICY "elections_admin_delete" ON elections
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND ur.is_active = true
              AND (r.role_level >= 9 OR r.role_name IN ('hr_committee_leader','hr_admin_member'))
        )
    );

-- election_candidates: قراءة للجميع
CREATE POLICY "candidates_select" ON election_candidates
    FOR SELECT TO authenticated
    USING (true);

-- election_candidates: إضافة ترشح شخصي
CREATE POLICY "candidates_insert_own" ON election_candidates
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- election_candidates: تعديل من الإدارة (قبول/رفض)
CREATE POLICY "candidates_admin_update" ON election_candidates
    FOR UPDATE TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND ur.is_active = true
              AND (r.role_level >= 9 OR r.role_name IN ('hr_committee_leader','hr_admin_member'))
        )
    );

-- election_votes: إضافة صوت شخصي
CREATE POLICY "votes_insert_own" ON election_votes
    FOR INSERT TO authenticated
    WITH CHECK (voter_id = auth.uid());

-- election_votes: قراءة صوتك أو المسؤولين
CREATE POLICY "votes_select" ON election_votes
    FOR SELECT TO authenticated
    USING (
        voter_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND ur.is_active = true
              AND r.role_level >= 9
        )
    );

-- =============================================
-- Permissions - صلاحيات الانتخابات
-- =============================================

INSERT INTO permissions (permission_key, permission_name_ar, category, description)
VALUES
    ('manage_elections', 'إدارة الانتخابات', 'elections', 'إنشاء وتعديل وإدارة الانتخابات'),
    ('view_elections', 'عرض الانتخابات', 'elections', 'عرض قائمة الانتخابات والتفاصيل'),
    ('approve_candidates', 'الموافقة على المرشحين', 'elections', 'قبول أو رفض طلبات الترشح'),
    ('vote_in_elections', 'التصويت في الانتخابات', 'elections', 'التصويت للمرشحين'),
    ('view_election_results', 'عرض نتائج الانتخابات', 'elections', 'عرض نتائج التصويت')
ON CONFLICT (permission_key) DO NOTHING;

-- ربط الصلاحيات بالأدوار
-- رئيس النادي والمستشار والرئيس التنفيذي: جميع الصلاحيات
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name IN ('club_president', 'president_advisor', 'executive_council_president')
  AND p.category = 'elections'
ON CONFLICT DO NOTHING;

-- قائد وعضو الموارد البشرية: إدارة + موافقة + عرض + تصويت + نتائج
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name IN ('hr_committee_leader', 'hr_admin_member')
  AND p.permission_key IN ('manage_elections', 'approve_candidates', 'view_elections', 'vote_in_elections', 'view_election_results')
ON CONFLICT DO NOTHING;

-- قائد وعضو الضمان والجودة: عرض + تصويت + نتائج
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name IN ('qa_committee_leader', 'qa_admin_member')
  AND p.permission_key IN ('view_elections', 'vote_in_elections', 'view_election_results')
ON CONFLICT DO NOTHING;

-- رؤساء الأقسام وقادة اللجان ونوابهم: عرض + تصويت + نتائج
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name IN ('department_head', 'committee_leader', 'deputy_committee_leader')
  AND p.permission_key IN ('view_elections', 'vote_in_elections', 'view_election_results')
ON CONFLICT DO NOTHING;

-- الأعضاء: عرض + تصويت
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'committee_member'
  AND p.permission_key IN ('view_elections', 'vote_in_elections')
ON CONFLICT DO NOTHING;

-- =============================================
-- Storage Bucket للملفات الانتخابية
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('election-files', 'election-files', false)
ON CONFLICT (id) DO NOTHING;

-- سياسة رفع الملفات: المستخدم المصادق يرفع ملفاته فقط
CREATE POLICY "election_files_upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'election-files');

-- سياسة قراءة الملفات: المستخدمون المصادقون
CREATE POLICY "election_files_read" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'election-files');
