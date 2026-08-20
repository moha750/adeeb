-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260214151953   الاسم: fix_elections_rls_and_add_president_advisor


-- 1. إصلاح سياسة RLS للانتخابات - السماح بتحديث status إلى cancelled
DROP POLICY IF EXISTS elections_update_admins ON elections;

CREATE POLICY elections_update_admins ON elections
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_level >= 6
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_level >= 6
    )
);

-- 2. إضافة منصب مستشار رئيس النادي
INSERT INTO roles (role_name, role_name_ar, role_level, role_category, description)
VALUES (
    'president_advisor',
    'مستشار رئيس النادي',
    9,
    'supreme_council',
    'مستشار لرئيس النادي، يحمل أغلب صلاحيات الرئيس لكنه أقل مرتبة منه'
)
ON CONFLICT (role_name) DO UPDATE SET
    role_name_ar = EXCLUDED.role_name_ar,
    role_level = EXCLUDED.role_level,
    role_category = EXCLUDED.role_category,
    description = EXCLUDED.description;

-- 3. تحديث role_level لقائد الموارد البشرية ليكون 8 بدلاً من 9
UPDATE roles SET role_level = 8 WHERE role_name = 'hr_committee_leader';

-- 4. تحديث سياسة INSERT للانتخابات
DROP POLICY IF EXISTS elections_insert_admins ON elections;

CREATE POLICY elections_insert_admins ON elections
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_level >= 6
    )
);

