-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260214130039   الاسم: create_elections_system


-- =====================================================
-- نظام الانتخابات لأدِيب
-- =====================================================

-- جدول الانتخابات الرئيسي
CREATE TABLE elections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    committee_id INTEGER NOT NULL REFERENCES committees(id),
    position_type TEXT NOT NULL CHECK (position_type IN ('committee_leader', 'deputy_committee_leader')),
    status TEXT NOT NULL DEFAULT 'nomination_open' CHECK (status IN (
        'nomination_open',
        'nomination_review',
        'voting_open',
        'voting_closed',
        'completed',
        'cancelled'
    )),
    nomination_start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    nomination_end_date TIMESTAMPTZ,
    voting_start_date TIMESTAMPTZ,
    voting_end_date TIMESTAMPTZ NOT NULL,
    instructions TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    winner_id UUID REFERENCES profiles(id)
);

-- جدول المرشحين
CREATE TABLE election_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id),
    application_file_url TEXT NOT NULL,
    application_file_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',
        'approved',
        'rejected',
        'file_deleted'
    )),
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    votes_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(election_id, user_id)
);

-- جدول الأصوات
CREATE TABLE election_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL REFERENCES profiles(id),
    candidate_id UUID NOT NULL REFERENCES election_candidates(id),
    voted_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(election_id, voter_id)
);

-- جدول سجل النشاط
CREATE TABLE election_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- إضافة التعليقات للجداول
COMMENT ON TABLE elections IS 'جدول الانتخابات الرئيسي - يحتوي على معلومات كل انتخاب';
COMMENT ON TABLE election_candidates IS 'جدول المرشحين - يحتوي على طلبات الترشح وحالتها';
COMMENT ON TABLE election_votes IS 'جدول الأصوات - يسجل تصويت كل عضو';
COMMENT ON TABLE election_activity_log IS 'سجل نشاط الانتخابات - يتتبع جميع الإجراءات';

-- إنشاء الفهارس لتحسين الأداء
CREATE INDEX idx_elections_committee_id ON elections(committee_id);
CREATE INDEX idx_elections_status ON elections(status);
CREATE INDEX idx_election_candidates_election_id ON election_candidates(election_id);
CREATE INDEX idx_election_candidates_user_id ON election_candidates(user_id);
CREATE INDEX idx_election_candidates_status ON election_candidates(status);
CREATE INDEX idx_election_votes_election_id ON election_votes(election_id);
CREATE INDEX idx_election_votes_candidate_id ON election_votes(candidate_id);
CREATE INDEX idx_election_activity_log_election_id ON election_activity_log(election_id);

-- تفعيل RLS
ALTER TABLE elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_activity_log ENABLE ROW LEVEL SECURITY;

-- Trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_elections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER elections_updated_at_trigger
    BEFORE UPDATE ON elections
    FOR EACH ROW
    EXECUTE FUNCTION update_elections_updated_at();

CREATE TRIGGER election_candidates_updated_at_trigger
    BEFORE UPDATE ON election_candidates
    FOR EACH ROW
    EXECUTE FUNCTION update_elections_updated_at();

-- Trigger لتحديث عدد الأصوات تلقائياً
CREATE OR REPLACE FUNCTION update_candidate_votes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE election_candidates
        SET votes_count = votes_count + 1
        WHERE id = NEW.candidate_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE election_candidates
        SET votes_count = votes_count - 1
        WHERE id = OLD.candidate_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER election_votes_count_trigger
    AFTER INSERT OR DELETE ON election_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_candidate_votes_count();

