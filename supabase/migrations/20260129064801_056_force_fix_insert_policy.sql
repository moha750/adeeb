-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260129064801   الاسم: 056_force_fix_insert_policy

-- =====================================================
-- إصلاح نهائي وقوي لمشكلة INSERT policy
-- =====================================================
-- المشكلة: حتى مع policy صحيح، الإدراج يفشل
-- الحل: حذف كل شيء وإعادة بناء من الصفر
-- =====================================================

-- 1. تعطيل RLS مؤقتاً
ALTER TABLE membership_applications DISABLE ROW LEVEL SECURITY;

-- 2. حذف جميع policies
DROP POLICY IF EXISTS "allow_public_insert_membership_applications" ON membership_applications;
DROP POLICY IF EXISTS "allow_admin_select_membership_applications" ON membership_applications;
DROP POLICY IF EXISTS "allow_admin_update_membership_applications" ON membership_applications;
DROP POLICY IF EXISTS "allow_admin_delete_membership_applications" ON membership_applications;
DROP POLICY IF EXISTS "membership_applications_insert_public" ON membership_applications;

-- 3. إعادة تفعيل RLS
ALTER TABLE membership_applications ENABLE ROW LEVEL SECURITY;

-- 4. إنشاء policy للإدراج العام (anon + authenticated)
CREATE POLICY "allow_public_insert_membership_applications"
ON membership_applications
FOR INSERT
TO public
WITH CHECK (true);

-- 5. إنشاء policy للقراءة (للإداريين فقط)
CREATE POLICY "allow_admin_select_membership_applications"
ON membership_applications
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

-- 6. إنشاء policy للتحديث (للإداريين فقط)
CREATE POLICY "allow_admin_update_membership_applications"
ON membership_applications
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
    OR check_permission(auth.uid(), 'membership.manage')
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
    OR check_permission(auth.uid(), 'membership.manage')
);

-- 7. إنشاء policy للحذف (للإداريين فقط)
CREATE POLICY "allow_admin_delete_membership_applications"
ON membership_applications
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

-- 8. منح الصلاحيات
GRANT INSERT ON membership_applications TO anon;
GRANT INSERT ON membership_applications TO authenticated;
