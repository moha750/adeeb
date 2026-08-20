-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260212204502   الاسم: create_elections_tables

-- جدول الانتخابات الرئيسي
CREATE TABLE elections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    committee_id INTEGER NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
    position_type TEXT NOT NULL CHECK (position_type IN ('leader', 'deputy')),
    nomination_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    nomination_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    voting_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    voting_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'nomination' CHECK (status IN ('nomination', 'review', 'voting', 'completed', 'cancelled')),
    created_by UUID NOT NULL REFERENCES profiles(id),
    winner_id UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT valid_nomination_dates CHECK (nomination_end_date > nomination_start_date),
    CONSTRAINT valid_voting_dates CHECK (voting_end_date > voting_start_date),
    CONSTRAINT voting_after_nomination CHECK (voting_start_date >= nomination_end_date)
);

COMMENT ON TABLE elections IS 'جدول الانتخابات للمناصب القيادية في اللجان';
COMMENT ON COLUMN elections.position_type IS 'نوع المنصب: leader (قائد) أو deputy (نائب قائد)';
COMMENT ON COLUMN elections.status IS 'حالة الانتخاب: nomination (ترشح), review (مراجعة), voting (تصويت), completed (مكتمل), cancelled (ملغي)';
