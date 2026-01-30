-- =====================================================
-- نظام دعوات التسجيل (Membership Invitations System)
-- =====================================================

-- 1. جدول الدعوات الرئيسي
CREATE TABLE IF NOT EXISTS membership_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- معلومات الدعوة
    invitation_code TEXT UNIQUE NOT NULL,
    
    -- إعدادات اللجان
    committee_mode TEXT NOT NULL CHECK (committee_mode IN ('single', 'multiple', 'all')),
    -- single: لجنة واحدة محددة
    -- multiple: مجموعة لجان محددة
    -- all: جميع اللجان
    
    selected_committee_id INTEGER REFERENCES committees(id), -- للوضع single
    selected_committee_ids INTEGER[], -- للوضع multiple (مصفوفة من IDs)
    
    -- إعدادات الاستخدام
    max_uses INT NOT NULL DEFAULT 1 CHECK (max_uses > 0),
    current_uses INT DEFAULT 0 CHECK (current_uses >= 0),
    
    -- مدة الصلاحية (بين 24 ساعة و 7 أيام)
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- حالة الدعوة
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
    
    -- معلومات الإنشاء
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- ملاحظات
    notes TEXT,
    
    -- تتبع الأرشفة (كل دعوة تُأرشف مستقلة)
    archived_at TIMESTAMPTZ,
    archived_with_cycle_id UUID,
    
    CONSTRAINT valid_expiry CHECK (
        expires_at > created_at AND
        expires_at <= created_at + INTERVAL '7 days'
    ),
    CONSTRAINT valid_uses CHECK (current_uses <= max_uses)
);

-- 2. جدول استخدامات الدعوات (لتتبع كل استخدام)
CREATE TABLE IF NOT EXISTS invitation_usages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id UUID REFERENCES membership_invitations(id) ON DELETE CASCADE NOT NULL,
    application_id UUID REFERENCES membership_applications(id) ON DELETE CASCADE,
    
    -- معلومات الاستخدام
    used_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    
    -- بيانات المستخدم
    applicant_email TEXT,
    applicant_name TEXT,
    selected_committee_id INTEGER REFERENCES committees(id)
);

-- 3. جدول أرشيف الدعوات (كل دعوة تُأرشف مستقلة)
CREATE TABLE IF NOT EXISTS archived_membership_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- نسخة من بيانات الدعوة الأصلية
    original_invitation_id UUID NOT NULL,
    invitation_code TEXT NOT NULL,
    committee_mode TEXT NOT NULL,
    selected_committee_id INTEGER,
    selected_committee_ids INTEGER[],
    max_uses INT NOT NULL,
    total_uses INT NOT NULL, -- إجمالي الاستخدامات الفعلية
    
    -- معلومات الصلاحية
    created_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    final_status TEXT NOT NULL,
    
    -- معلومات الأرشفة
    archived_at TIMESTAMPTZ DEFAULT NOW(),
    archived_by UUID REFERENCES auth.users(id),
    archived_with_cycle_id UUID, -- اختياري: إذا أُرشفت مع دورة
    
    -- ملاحظات
    notes TEXT,
    
    -- إحصائيات الاستخدام
    usage_stats JSONB -- تفاصيل الاستخدامات
);

-- 4. Indexes للأداء
CREATE INDEX idx_invitations_code ON membership_invitations(invitation_code);
CREATE INDEX idx_invitations_status ON membership_invitations(status);
CREATE INDEX idx_invitations_expires ON membership_invitations(expires_at);
CREATE INDEX idx_invitations_created_by ON membership_invitations(created_by);
CREATE INDEX idx_invitation_usages_invitation ON invitation_usages(invitation_id);
CREATE INDEX idx_invitation_usages_application ON invitation_usages(application_id);
CREATE INDEX idx_archived_invitations_original ON archived_membership_invitations(original_invitation_id);

-- =====================================================
-- دوال SQL
-- =====================================================

-- 5. دالة التحقق من صلاحية الدعوة
CREATE OR REPLACE FUNCTION validate_invitation(p_code TEXT)
RETURNS TABLE (
    is_valid BOOLEAN,
    invitation_id UUID,
    committee_mode TEXT,
    selected_committee_id INTEGER,
    selected_committee_ids INTEGER[],
    expires_at TIMESTAMPTZ,
    remaining_uses INT,
    message TEXT
) AS $$
DECLARE
    v_invitation RECORD;
