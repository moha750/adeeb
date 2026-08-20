-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260131213205   الاسم: create_archive_tables


-- إنشاء جدول أرشفة دورات التسجيل
CREATE TABLE IF NOT EXISTS archived_membership_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_name TEXT NOT NULL,
    cycle_year INTEGER NOT NULL,
    cycle_season TEXT,
    description TEXT,
    total_applications INTEGER DEFAULT 0,
    total_interviews INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    archived_by UUID REFERENCES profiles(id),
    archived_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء جدول أرشفة طلبات العضوية
CREATE TABLE IF NOT EXISTS archived_membership_applications (
    archive_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id UUID NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT NOT NULL,
    degree TEXT,
    college TEXT,
    major TEXT,
    skills TEXT,
    preferred_committee TEXT,
    portfolio_url TEXT,
    social_twitter TEXT,
    social_instagram TEXT,
    social_linkedin TEXT,
    about TEXT NOT NULL,
    status TEXT DEFAULT 'new',
    admin_notes TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    visitor_id TEXT,
    session_id TEXT,
    path TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    approved_for_interview_at TIMESTAMPTZ,
    approved_for_interview_by UUID,
    review_notes TEXT,
    cycle_id UUID,
    archived_cycle_id UUID REFERENCES archived_membership_cycles(id),
    archived_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء جدول أرشفة المقابلات
CREATE TABLE IF NOT EXISTS archived_membership_interviews (
    archive_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id UUID NOT NULL,
    application_id UUID NOT NULL,
    interview_date TIMESTAMPTZ,
    interview_location TEXT,
    interview_type TEXT DEFAULT 'in_person',
    meeting_link TEXT,
    interviewer_id UUID,
    interviewer_notes TEXT,
    status TEXT DEFAULT 'scheduled',
    result TEXT,
    result_notes TEXT,
    decided_by UUID,
    decided_at TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    migrated_to_user_id UUID,
    migrated_at TIMESTAMPTZ,
    migration_notes TEXT,
    archived_cycle_id UUID REFERENCES archived_membership_cycles(id),
    archived_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء جدول أرشفة جلسات المقابلات
CREATE TABLE IF NOT EXISTS archived_interview_sessions (
    archive_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id UUID NOT NULL,
    session_name TEXT NOT NULL,
    session_description TEXT,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration INTEGER DEFAULT 10,
    interview_type TEXT DEFAULT 'online',
    meeting_link TEXT,
    location TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    public_link_token TEXT NOT NULL,
    max_bookings INTEGER,
    allow_cancellation BOOLEAN DEFAULT TRUE,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    archived_cycle_id UUID REFERENCES archived_membership_cycles(id),
    archived_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء جدول أرشفة فترات المقابلات
CREATE TABLE IF NOT EXISTS archived_interview_slots (
    archive_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id UUID NOT NULL,
    session_id UUID NOT NULL,
    slot_time TIMESTAMPTZ NOT NULL,
    slot_end_time TIMESTAMPTZ NOT NULL,
    is_booked BOOLEAN DEFAULT FALSE,
    booked_by UUID,
    booked_at TIMESTAMPTZ,
    interview_id UUID,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    archived_cycle_id UUID REFERENCES archived_membership_cycles(id),
    archived_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_archived_applications_cycle ON archived_membership_applications(archived_cycle_id);
CREATE INDEX IF NOT EXISTS idx_archived_interviews_cycle ON archived_membership_interviews(archived_cycle_id);
CREATE INDEX IF NOT EXISTS idx_archived_sessions_cycle ON archived_interview_sessions(archived_cycle_id);
CREATE INDEX IF NOT EXISTS idx_archived_slots_cycle ON archived_interview_slots(archived_cycle_id);
CREATE INDEX IF NOT EXISTS idx_archived_cycles_year ON archived_membership_cycles(cycle_year);

-- تفعيل RLS على الجداول
ALTER TABLE archived_membership_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_membership_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_membership_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_interview_slots ENABLE ROW LEVEL SECURITY;

-- سياسات RLS للقراءة (للمسؤولين فقط)
CREATE POLICY "Allow admins to read archived cycles"
    ON archived_membership_cycles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 8
        )
    );

CREATE POLICY "Allow admins to read archived applications"
    ON archived_membership_applications FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 8
        )
    );

CREATE POLICY "Allow admins to read archived interviews"
    ON archived_membership_interviews FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 8
        )
    );

CREATE POLICY "Allow admins to read archived sessions"
    ON archived_interview_sessions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 8
        )
    );

CREATE POLICY "Allow admins to read archived slots"
    ON archived_interview_slots FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 8
        )
    );

-- سياسات RLS للإدراج (للمسؤولين فقط)
CREATE POLICY "Allow admins to insert archived cycles"
    ON archived_membership_cycles FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 10
        )
    );

CREATE POLICY "Allow admins to insert archived applications"
    ON archived_membership_applications FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 10
        )
    );

CREATE POLICY "Allow admins to insert archived interviews"
    ON archived_membership_interviews FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 10
        )
    );

CREATE POLICY "Allow admins to insert archived sessions"
    ON archived_interview_sessions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 10
        )
    );

CREATE POLICY "Allow admins to insert archived slots"
    ON archived_interview_slots FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 10
        )
    );

