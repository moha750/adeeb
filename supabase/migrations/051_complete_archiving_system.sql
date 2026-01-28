-- =====================================================
-- نظام الأرشفة الكامل للعضوية
-- =====================================================
-- هذا النظام يستبدل النظام القديم (050) بنظام أرشفة كامل
-- يقوم بنقل جميع البيانات إلى جداول أرشيف منفصلة وحذفها من الجداول الرئيسية

-- =====================================================
-- 1. جدول الدورات (محسّن)
-- =====================================================

CREATE TABLE IF NOT EXISTS membership_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_name TEXT NOT NULL,
    cycle_year INTEGER NOT NULL,
    cycle_season TEXT CHECK (cycle_season IN ('spring', 'summer', 'fall', 'winter')),
    description TEXT,
    
    -- التواريخ
    registration_opened_at TIMESTAMPTZ,
    registration_closed_at TIMESTAMPTZ,
    review_completed_at TIMESTAMPTZ,
    interviews_completed_at TIMESTAMPTZ,
    final_decisions_at TIMESTAMPTZ,
    
    -- الإحصائيات الإجمالية
    total_applications INTEGER DEFAULT 0,
    pending_review INTEGER DEFAULT 0,
    approved_for_interview INTEGER DEFAULT 0,
    rejected_in_review INTEGER DEFAULT 0,
    interviewed_count INTEGER DEFAULT 0,
    accepted_count INTEGER DEFAULT 0,
    rejected_count INTEGER DEFAULT 0,
    withdrawn_count INTEGER DEFAULT 0,
    
    -- إحصائيات تفصيلية (JSONB للمرونة)
    detailed_stats JSONB DEFAULT '{}'::jsonb,
    
    -- معلومات الأرشفة
    status TEXT DEFAULT 'archived' CHECK (status IN ('active', 'archived')),
    archived_at TIMESTAMPTZ DEFAULT NOW(),
    archived_by UUID REFERENCES auth.users(id),
    
    -- التتبع
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- فهرس للبحث السريع
    CONSTRAINT unique_cycle_name UNIQUE (cycle_name)
);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_cycles_year_season ON membership_cycles(cycle_year, cycle_season);
CREATE INDEX IF NOT EXISTS idx_cycles_status ON membership_cycles(status);
CREATE INDEX IF NOT EXISTS idx_cycles_archived_at ON membership_cycles(archived_at DESC);

-- =====================================================
-- 2. جدول أرشيف الطلبات
-- =====================================================

CREATE TABLE IF NOT EXISTS membership_applications_archive (
    id UUID PRIMARY KEY,
    cycle_id UUID NOT NULL REFERENCES membership_cycles(id) ON DELETE CASCADE,
    
    -- معلومات المتقدم
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    birth_date DATE,
    gender TEXT,
    national_id TEXT,
    city TEXT,
    
    -- المعلومات الأكاديمية
    university TEXT,
    major TEXT,
    academic_year TEXT,
    gpa NUMERIC(3,2),
    
    -- معلومات التسجيل
    preferred_committee UUID,
    motivation TEXT,
    skills TEXT[],
    previous_experience TEXT,
    
    -- الحالة والقرارات
    status TEXT NOT NULL,
    review_status TEXT,
    review_notes TEXT,
    admin_notes TEXT,
    
    -- قرارات المراجعة
    approved_for_interview BOOLEAN DEFAULT FALSE,
    approved_for_interview_at TIMESTAMPTZ,
    approved_for_interview_by UUID,
    rejected_in_review BOOLEAN DEFAULT FALSE,
    rejected_in_review_at TIMESTAMPTZ,
    rejected_in_review_by UUID,
    rejection_reason TEXT,
    
    -- التواريخ
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- بيانات إضافية مرنة
    additional_data JSONB DEFAULT '{}'::jsonb
);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_apps_archive_cycle ON membership_applications_archive(cycle_id);
CREATE INDEX IF NOT EXISTS idx_apps_archive_status ON membership_applications_archive(cycle_id, status);
CREATE INDEX IF NOT EXISTS idx_apps_archive_email ON membership_applications_archive(email);

-- =====================================================
-- 3. جدول أرشيف المقابلات
-- =====================================================

