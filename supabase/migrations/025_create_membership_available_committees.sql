-- إنشاء جدول اللجان المتاحة للتسجيل في العضوية
-- هذا الجدول مستقل عن حالة اللجنة (نشطة/غير نشطة) في جدول committees

CREATE TABLE IF NOT EXISTS membership_available_committees (
    id SERIAL PRIMARY KEY,
    committee_id INTEGER NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    max_applicants INTEGER,
    current_applicants INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(committee_id)
);

-- إنشاء فهرس للأداء
CREATE INDEX IF NOT EXISTS idx_membership_available_committees_available 
ON membership_available_committees(is_available);

CREATE INDEX IF NOT EXISTS idx_membership_available_committees_order 
ON membership_available_committees(display_order);

-- تفعيل RLS
ALTER TABLE membership_available_committees ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة العامة (للزوار في صفحة التسجيل)
CREATE POLICY "allow_public_select_membership_available_committees"
ON membership_available_committees
FOR SELECT
TO public
USING (is_available = true);

-- سياسة القراءة للمستخدمين المصادقين (لوحة التحكم)
CREATE POLICY "allow_authenticated_select_all_membership_available_committees"
ON membership_available_committees
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
    OR check_permission(auth.uid(), 'membership.settings')
);

-- سياسة الإدراج
CREATE POLICY "allow_admin_insert_membership_available_committees"
ON membership_available_committees
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 7
    )
    OR check_permission(auth.uid(), 'membership.settings')
);

-- سياسة التحديث
CREATE POLICY "allow_admin_update_membership_available_committees"
ON membership_available_committees
FOR UPDATE
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
    OR check_permission(auth.uid(), 'membership.settings')
)
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 7
    )
    OR check_permission(auth.uid(), 'membership.settings')
);

-- سياسة الحذف
CREATE POLICY "allow_admin_delete_membership_available_committees"
ON membership_available_committees
FOR DELETE
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
    OR check_permission(auth.uid(), 'membership.delete')
);

-- دالة لتحديث عدد المتقدمين تلقائياً
CREATE OR REPLACE FUNCTION update_committee_applicants_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE membership_available_committees
        SET current_applicants = (
            SELECT COUNT(*)
            FROM membership_applications ma
            JOIN committees c ON ma.preferred_committee = c.committee_name_ar
            WHERE c.id = membership_available_committees.committee_id
        )
        WHERE committee_id IN (
            SELECT id FROM committees WHERE committee_name_ar = NEW.preferred_committee
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء Trigger لتحديث العدد عند إضافة طلب جديد
DROP TRIGGER IF EXISTS trigger_update_committee_applicants ON membership_applications;
CREATE TRIGGER trigger_update_committee_applicants
AFTER INSERT ON membership_applications
FOR EACH ROW
EXECUTE FUNCTION update_committee_applicants_count();

-- إضافة بيانات أولية (جميع اللجان الموجودة)
INSERT INTO membership_available_committees (committee_id, display_order, is_available)
SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY committee_name_ar),
    true
FROM committees
ON CONFLICT (committee_id) DO NOTHING;

-- تعليقات توضيحية
COMMENT ON TABLE membership_available_committees IS 'اللجان المتاحة للتسجيل في نموذج العضوية - مستقلة عن حالة اللجنة';
COMMENT ON COLUMN membership_available_committees.is_available IS 'هل اللجنة متاحة للتسجيل (مستقل عن is_active في جدول committees)';
COMMENT ON COLUMN membership_available_committees.display_order IS 'ترتيب ظهور اللجنة في القائمة';
COMMENT ON COLUMN membership_available_committees.max_applicants IS 'الحد الأقصى للمتقدمين (null = غير محدود)';
COMMENT ON COLUMN membership_available_committees.current_applicants IS 'عدد المتقدمين الحاليين';
