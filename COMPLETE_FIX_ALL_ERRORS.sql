-- =====================================================
-- إصلاح شامل لجميع الأخطاء
-- =====================================================
-- تاريخ: 2026-01-28
-- الوصف: حل جميع المشاكل دفعة واحدة
-- =====================================================

-- ==========================================
-- 1. إضافة عمود notes إلى membership_interviews
-- ==========================================
ALTER TABLE membership_interviews 
ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN membership_interviews.notes IS 'ملاحظات إدارية وأسباب الرفض أو القبول';

UPDATE membership_interviews 
SET notes = result_notes 
WHERE notes IS NULL AND result_notes IS NOT NULL;

-- ==========================================
-- 2. جعل interview_date قابل للقيم الفارغة
-- ==========================================
ALTER TABLE membership_interviews 
ALTER COLUMN interview_date DROP NOT NULL;

COMMENT ON COLUMN membership_interviews.interview_date IS 'تاريخ المقابلة - قابل للقيم الفارغة في حالة الرفض المباشر من البرزخ';

-- ==========================================
-- 3. إصلاح سياسات RLS لـ membership_interviews
-- ==========================================

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "allow_admin_select_interviews" ON membership_interviews;
DROP POLICY IF EXISTS "allow_admin_insert_interviews" ON membership_interviews;
DROP POLICY IF EXISTS "allow_admin_update_interviews" ON membership_interviews;
DROP POLICY IF EXISTS "allow_superadmin_delete_interviews" ON membership_interviews;

-- إنشاء سياسات جديدة بدون check_permission()

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

-- ==========================================
-- ملاحظة: تم إزالة جدول projects حسب طلب المستخدم
-- ==========================================

-- ==========================================
-- تم الانتهاء من جميع الإصلاحات
-- ==========================================

-- للتحقق من نجاح التطبيق:
SELECT 
    'notes column exists' as check_name,
    EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'membership_interviews' 
        AND column_name = 'notes'
    ) as result
UNION ALL
SELECT 
    'interview_date is nullable' as check_name,
    EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'membership_interviews' 
        AND column_name = 'interview_date'
        AND is_nullable = 'YES'
    ) as result
UNION ALL
SELECT 
    'RLS policies count' as check_name,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'membership_interviews') = 4 as result;