CREATE TABLE IF NOT EXISTS membership_interviews_archive (
    id UUID PRIMARY KEY,
    cycle_id UUID NOT NULL REFERENCES membership_cycles(id) ON DELETE CASCADE,
    application_id UUID NOT NULL,
    session_id UUID,
    
    -- معلومات المقابلة
    interview_date TIMESTAMPTZ,
    interviewer_id UUID,
    interviewer_name TEXT,
    
    -- الحالة والنتيجة
    status TEXT NOT NULL,
    result TEXT,
    result_notes TEXT,
    notes TEXT,
    
    -- التقييم
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    evaluation JSONB DEFAULT '{}'::jsonb,
    
    -- معلومات الحجز
    slot_id UUID,
    booking_confirmed BOOLEAN DEFAULT FALSE,
    
    -- رفض من البرزخ
    rejected_from_barzakh BOOLEAN DEFAULT FALSE,
    rejected_from_barzakh_at TIMESTAMPTZ,
    rejected_from_barzakh_by UUID,
    barzakh_rejection_reason TEXT,
    
    -- التواريخ
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- بيانات إضافية
    additional_data JSONB DEFAULT '{}'::jsonb
);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_interviews_archive_cycle ON membership_interviews_archive(cycle_id);
CREATE INDEX IF NOT EXISTS idx_interviews_archive_app ON membership_interviews_archive(application_id);
CREATE INDEX IF NOT EXISTS idx_interviews_archive_status ON membership_interviews_archive(cycle_id, status);
CREATE INDEX IF NOT EXISTS idx_interviews_archive_result ON membership_interviews_archive(cycle_id, result);

-- =====================================================
-- 4. جدول أرشيف جلسات المقابلات
-- =====================================================

CREATE TABLE IF NOT EXISTS interview_sessions_archive (
    id UUID PRIMARY KEY,
    cycle_id UUID NOT NULL REFERENCES membership_cycles(id) ON DELETE CASCADE,
    
    -- معلومات الجلسة
    session_name TEXT NOT NULL,
    session_date DATE NOT NULL,
    location TEXT,
    description TEXT,
    
    -- الحالة
    status TEXT DEFAULT 'scheduled',
    is_active BOOLEAN DEFAULT TRUE,
    
    -- الإحصائيات
    total_slots INTEGER DEFAULT 0,
    booked_slots INTEGER DEFAULT 0,
    completed_interviews INTEGER DEFAULT 0,
    
    -- المنظم
    created_by UUID,
    created_by_name TEXT,
    
    -- التواريخ
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- بيانات إضافية
    additional_data JSONB DEFAULT '{}'::jsonb
);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_sessions_archive_cycle ON interview_sessions_archive(cycle_id);
CREATE INDEX IF NOT EXISTS idx_sessions_archive_date ON interview_sessions_archive(cycle_id, session_date);

-- =====================================================
-- 5. جدول أرشيف فترات المقابلات
-- =====================================================

