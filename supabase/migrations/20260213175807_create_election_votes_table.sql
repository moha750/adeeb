-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260213175807   الاسم: create_election_votes_table


-- جدول الأصوات
CREATE TABLE IF NOT EXISTS election_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES election_candidates(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(election_id, voter_id)
);

-- تعليق على الجدول
COMMENT ON TABLE election_votes IS 'جدول أصوات الانتخابات - صوت واحد لكل ناخب في كل انتخاب';

-- فهارس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_election_votes_election_id ON election_votes(election_id);
CREATE INDEX IF NOT EXISTS idx_election_votes_candidate_id ON election_votes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_election_votes_voter_id ON election_votes(voter_id);

