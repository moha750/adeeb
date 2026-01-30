-- Migration: تحديث نظام الأدوار وإضافة جدول بيانات الأعضاء التفصيلية
-- تاريخ الإنشاء: 2026-01-29
-- الوصف: 
-- 1. حذف دور "عضو عادي" (regular_member) من النظام
-- 2. إنشاء جدول member_details لتخزين البيانات التفصيلية للأعضاء
-- 3. إضافة جدول member_onboarding_tokens لإدارة روابط تعبئة البيانات

-- ============================================
-- الجزء 1: حذف دور "عضو عادي"
-- ============================================

-- حذف الصلاحيات المرتبطة بدور "عضو عادي"
DELETE FROM role_permissions WHERE role_id = 10;

-- حذف السجلات من permissions_audit_log
DELETE FROM permissions_audit_log WHERE role_id = 10;

-- تحديث user_roles: تحويل جميع "عضو عادي" إلى "عضو لجنة" (role_id: 9)
UPDATE user_roles 
SET role_id = 9, 
    notes = COALESCE(notes || ' | ', '') || 'تم التحويل تلقائياً من عضو عادي إلى عضو لجنة'
WHERE role_id = 10;

-- حذف دور "عضو عادي" من جدول roles
DELETE FROM roles WHERE id = 10;

-- ============================================
-- الجزء 2: إنشاء جدول بيانات الأعضاء التفصيلية
-- ============================================

CREATE TABLE IF NOT EXISTS member_details (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    -- البيانات الشخصية الأساسية
    full_name_triple text NOT NULL,
    phone text NOT NULL,
    national_id text NOT NULL UNIQUE,
    academic_record_number text NOT NULL UNIQUE,
    email text NOT NULL,
    birth_date date NOT NULL,
    
    -- البيانات الأكاديمية
    academic_degree text NOT NULL CHECK (academic_degree IN (
        'high_school', 'diploma', 'bachelor', 'master', 'phd', 'other'
    )),
    college text,
    major text,
    
    -- اللجنة
    committee_id integer REFERENCES committees(id) ON DELETE SET NULL,
    
    -- حسابات التواصل الاجتماعي (اختيارية)
    twitter_account text,
    instagram_account text,
    tiktok_account text,
    linkedin_account text,
    
    -- حالة اكتمال البيانات
    is_complete boolean DEFAULT false,
    completed_at timestamptz,
    
    -- التواريخ
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- ملاحظات
    notes text
);

-- إضافة فهارس
CREATE INDEX idx_member_details_user_id ON member_details(user_id);
CREATE INDEX idx_member_details_national_id ON member_details(national_id);
CREATE INDEX idx_member_details_committee_id ON member_details(committee_id);
CREATE INDEX idx_member_details_is_complete ON member_details(is_complete) WHERE is_complete = false;

-- إضافة تعليقات
COMMENT ON TABLE member_details IS 'بيانات الأعضاء التفصيلية الإلزامية';
COMMENT ON COLUMN member_details.full_name_triple IS 'الاسم الثلاثي الكامل';
COMMENT ON COLUMN member_details.national_id IS 'رقم الهوية الوطنية';
COMMENT ON COLUMN member_details.academic_record_number IS 'رقم السجل الأكاديمي';
COMMENT ON COLUMN member_details.academic_degree IS 'الدرجة العلمية: high_school, diploma, bachelor, master, phd, other';
COMMENT ON COLUMN member_details.is_complete IS 'هل تم إكمال جميع البيانات المطلوبة';

-- ============================================
-- الجزء 3: جدول tokens لروابط تعبئة البيانات
-- ============================================

CREATE TABLE IF NOT EXISTS member_onboarding_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token text NOT NULL UNIQUE,
    
    -- معلومات الترحيل
    interview_id uuid REFERENCES membership_interviews(id) ON DELETE SET NULL,
    application_id uuid REFERENCES membership_applications(id) ON DELETE SET NULL,
    
    -- حالة الرابط
    is_used boolean DEFAULT false,
    used_at timestamptz,
    expires_at timestamptz NOT NULL,
    
    -- البيانات المرسلة
    sent_to_email text NOT NULL,
    email_sent_at timestamptz DEFAULT now(),
    
    -- التواريخ
    created_at timestamptz DEFAULT now(),
    
    CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- إضافة فهارس
CREATE INDEX idx_onboarding_tokens_user_id ON member_onboarding_tokens(user_id);
CREATE INDEX idx_onboarding_tokens_token ON member_onboarding_tokens(token);
CREATE INDEX idx_onboarding_tokens_is_used ON member_onboarding_tokens(is_used) WHERE is_used = false;
CREATE INDEX idx_onboarding_tokens_expires_at ON member_onboarding_tokens(expires_at);

-- إضافة تعليقات
COMMENT ON TABLE member_onboarding_tokens IS 'روابط تعبئة البيانات للأعضاء الجدد';
COMMENT ON COLUMN member_onboarding_tokens.token IS 'الرمز الفريد للرابط';
COMMENT ON COLUMN member_onboarding_tokens.expires_at IS 'تاريخ انتهاء صلاحية الرابط';

-- ============================================
-- الجزء 4: RLS Policies
-- ============================================

-- تفعيل RLS
ALTER TABLE member_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_onboarding_tokens ENABLE ROW LEVEL SECURITY;

-- سياسات member_details
CREATE POLICY "المستخدمون يمكنهم قراءة بياناتهم الخاصة"
    ON member_details FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "المستخدمون يمكنهم تحديث بياناتهم الخاصة"
    ON member_details FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "المستخدمون يمكنهم إنشاء بياناتهم الخاصة"
    ON member_details FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "المسؤولون يمكنهم قراءة جميع البيانات"
    ON member_details FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND ur.is_active = true
            AND r.role_level >= 7
        )
    );

-- سياسات member_onboarding_tokens
CREATE POLICY "المستخدمون يمكنهم قراءة tokens الخاصة بهم"
    ON member_onboarding_tokens FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "المسؤولون يمكنهم إدارة جميع tokens"
    ON member_onboarding_tokens FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND ur.is_active = true
            AND r.role_level >= 7
        )
    );

-- ============================================
-- الجزء 5: Triggers
-- ============================================

-- Trigger لتحديث updated_at في member_details
CREATE OR REPLACE FUNCTION update_member_details_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_member_details_updated_at
    BEFORE UPDATE ON member_details
    FOR EACH ROW
    EXECUTE FUNCTION update_member_details_updated_at();

-- Trigger لتحديث is_complete تلقائياً
CREATE OR REPLACE FUNCTION check_member_details_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- التحقق من اكتمال البيانات الإلزامية
    IF NEW.full_name_triple IS NOT NULL 
       AND NEW.phone IS NOT NULL 
       AND NEW.national_id IS NOT NULL 
       AND NEW.academic_record_number IS NOT NULL 
       AND NEW.email IS NOT NULL 
       AND NEW.birth_date IS NOT NULL 
       AND NEW.academic_degree IS NOT NULL 
       AND NEW.committee_id IS NOT NULL
       AND (
           NEW.academic_degree = 'high_school' 
           OR (NEW.college IS NOT NULL AND NEW.major IS NOT NULL)
       )
    THEN
        NEW.is_complete = true;
        IF NEW.completed_at IS NULL THEN
            NEW.completed_at = now();
        END IF;
    ELSE
        NEW.is_complete = false;
        NEW.completed_at = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_member_details_completion
    BEFORE INSERT OR UPDATE ON member_details
    FOR EACH ROW
    EXECUTE FUNCTION check_member_details_completion();