CREATE TABLE IF NOT EXISTS interview_slots_archive (
    id UUID PRIMARY KEY,
    cycle_id UUID NOT NULL REFERENCES membership_cycles(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    
    -- معلومات الفترة
    slot_time TIME NOT NULL,
    interviewer_id UUID,
    interviewer_name TEXT,
    
    -- الحالة
    is_booked BOOLEAN DEFAULT FALSE,
    application_id UUID,
    
    -- التواريخ
    created_at TIMESTAMPTZ NOT NULL,
    archived_at TIMESTAMPTZ DEFAULT NOW()
);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_slots_archive_cycle ON interview_slots_archive(cycle_id);
CREATE INDEX IF NOT EXISTS idx_slots_archive_session ON interview_slots_archive(session_id);

-- =====================================================
-- 6. دالة الأرشفة الكاملة
-- =====================================================

CREATE OR REPLACE FUNCTION archive_membership_cycle(
    p_cycle_name TEXT,
    p_cycle_year INTEGER,
    p_cycle_season TEXT,
    p_description TEXT,
    p_archived_by UUID
)
RETURNS TABLE(
    cycle_id UUID,
    success BOOLEAN,
    message TEXT,
    stats JSONB
) AS $$
DECLARE
    v_cycle_id UUID;
    v_apps_count INTEGER;
    v_interviews_count INTEGER;
    v_sessions_count INTEGER;
    v_slots_count INTEGER;
    
    -- إحصائيات تفصيلية
    v_pending_count INTEGER;
    v_approved_interview_count INTEGER;
    v_rejected_review_count INTEGER;
    v_interviewed_count INTEGER;
    v_accepted_count INTEGER;
    v_rejected_count INTEGER;
    v_withdrawn_count INTEGER;
    v_barzakh_count INTEGER;
    
    v_stats JSONB;
BEGIN
    -- التحقق من وجود بيانات للأرشفة
    SELECT COUNT(*) INTO v_apps_count FROM membership_applications;
    
    IF v_apps_count = 0 THEN
        RETURN QUERY SELECT 
            NULL::UUID,
            FALSE,
            'لا توجد بيانات للأرشفة'::TEXT,
            '{}'::JSONB;
        RETURN;
    END IF;
    
    -- 1. إنشاء سجل الدورة
    INSERT INTO membership_cycles (
        cycle_name,
        cycle_year,
        cycle_season,
        description,
        status,
        archived_at,
        archived_by
    ) VALUES (
        p_cycle_name,
        p_cycle_year,
        p_cycle_season,
        p_description,
        'archived',
        NOW(),
        p_archived_by
    )
    RETURNING id INTO v_cycle_id;
    
    -- 2. حساب الإحصائيات التفصيلية من الطلبات
    SELECT 
        COUNT(*) FILTER (WHERE status = 'pending'),
        COUNT(*) FILTER (WHERE approved_for_interview = TRUE),
        COUNT(*) FILTER (WHERE rejected_in_review = TRUE),
        COUNT(*) FILTER (WHERE status = 'withdrawn')
    INTO 
        v_pending_count,
        v_approved_interview_count,
        v_rejected_review_count,
        v_withdrawn_count
    FROM membership_applications;
    
    -- حساب المقابلات
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'completed'),
        COUNT(*) FILTER (WHERE result = 'accepted'),
        COUNT(*) FILTER (WHERE result = 'rejected')
    INTO 
        v_interviews_count,
        v_interviewed_count,
        v_accepted_count,
        v_rejected_count
    FROM membership_interviews;
    
    -- حساب البرزخ (المقبولين للمقابلة بدون مقابلة مجدولة)
    SELECT COUNT(*)
    INTO v_barzakh_count
    FROM membership_applications a
    WHERE a.approved_for_interview = TRUE
    AND NOT EXISTS (
        SELECT 1 FROM membership_interviews i 
        WHERE i.application_id = a.id 
        AND i.status IN ('scheduled', 'completed')
    );
    
    -- 3. نقل الطلبات إلى الأرشيف
    INSERT INTO membership_applications_archive
    SELECT 
        id,
        v_cycle_id,
        full_name,
        email,
        phone,
        birth_date,
        gender,
        national_id,
        city,
        university,
        major,
        academic_year,
        gpa,
        preferred_committee,
        motivation,
        skills,
        previous_experience,
        status,
        review_status,
        review_notes,
        admin_notes,
        approved_for_interview,
        approved_for_interview_at,
        approved_for_interview_by,
        rejected_in_review,
        rejected_in_review_at,
        rejected_in_review_by,
        rejection_reason,
        created_at,
        updated_at,
        NOW()
    FROM membership_applications;
    
    -- 4. نقل المقابلات إلى الأرشيف
    INSERT INTO membership_interviews_archive
    SELECT 
        i.id,
        v_cycle_id,
        i.application_id,
        i.session_id,
        i.interview_date,
        i.interviewer_id,
        u.full_name,
        i.status,
        i.result,
        i.result_notes,
        i.notes,
        i.rating,
        i.evaluation,
        i.slot_id,
        i.booking_confirmed,
        i.rejected_from_barzakh,
        i.rejected_from_barzakh_at,
        i.rejected_from_barzakh_by,
        i.barzakh_rejection_reason,
        i.created_at,
        i.updated_at,
        NOW(),
        '{}'::jsonb
    FROM membership_interviews i
    LEFT JOIN auth.users u ON u.id = i.interviewer_id;
    
    -- 5. نقل جلسات المقابلات إلى الأرشيف
    INSERT INTO interview_sessions_archive
    SELECT 
        s.id,
        v_cycle_id,
        s.session_name,
        s.session_date,
        s.location,
        s.description,
        s.status,
        s.is_active,
        s.total_slots,
        s.booked_slots,
        s.completed_interviews,
        s.created_by,
        u.full_name,
        s.created_at,
        s.updated_at,
        NOW(),
        '{}'::jsonb
    FROM interview_sessions s
    LEFT JOIN auth.users u ON u.id = s.created_by;
    
    GET DIAGNOSTICS v_sessions_count = ROW_COUNT;
    
    -- 6. نقل فترات المقابلات إلى الأرشيف
    INSERT INTO interview_slots_archive
    SELECT 
        sl.id,
        v_cycle_id,
        sl.session_id,
        sl.slot_time,
        sl.interviewer_id,
        u.full_name,
        sl.is_booked,
        sl.application_id,
        sl.created_at,
        NOW()
    FROM interview_slots sl
    LEFT JOIN auth.users u ON u.id = sl.interviewer_id;
    
    GET DIAGNOSTICS v_slots_count = ROW_COUNT;
    
    -- 7. بناء الإحصائيات التفصيلية
    v_stats := jsonb_build_object(
        'registration', jsonb_build_object(
            'total_applications', v_apps_count,
            'pending_review', v_pending_count,
            'withdrawn', v_withdrawn_count
        ),
        'review', jsonb_build_object(
            'approved_for_interview', v_approved_interview_count,
            'rejected_in_review', v_rejected_review_count
        ),
        'interviews', jsonb_build_object(
            'total_interviews', v_interviews_count,
            'completed_interviews', v_interviewed_count,
            'in_barzakh', v_barzakh_count,
            'total_sessions', v_sessions_count,
            'total_slots', v_slots_count
        ),
        'results', jsonb_build_object(
            'accepted', v_accepted_count,
            'rejected', v_rejected_count
        )
    );
    
    -- 8. تحديث إحصائيات الدورة
    UPDATE membership_cycles
    SET 
        total_applications = v_apps_count,
        pending_review = v_pending_count,
        approved_for_interview = v_approved_interview_count,
        rejected_in_review = v_rejected_review_count,
        interviewed_count = v_interviewed_count,
        accepted_count = v_accepted_count,
        rejected_count = v_rejected_count,
        withdrawn_count = v_withdrawn_count,
        detailed_stats = v_stats,
        updated_at = NOW()
    WHERE id = v_cycle_id;
    
    -- 9. حذف البيانات من الجداول الرئيسية (بالترتيب الصحيح)
    DELETE FROM interview_slots;
    DELETE FROM membership_interviews;
    DELETE FROM interview_sessions;
    DELETE FROM membership_applications;
    
    -- 10. إرجاع النتيجة
    RETURN QUERY SELECT 
        v_cycle_id,
        TRUE,
        format('تمت الأرشفة بنجاح: %s طلب، %s مقابلة، %s جلسة', 
               v_apps_count, v_interviews_count, v_sessions_count)::TEXT,
        v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. دالة استرجاع تفاصيل دورة مؤرشفة
