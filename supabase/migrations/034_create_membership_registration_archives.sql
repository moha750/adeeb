-- إنشاء جدول أرشيف فترات فتح التسجيل
-- يتم إنشاء سجل جديد تلقائياً عند إغلاق باب التسجيل

CREATE TABLE IF NOT EXISTS membership_registration_archives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    archive_name TEXT NOT NULL,
    opened_at TIMESTAMPTZ NOT NULL,
    closed_at TIMESTAMPTZ NOT NULL,
    total_applications INTEGER DEFAULT 0,
    new_applications INTEGER DEFAULT 0,
    under_review_applications INTEGER DEFAULT 0,
    accepted_applications INTEGER DEFAULT 0,
    rejected_applications INTEGER DEFAULT 0,
    archived_applications INTEGER DEFAULT 0,
    committees_data JSONB,
    settings_snapshot JSONB,
    statistics JSONB,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_membership_archives_opened_at ON membership_registration_archives(opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_membership_archives_closed_at ON membership_registration_archives(closed_at DESC);
CREATE INDEX IF NOT EXISTS idx_membership_archives_created_at ON membership_registration_archives(created_at DESC);

-- تفعيل RLS
ALTER TABLE membership_registration_archives ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة للمستخدمين المصادقين
CREATE POLICY "allow_authenticated_select_membership_archives"
ON membership_registration_archives
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

-- سياسة الإدراج (للنظام فقط - مستوى 8+)
CREATE POLICY "allow_admin_insert_membership_archives"
ON membership_registration_archives
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
    OR check_permission(auth.uid(), 'membership.settings')
);

-- سياسة التحديث (للنظام فقط - مستوى 8+)
CREATE POLICY "allow_admin_update_membership_archives"
ON membership_registration_archives
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
    OR check_permission(auth.uid(), 'membership.settings')
);

-- سياسة الحذف (مستوى 10 فقط)
CREATE POLICY "allow_superadmin_delete_membership_archives"
ON membership_registration_archives
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

-- دالة لإنشاء أرشيف تلقائياً عند إغلاق التسجيل
CREATE OR REPLACE FUNCTION create_membership_archive()
RETURNS UUID AS $$
DECLARE
    v_archive_id UUID;
    v_opened_at TIMESTAMPTZ;
    v_closed_at TIMESTAMPTZ;
    v_total INTEGER;
    v_new INTEGER;
    v_under_review INTEGER;
    v_accepted INTEGER;
    v_rejected INTEGER;
    v_archived INTEGER;
    v_committees_data JSONB;
    v_settings JSONB;
    v_statistics JSONB;
BEGIN
    -- الحصول على تاريخ آخر أرشيف أو تاريخ إنشاء أول طلب
    SELECT COALESCE(
        (SELECT closed_at FROM membership_registration_archives ORDER BY closed_at DESC LIMIT 1),
        (SELECT MIN(created_at) FROM membership_applications)
    ) INTO v_opened_at;
    
    v_closed_at := NOW();
    
    -- حساب الإحصائيات
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'new'),
        COUNT(*) FILTER (WHERE status = 'under_review'),
        COUNT(*) FILTER (WHERE status = 'accepted'),
        COUNT(*) FILTER (WHERE status = 'rejected'),
        COUNT(*) FILTER (WHERE status = 'archived')
    INTO v_total, v_new, v_under_review, v_accepted, v_rejected, v_archived
    FROM membership_applications
    WHERE created_at >= v_opened_at AND created_at <= v_closed_at;
    
    -- جمع بيانات اللجان
    SELECT jsonb_agg(
        jsonb_build_object(
            'committee_name', c.committee_name_ar,
            'total_applications', COUNT(ma.id),
            'accepted', COUNT(*) FILTER (WHERE ma.status = 'accepted'),
            'rejected', COUNT(*) FILTER (WHERE ma.status = 'rejected'),
            'pending', COUNT(*) FILTER (WHERE ma.status IN ('new', 'under_review'))
        )
    )
    INTO v_committees_data
    FROM committees c
    LEFT JOIN membership_applications ma ON ma.preferred_committee = c.committee_name_ar
        AND ma.created_at >= v_opened_at AND ma.created_at <= v_closed_at
    GROUP BY c.committee_name_ar;
    
    -- نسخة من الإعدادات الحالية
    SELECT jsonb_build_object(
        'join_open', join_open,
        'join_membership_countdown', join_membership_countdown,
        'join_schedule_enabled', join_schedule_enabled,
        'join_schedule_mode', join_schedule_mode,
        'join_schedule_open_at', join_schedule_open_at,
        'join_schedule_close_at', join_schedule_close_at
    )
    INTO v_settings
    FROM membership_settings
    WHERE id = 'default';
    
    -- إحصائيات إضافية
    SELECT jsonb_build_object(
        'average_applications_per_day', ROUND((v_total::numeric / GREATEST(EXTRACT(DAY FROM (v_closed_at - v_opened_at)), 1)), 2),
        'acceptance_rate', CASE WHEN v_total > 0 THEN ROUND((v_accepted::numeric / v_total * 100), 2) ELSE 0 END,
        'rejection_rate', CASE WHEN v_total > 0 THEN ROUND((v_rejected::numeric / v_total * 100), 2) ELSE 0 END,
        'duration_days', EXTRACT(DAY FROM (v_closed_at - v_opened_at))
    )
    INTO v_statistics;
    
    -- إنشاء الأرشيف
    INSERT INTO membership_registration_archives (
        archive_name,
        opened_at,
        closed_at,
        total_applications,
        new_applications,
        under_review_applications,
        accepted_applications,
        rejected_applications,
        archived_applications,
        committees_data,
        settings_snapshot,
        statistics,
        created_by
    ) VALUES (
        'أرشيف التسجيل ' || TO_CHAR(v_opened_at, 'YYYY-MM-DD') || ' - ' || TO_CHAR(v_closed_at, 'YYYY-MM-DD'),
        v_opened_at,
        v_closed_at,
        v_total,
        v_new,
        v_under_review,
        v_accepted,
        v_rejected,
        v_archived,
        v_committees_data,
        v_settings,
        v_statistics,
        auth.uid()
    )
    RETURNING id INTO v_archive_id;
    
    RETURN v_archive_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_membership_archives_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_membership_archives_updated_at
    BEFORE UPDATE ON membership_registration_archives
    FOR EACH ROW
    EXECUTE FUNCTION update_membership_archives_updated_at();

-- تعليقات توضيحية
COMMENT ON TABLE membership_registration_archives IS 'أرشيف فترات فتح التسجيل مع جميع الإحصائيات والبيانات';
COMMENT ON COLUMN membership_registration_archives.archive_name IS 'اسم الأرشيف التلقائي';
COMMENT ON COLUMN membership_registration_archives.opened_at IS 'تاريخ فتح باب التسجيل';
COMMENT ON COLUMN membership_registration_archives.closed_at IS 'تاريخ إغلاق باب التسجيل';
COMMENT ON COLUMN membership_registration_archives.committees_data IS 'بيانات اللجان والطلبات لكل لجنة بصيغة JSON';
COMMENT ON COLUMN membership_registration_archives.settings_snapshot IS 'نسخة من إعدادات التسجيل وقت الإغلاق';
COMMENT ON COLUMN membership_registration_archives.statistics IS 'إحصائيات إضافية (معدلات القبول، المدة، إلخ)';
COMMENT ON FUNCTION create_membership_archive() IS 'إنشاء أرشيف تلقائي لفترة التسجيل الحالية';