BEGIN
    -- جلب الدعوة
    SELECT * INTO v_invitation
    FROM membership_invitations
    WHERE invitation_code = p_code;
    
    -- التحقق من وجود الدعوة
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE, NULL::UUID, NULL::TEXT, NULL::INTEGER, NULL::INTEGER[], 
            NULL::TIMESTAMPTZ, 0, 'الدعوة غير موجودة'::TEXT;
        RETURN;
    END IF;
    
    -- التحقق من الحالة
    IF v_invitation.status != 'active' THEN
        RETURN QUERY SELECT 
            FALSE, v_invitation.id, NULL::TEXT, NULL::INTEGER, NULL::INTEGER[], 
            NULL::TIMESTAMPTZ, 0, 'الدعوة غير نشطة'::TEXT;
        RETURN;
    END IF;
    
    -- التحقق من انتهاء الصلاحية
    IF v_invitation.expires_at <= NOW() THEN
        -- تحديث الحالة إلى منتهية
        UPDATE membership_invitations 
        SET status = 'expired' 
        WHERE id = v_invitation.id;
        
        RETURN QUERY SELECT 
            FALSE, v_invitation.id, NULL::TEXT, NULL::INTEGER, NULL::INTEGER[], 
            NULL::TIMESTAMPTZ, 0, 'انتهت صلاحية الدعوة'::TEXT;
        RETURN;
    END IF;
    
    -- التحقق من عدد الاستخدامات
    IF v_invitation.current_uses >= v_invitation.max_uses THEN
        -- تحديث الحالة إلى مستخدمة
        UPDATE membership_invitations 
        SET status = 'used' 
        WHERE id = v_invitation.id;
        
        RETURN QUERY SELECT 
            FALSE, v_invitation.id, NULL::TEXT, NULL::INTEGER, NULL::INTEGER[], 
            NULL::TIMESTAMPTZ, 0, 'تم استخدام الدعوة بالكامل'::TEXT;
        RETURN;
    END IF;
    
    -- الدعوة صالحة
    RETURN QUERY SELECT 
        TRUE,
        v_invitation.id,
        v_invitation.committee_mode,
        v_invitation.selected_committee_id,
        v_invitation.selected_committee_ids,
        v_invitation.expires_at,
        (v_invitation.max_uses - v_invitation.current_uses),
        'الدعوة صالحة'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. دالة تسجيل استخدام الدعوة
CREATE OR REPLACE FUNCTION record_invitation_usage(
    p_invitation_id UUID,
    p_application_id UUID,
    p_email TEXT,
    p_name TEXT,
    p_committee_id INTEGER,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_max_uses INT;
    v_current_uses INT;
BEGIN
    -- جلب معلومات الدعوة
    SELECT max_uses, current_uses INTO v_max_uses, v_current_uses
    FROM membership_invitations
    WHERE id = p_invitation_id AND status = 'active';
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- التحقق من عدم تجاوز الحد الأقصى
    IF v_current_uses >= v_max_uses THEN
        RETURN FALSE;
    END IF;
    
    -- تسجيل الاستخدام
    INSERT INTO invitation_usages (
        invitation_id, application_id, applicant_email, applicant_name,
        selected_committee_id, ip_address, user_agent
    ) VALUES (
        p_invitation_id, p_application_id, p_email, p_name,
        p_committee_id, p_ip_address, p_user_agent
    );
    
    -- زيادة عداد الاستخدامات
    UPDATE membership_invitations
    SET current_uses = current_uses + 1,
        status = CASE 
            WHEN current_uses + 1 >= max_uses THEN 'used'
            ELSE 'active'
        END
    WHERE id = p_invitation_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. دالة أرشفة دعوة واحدة (أرشفة مستقلة)
CREATE OR REPLACE FUNCTION archive_single_invitation(p_invitation_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_invitation RECORD;
    v_usage_count INT;
    v_usages JSONB;
    v_archived_id UUID;
BEGIN
    -- جلب بيانات الدعوة
    SELECT * INTO v_invitation
    FROM membership_invitations
    WHERE id = p_invitation_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'الدعوة غير موجودة');
    END IF;
    
    -- التحقق من عدم الأرشفة المسبقة
    IF v_invitation.archived_at IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'الدعوة مؤرشفة مسبقاً');
    END IF;
    
    -- جلب إحصائيات الاستخدام
    SELECT COUNT(*), jsonb_agg(jsonb_build_object(
        'used_at', used_at,
        'email', applicant_email,
        'name', applicant_name,
        'committee_id', selected_committee_id
    )) INTO v_usage_count, v_usages
    FROM invitation_usages
    WHERE invitation_id = p_invitation_id;
    
    -- إنشاء سجل الأرشيف
    INSERT INTO archived_membership_invitations (
        original_invitation_id, invitation_code, committee_mode,
        selected_committee_id, selected_committee_ids,
        max_uses, total_uses, created_at, expires_at,
        final_status, notes, usage_stats, archived_by
    ) VALUES (
        v_invitation.id, v_invitation.invitation_code, v_invitation.committee_mode,
        v_invitation.selected_committee_id, v_invitation.selected_committee_ids,
        v_invitation.max_uses, COALESCE(v_usage_count, 0),
        v_invitation.created_at, v_invitation.expires_at,
        v_invitation.status, v_invitation.notes, v_usages,
        auth.uid()
    ) RETURNING id INTO v_archived_id;
    
    -- تحديث الدعوة الأصلية
    UPDATE membership_invitations
    SET archived_at = NOW(),
        status = 'expired'
    WHERE id = p_invitation_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'تم أرشفة الدعوة بنجاح',
        'archived_id', v_archived_id,
        'total_uses', COALESCE(v_usage_count, 0)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. دالة أرشفة الدعوات تلقائياً مع دورة التسجيل
