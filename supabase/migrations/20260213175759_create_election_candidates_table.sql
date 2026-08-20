-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260213175759   الاسم: create_election_candidates_table


-- جدول المرشحين للانتخابات
CREATE TABLE IF NOT EXISTS election_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    application_file_url TEXT NOT NULL,
    application_file_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'file_deleted')),
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    votes_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(election_id, user_id)
);

-- تعليق على الجدول
COMMENT ON TABLE election_candidates IS 'جدول طلبات الترشح للمناصب القيادية في نادي أدِيب';
COMMENT ON COLUMN election_candidates.status IS 'حالة الطلب: pending (قيد المراجعة), approved (مقبول), rejected (مرفوض), file_deleted (تم حذف الملف للتقديم مجدداً)';

-- فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_election_candidates_election_id ON election_candidates(election_id);
CREATE INDEX IF NOT EXISTS idx_election_candidates_user_id ON election_candidates(user_id);
CREATE INDEX IF NOT EXISTS idx_election_candidates_status ON election_candidates(status);

