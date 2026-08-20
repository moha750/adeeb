-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260212204511   الاسم: create_election_candidates_table

-- جدول المرشحين
CREATE TABLE election_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES profiles(id),
    nomination_file_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'file_deleted')),
    rejection_reason TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES profiles(id),
    UNIQUE(election_id, member_id)
);

COMMENT ON TABLE election_candidates IS 'جدول المرشحين للانتخابات';
COMMENT ON COLUMN election_candidates.status IS 'حالة الترشح: pending (قيد المراجعة), approved (مقبول), rejected (مرفوض), file_deleted (تم حذف الملف)';

CREATE INDEX idx_election_candidates_election_id ON election_candidates(election_id);
CREATE INDEX idx_election_candidates_member_id ON election_candidates(member_id);
CREATE INDEX idx_election_candidates_status ON election_candidates(status);
