-- إنشاء نظام المقابلات المتكامل

-- ===================================
-- 1. تحديث جدول الطلبات لإضافة حالات جديدة
-- ===================================

-- إضافة حالات جديدة للطلبات
ALTER TABLE membership_applications 
DROP CONSTRAINT IF EXISTS membership_applications_status_check;

ALTER TABLE membership_applications 
ADD CONSTRAINT membership_applications_status_check 
CHECK (status IN (
    'new',              -- جديدة
    'under_review',     -- قيد المراجعة
    'approved_for_interview', -- مقبول للمقابلة
    'rejected',         -- مرفوضة
    'archived'          -- مؤرشفة
));

-- إضافة حقل لتاريخ الموافقة للمقابلة
ALTER TABLE membership_applications 
ADD COLUMN IF NOT EXISTS approved_for_interview_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_for_interview_by UUID REFERENCES profiles(id);

-- ===================================
-- 2. جدول المقابلات
-- ===================================

CREATE TABLE IF NOT EXISTS membership_interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES membership_applications(id) ON DELETE CASCADE,
    interview_date TIMESTAMPTZ NOT NULL,
    interview_location TEXT,
    interview_type TEXT DEFAULT 'in_person' CHECK (interview_type IN ('in_person', 'online', 'phone')),
    meeting_link TEXT,
    interviewer_id UUID REFERENCES profiles(id),
    interviewer_notes TEXT,
    status TEXT DEFAULT 'scheduled' CHECK (status IN (
        'scheduled',    -- مجدولة
        'completed',    -- مكتملة
        'cancelled',    -- ملغاة
        'rescheduled'   -- معاد جدولتها
    )),
    result TEXT CHECK (result IN (
        'pending',      -- معلقة
        'accepted',     -- مقبول
        'rejected',     -- مرفوض
        'no_show'       -- لم يحضر
    )),
    result_notes TEXT,
    decided_by UUID REFERENCES profiles(id),
    decided_at TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(application_id)
);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_interviews_application ON membership_interviews(application_id);
CREATE INDEX IF NOT EXISTS idx_interviews_date ON membership_interviews(interview_date);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON membership_interviews(status);
CREATE INDEX IF NOT EXISTS idx_interviews_result ON membership_interviews(result);
CREATE INDEX IF NOT EXISTS idx_interviews_interviewer ON membership_interviews(interviewer_id);

-- ===================================
-- 3. جدول المقبولين النهائيين
-- ===================================

CREATE TABLE IF NOT EXISTS membership_accepted_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES membership_applications(id) ON DELETE CASCADE,
    interview_id UUID REFERENCES membership_interviews(id),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    assigned_committee TEXT NOT NULL,
    member_number TEXT UNIQUE,
    join_date TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'active' CHECK (status IN (
        'active',       -- نشط
        'inactive',     -- غير نشط
        'suspended',    -- معلق
        'terminated'    -- منتهي
    )),
    notes TEXT,
    added_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(application_id)
);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_accepted_members_application ON membership_accepted_members(application_id);
CREATE INDEX IF NOT EXISTS idx_accepted_members_email ON membership_accepted_members(email);
CREATE INDEX IF NOT EXISTS idx_accepted_members_committee ON membership_accepted_members(assigned_committee);
CREATE INDEX IF NOT EXISTS idx_accepted_members_status ON membership_accepted_members(status);
CREATE INDEX IF NOT EXISTS idx_accepted_members_join_date ON membership_accepted_members(join_date DESC);

-- ===================================
-- 4. دالة لتوليد رقم العضوية
-- ===================================

CREATE OR REPLACE FUNCTION generate_member_number()
RETURNS TEXT AS $$
DECLARE
    v_year TEXT;
    v_count INTEGER;
    v_number TEXT;
BEGIN
    v_year := TO_CHAR(NOW(), 'YY');
    
    SELECT COUNT(*) + 1 INTO v_count
    FROM membership_accepted_members
    WHERE EXTRACT(YEAR FROM join_date) = EXTRACT(YEAR FROM NOW());
    
    v_number := 'AD' || v_year || LPAD(v_count::TEXT, 4, '0');
    
    RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- 5. Triggers لتحديث updated_at