CREATE OR REPLACE FUNCTION archive_invitations_with_cycle(
    p_cycle_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS INT AS $$
DECLARE
    v_count INT := 0;
    v_invitation RECORD;
BEGIN
    -- أرشفة جميع الدعوات التي تم استخدامها في هذه الفترة
    FOR v_invitation IN
        SELECT DISTINCT i.*
        FROM membership_invitations i
        JOIN invitation_usages iu ON iu.invitation_id = i.id
        WHERE iu.used_at BETWEEN p_start_date AND p_end_date
        AND i.archived_at IS NULL
    LOOP
        -- أرشفة الدعوة وربطها بالدورة
        INSERT INTO archived_membership_invitations (
            original_invitation_id, invitation_code, committee_mode,
            selected_committee_id, selected_committee_ids,
            max_uses, total_uses, created_at, expires_at,
            final_status, notes, archived_with_cycle_id, archived_by,
            usage_stats
        )
        SELECT 
            v_invitation.id, v_invitation.invitation_code, v_invitation.committee_mode,
            v_invitation.selected_committee_id, v_invitation.selected_committee_ids,
            v_invitation.max_uses, v_invitation.current_uses,
            v_invitation.created_at, v_invitation.expires_at,
            v_invitation.status, v_invitation.notes, p_cycle_id, auth.uid(),
            (
                SELECT jsonb_agg(jsonb_build_object(
                    'used_at', used_at,
                    'email', applicant_email,
                    'name', applicant_name,
                    'committee_id', selected_committee_id
                ))
                FROM invitation_usages
                WHERE invitation_id = v_invitation.id
            );
        
        -- تحديث الدعوة الأصلية
        UPDATE membership_invitations
        SET archived_at = NOW(),
            archived_with_cycle_id = p_cycle_id
        WHERE id = v_invitation.id;
        
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. تحديث دالة الأرشفة الرئيسية لتشمل الدعوات
CREATE OR REPLACE FUNCTION archive_membership_cycle(
    p_cycle_name TEXT,
    p_cycle_year INT,
    p_cycle_season TEXT,
    p_description TEXT DEFAULT NULL,
    p_archived_by UUID DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    cycle_id UUID,
    stats JSONB
) AS $$
DECLARE
    v_cycle_id UUID;
    v_applications_count INT;
    v_interviews_count INT;
    v_sessions_count INT;
    v_slots_count INT;
    v_invitations_count INT;
    v_start_date TIMESTAMPTZ;
    v_end_date TIMESTAMPTZ;
BEGIN
    -- تحديد نطاق التواريخ (آخر 6 أشهر)
    v_end_date := NOW();
    v_start_date := v_end_date - INTERVAL '6 months';
    
    -- إنشاء سجل الدورة
    INSERT INTO archived_membership_cycles (
        cycle_name, cycle_year, cycle_season, description, archived_by
    ) VALUES (
        p_cycle_name, p_cycle_year, p_cycle_season, 
        COALESCE(p_description, 'أرشفة تلقائية'), 
        COALESCE(p_archived_by, auth.uid())
    ) RETURNING id INTO v_cycle_id;
    
    -- أرشفة الطلبات
    INSERT INTO archived_membership_applications
    SELECT gen_random_uuid(), a.*, v_cycle_id, NOW()
    FROM membership_applications a;
    
    GET DIAGNOSTICS v_applications_count = ROW_COUNT;
    
    -- أرشفة المقابلات
    INSERT INTO archived_membership_interviews
    SELECT gen_random_uuid(), i.*, v_cycle_id, NOW()
    FROM membership_interviews i;
    
    GET DIAGNOSTICS v_interviews_count = ROW_COUNT;
    
    -- أرشفة الجلسات
    INSERT INTO archived_interview_sessions
    SELECT gen_random_uuid(), s.*, v_cycle_id, NOW()
    FROM interview_sessions s;
    
    GET DIAGNOSTICS v_sessions_count = ROW_COUNT;
    
    -- أرشفة الفترات
    INSERT INTO archived_interview_slots
    SELECT gen_random_uuid(), sl.*, v_cycle_id, NOW()
    FROM interview_slots sl;
    
    GET DIAGNOSTICS v_slots_count = ROW_COUNT;
    
    -- أرشفة الدعوات المستخدمة في هذه الفترة
    v_invitations_count := archive_invitations_with_cycle(v_cycle_id, v_start_date, v_end_date);
    
    -- حذف البيانات الأصلية
    DELETE FROM interview_slots;
    DELETE FROM membership_interviews;
    DELETE FROM interview_sessions;
    DELETE FROM membership_applications;
    
    -- تحديث إحصائيات الدورة
    UPDATE archived_membership_cycles
    SET 
        total_applications = v_applications_count,
        total_interviews = v_interviews_count,
        total_sessions = v_sessions_count
    WHERE id = v_cycle_id;
    
    RETURN QUERY SELECT 
        TRUE,
        format('تم أرشفة %s طلب، %s مقابلة، %s جلسة، %s فترة، %s دعوة',
            v_applications_count, v_interviews_count, v_sessions_count, 
            v_slots_count, v_invitations_count),
        v_cycle_id,
        jsonb_build_object(
            'applications', v_applications_count,
            'interviews', v_interviews_count,
            'sessions', v_sessions_count,
            'slots', v_slots_count,
            'invitations', v_invitations_count
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

-- 10. تفعيل RLS
ALTER TABLE membership_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_membership_invitations ENABLE ROW LEVEL SECURITY;

-- 11. سياسات القراءة (المستوى 7+)
CREATE POLICY "Admins can view invitations"
    ON membership_invitations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 7
        )
    );

