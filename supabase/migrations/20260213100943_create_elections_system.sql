-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260213100943   الاسم: create_elections_system


-- =====================================================
-- نظام الانتخابات للمناصب القيادية في نادي أدِيب
-- =====================================================

-- 1. جدول الدورات الانتخابية
CREATE TABLE IF NOT EXISTS elections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    committee_id INTEGER NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
    position_type TEXT NOT NULL CHECK (position_type IN ('leader', 'deputy')),
    nomination_start_date TIMESTAMPTZ NOT NULL,
    nomination_end_date TIMESTAMPTZ NOT NULL,
    voting_start_date TIMESTAMPTZ NOT NULL,
    voting_end_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'nomination' CHECK (status IN ('nomination', 'review', 'voting', 'completed', 'cancelled')),
    created_by UUID NOT NULL REFERENCES profiles(id),
    winner_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- التحقق من صحة التواريخ
    CONSTRAINT valid_nomination_dates CHECK (nomination_end_date > nomination_start_date),
    CONSTRAINT valid_voting_dates CHECK (voting_end_date > voting_start_date),
    CONSTRAINT nomination_before_voting CHECK (voting_start_date >= nomination_end_date)
);

-- 2. جدول المرشحين
CREATE TABLE IF NOT EXISTS election_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    nomination_file_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'file_deleted')),
    rejection_reason TEXT,
    submitted_at TIMESTAMPTZ DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES profiles(id),
    
    -- كل عضو يمكنه التقديم مرة واحدة فقط لكل دورة
    UNIQUE(election_id, member_id)
);

-- 3. جدول الأصوات
CREATE TABLE IF NOT EXISTS election_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES election_candidates(id) ON DELETE CASCADE,
    voted_at TIMESTAMPTZ DEFAULT now(),
    
    -- كل عضو يصوت مرة واحدة فقط لكل دورة
    UNIQUE(election_id, voter_id)
);

-- 4. إنشاء الفهارس للأداء
CREATE INDEX IF NOT EXISTS idx_elections_committee_id ON elections(committee_id);
CREATE INDEX IF NOT EXISTS idx_elections_status ON elections(status);
CREATE INDEX IF NOT EXISTS idx_elections_created_by ON elections(created_by);
CREATE INDEX IF NOT EXISTS idx_election_candidates_election_id ON election_candidates(election_id);
CREATE INDEX IF NOT EXISTS idx_election_candidates_member_id ON election_candidates(member_id);
CREATE INDEX IF NOT EXISTS idx_election_candidates_status ON election_candidates(status);
CREATE INDEX IF NOT EXISTS idx_election_votes_election_id ON election_votes(election_id);
CREATE INDEX IF NOT EXISTS idx_election_votes_candidate_id ON election_votes(candidate_id);

-- 5. تفعيل RLS
ALTER TABLE elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_votes ENABLE ROW LEVEL SECURITY;

-- 6. إضافة التعليقات
COMMENT ON TABLE elections IS 'جدول الدورات الانتخابية للمناصب القيادية في نادي أدِيب';
COMMENT ON TABLE election_candidates IS 'جدول المرشحين للانتخابات';
COMMENT ON TABLE election_votes IS 'جدول أصوات الانتخابات';

COMMENT ON COLUMN elections.position_type IS 'نوع المنصب: leader (قائد) أو deputy (نائب قائد)';
COMMENT ON COLUMN elections.status IS 'حالة الدورة: nomination (ترشح), review (مراجعة), voting (تصويت), completed (منتهية), cancelled (ملغاة)';
COMMENT ON COLUMN election_candidates.status IS 'حالة الترشح: pending (قيد المراجعة), approved (مقبول), rejected (مرفوض), file_deleted (تم حذف الملف)';