-- ===================================

CREATE OR REPLACE FUNCTION update_interviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_interviews_updated_at
    BEFORE UPDATE ON membership_interviews
    FOR EACH ROW
    EXECUTE FUNCTION update_interviews_updated_at();

CREATE OR REPLACE FUNCTION update_accepted_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_accepted_members_updated_at
    BEFORE UPDATE ON membership_accepted_members
    FOR EACH ROW
    EXECUTE FUNCTION update_accepted_members_updated_at();

-- ===================================
-- 6. Trigger لتوليد رقم العضوية تلقائياً
-- ===================================

CREATE OR REPLACE FUNCTION auto_generate_member_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.member_number IS NULL THEN
        NEW.member_number := generate_member_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_generate_member_number
    BEFORE INSERT ON membership_accepted_members
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_member_number();

-- ===================================
-- 7. RLS Policies - المقابلات
-- ===================================

ALTER TABLE membership_interviews ENABLE ROW LEVEL SECURITY;

-- القراءة - مستوى 7+
CREATE POLICY "allow_admin_select_interviews"
ON membership_interviews
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 7
    )
    OR check_permission(auth.uid(), 'membership.view')
);

-- الإدراج - مستوى 8+
CREATE POLICY "allow_admin_insert_interviews"
ON membership_interviews
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 8
    )
    OR check_permission(auth.uid(), 'membership.manage')
);

-- التحديث - مستوى 8+
CREATE POLICY "allow_admin_update_interviews"
ON membership_interviews
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 8
    )
    OR check_permission(auth.uid(), 'membership.manage')
);

-- الحذف - مستوى 10
CREATE POLICY "allow_superadmin_delete_interviews"
ON membership_interviews
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 10
    )
);

-- ===================================
-- 8. RLS Policies - المقبولين
-- ===================================

ALTER TABLE membership_accepted_members ENABLE ROW LEVEL SECURITY;

-- القراءة - مستوى 5+
CREATE POLICY "allow_users_select_accepted_members"
ON membership_accepted_members
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 5
    )
    OR check_permission(auth.uid(), 'membership.view')
);

-- الإدراج - مستوى 8+
CREATE POLICY "allow_admin_insert_accepted_members"
ON membership_accepted_members
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 8
    )
    OR check_permission(auth.uid(), 'membership.manage')
);

-- التحديث - مستوى 8+
CREATE POLICY "allow_admin_update_accepted_members"
ON membership_accepted_members
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 8
    )
    OR check_permission(auth.uid(), 'membership.manage')
);

-- الحذف - مستوى 10
CREATE POLICY "allow_superadmin_delete_accepted_members"
ON membership_accepted_members
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 10
    )
);

-- ===================================
-- 9. تعليقات توضيحية
-- ===================================

COMMENT ON TABLE membership_interviews IS 'جدول المقابلات للمتقدمين المقبولين للمقابلة';
COMMENT ON TABLE membership_accepted_members IS 'جدول الأعضاء المقبولين نهائياً';

COMMENT ON COLUMN membership_interviews.interview_type IS 'نوع المقابلة: حضوري، أونلاين، هاتفي';
COMMENT ON COLUMN membership_interviews.status IS 'حالة المقابلة: مجدولة، مكتملة، ملغاة، معاد جدولتها';
COMMENT ON COLUMN membership_interviews.result IS 'نتيجة المقابلة: معلقة، مقبول، مرفوض، لم يحضر';

COMMENT ON COLUMN membership_accepted_members.member_number IS 'رقم العضوية الفريد (يتم توليده تلقائياً)';
COMMENT ON COLUMN membership_accepted_members.status IS 'حالة العضو: نشط، غير نشط، معلق، منتهي';

COMMENT ON FUNCTION generate_member_number() IS 'توليد رقم عضوية فريد بصيغة ADYY0001';