-- =====================================================

CREATE OR REPLACE FUNCTION get_archived_cycle_details(p_cycle_id UUID)
RETURNS TABLE(
    cycle_info JSONB,
    applications JSONB,
    interviews JSONB,
    sessions JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- معلومات الدورة
        to_jsonb(c.*) as cycle_info,
        
        -- الطلبات
        (SELECT jsonb_agg(to_jsonb(a.*))
         FROM membership_applications_archive a
         WHERE a.cycle_id = p_cycle_id) as applications,
        
        -- المقابلات
        (SELECT jsonb_agg(to_jsonb(i.*))
         FROM membership_interviews_archive i
         WHERE i.cycle_id = p_cycle_id) as interviews,
        
        -- الجلسات
        (SELECT jsonb_agg(to_jsonb(s.*))
         FROM interview_sessions_archive s
         WHERE s.cycle_id = p_cycle_id) as sessions
    FROM membership_cycles c
    WHERE c.id = p_cycle_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. دالة حذف دورة مؤرشفة (حذف نهائي)
-- =====================================================

CREATE OR REPLACE FUNCTION delete_archived_cycle(p_cycle_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- حذف الدورة (سيحذف تلقائياً جميع البيانات المرتبطة بسبب ON DELETE CASCADE)
    DELETE FROM membership_cycles WHERE id = p_cycle_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. سياسات RLS
-- =====================================================

-- تفعيل RLS على جميع الجداول
ALTER TABLE membership_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_applications_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_interviews_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_sessions_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_slots_archive ENABLE ROW LEVEL SECURITY;

-- سياسات القراءة (مستوى 7+)
CREATE POLICY "Allow read cycles for level 7+"
    ON membership_cycles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 7
        )
    );

CREATE POLICY "Allow read applications archive for level 7+"
    ON membership_applications_archive FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 7
        )
    );

CREATE POLICY "Allow read interviews archive for level 7+"
    ON membership_interviews_archive FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 7
        )
    );

CREATE POLICY "Allow read sessions archive for level 7+"
    ON interview_sessions_archive FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 7
        )
    );

CREATE POLICY "Allow read slots archive for level 7+"
    ON interview_slots_archive FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 7
        )
    );

-- سياسات الحذف (مستوى 10 فقط - رئيس النادي)
CREATE POLICY "Allow delete cycles for level 10"
    ON membership_cycles FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 10
        )
    );

-- =====================================================
-- 10. تعليقات توضيحية
-- =====================================================

COMMENT ON TABLE membership_cycles IS 'جدول الدورات المؤرشفة للعضوية';
COMMENT ON TABLE membership_applications_archive IS 'أرشيف طلبات العضوية';
COMMENT ON TABLE membership_interviews_archive IS 'أرشيف المقابلات';
COMMENT ON TABLE interview_sessions_archive IS 'أرشيف جلسات المقابلات';
COMMENT ON TABLE interview_slots_archive IS 'أرشيف فترات المقابلات';

COMMENT ON FUNCTION archive_membership_cycle IS 'دالة أرشفة دورة كاملة - تنقل جميع البيانات للأرشيف وتحذفها من الجداول الرئيسية';
COMMENT ON FUNCTION get_archived_cycle_details IS 'استرجاع تفاصيل دورة مؤرشفة كاملة';
COMMENT ON FUNCTION delete_archived_cycle IS 'حذف دورة مؤرشفة نهائياً (لا يمكن التراجع)';
