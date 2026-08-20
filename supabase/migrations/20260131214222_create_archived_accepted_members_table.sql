-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260131214222   الاسم: create_archived_accepted_members_table


-- إنشاء جدول أرشفة الأعضاء المقبولين
CREATE TABLE IF NOT EXISTS archived_membership_accepted_members (
    archive_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id UUID NOT NULL,
    application_id UUID NOT NULL,
    interview_id UUID,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    assigned_committee TEXT NOT NULL,
    member_number TEXT,
    join_date TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'active',
    notes TEXT,
    added_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    archived_cycle_id UUID REFERENCES archived_membership_cycles(id),
    archived_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء فهرس
CREATE INDEX IF NOT EXISTS idx_archived_accepted_members_cycle ON archived_membership_accepted_members(archived_cycle_id);

-- تفعيل RLS
ALTER TABLE archived_membership_accepted_members ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة
CREATE POLICY "Allow admins to read archived accepted members"
    ON archived_membership_accepted_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 8
        )
    );

-- سياسة الإدراج
CREATE POLICY "Allow admins to insert archived accepted members"
    ON archived_membership_accepted_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 10
        )
    );