CREATE POLICY "Admins can view invitation usages"
    ON invitation_usages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 7
        )
    );

CREATE POLICY "Admins can view archived invitations"
    ON archived_membership_invitations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 7
        )
    );

-- 12. سياسات الإدراج (المستوى 7+)
CREATE POLICY "Admins can create invitations"
    ON membership_invitations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 7
        )
    );

-- 13. سياسات التحديث (المستوى 7+)
CREATE POLICY "Admins can update invitations"
    ON membership_invitations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 7
        )
    );

-- 14. سياسات الحذف (المستوى 10+)
CREATE POLICY "Super admins can delete invitations"
    ON membership_invitations FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 10
        )
    );

CREATE POLICY "Super admins can delete archived invitations"
    ON archived_membership_invitations FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 10
        )
    );

-- =====================================================
-- تنظيف تلقائي للدعوات المنتهية
-- =====================================================

-- 15. دالة تنظيف الدعوات المنتهية
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INT AS $$
DECLARE
    v_count INT;
BEGIN
    UPDATE membership_invitations
    SET status = 'expired'
    WHERE status = 'active'
    AND expires_at <= NOW();
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- يمكن جدولة هذه الدالة للتشغيل التلقائي باستخدام pg_cron أو من خلال cron job خارجي

COMMENT ON TABLE membership_invitations IS 'نظام دعوات التسجيل - كل دعوة تُأرشف بشكل مستقل';
COMMENT ON TABLE invitation_usages IS 'سجل استخدامات الدعوات لتتبع كل استخدام';
COMMENT ON TABLE archived_membership_invitations IS 'أرشيف الدعوات - كل دعوة تُأرشف مستقلة عن الأخرى';
