-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260212204521   الاسم: create_election_votes_table

-- جدول الأصوات
CREATE TABLE election_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL REFERENCES profiles(id),
    candidate_id UUID NOT NULL REFERENCES election_candidates(id) ON DELETE CASCADE,
    voted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(election_id, voter_id)
);

COMMENT ON TABLE election_votes IS 'جدول أصوات الانتخابات - صوت واحد لكل عضو في كل انتخاب';

CREATE INDEX idx_election_votes_election_id ON election_votes(election_id);
CREATE INDEX idx_election_votes_candidate_id ON election_votes(candidate_id);

-- تفعيل RLS على جميع الجداول
ALTER TABLE elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_votes ENABLE ROW LEVEL SECURITY;
