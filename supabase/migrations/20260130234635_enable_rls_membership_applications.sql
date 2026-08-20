-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260130234635   الاسم: enable_rls_membership_applications

-- Migration: تفعيل RLS على جدول membership_applications

-- تفعيل RLS
ALTER TABLE membership_applications ENABLE ROW LEVEL SECURITY;

-- السماح للـ public بالإضافة (للتسجيل الجديد)
CREATE POLICY "membership_applications_insert_public" ON membership_applications
FOR INSERT
TO public
WITH CHECK (
  -- التحقق من البيانات الأساسية
  full_name IS NOT NULL
  AND email IS NOT NULL
  AND phone IS NOT NULL
  AND LENGTH(full_name) >= 3
  AND LENGTH(phone) = 10
);

-- السماح للمستخدم برؤية طلباته الخاصة
CREATE POLICY "membership_applications_select_own" ON membership_applications
FOR SELECT
TO authenticated
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR
  phone = (SELECT raw_user_meta_data->>'phone' FROM auth.users WHERE id = auth.uid())
);

-- السماح للمدراء برؤية جميع الطلبات
CREATE POLICY "membership_applications_select_admin" ON membership_applications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND p.permission_key IN ('membership.manage', 'membership.view', 'system.admin')
  )
);

-- السماح للمدراء بالتحديث
CREATE POLICY "membership_applications_update_admin" ON membership_applications
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND p.permission_key IN ('membership.manage', 'system.admin')
  )
);

-- السماح للمدراء بالحذف
CREATE POLICY "membership_applications_delete_admin" ON membership_applications
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = auth.uid()
    AND ur.is_active = true
    AND p.permission_key IN ('membership.manage', 'system.admin')
  )
);

COMMENT ON POLICY "membership_applications_insert_public" ON membership_applications IS 'يسمح للعامة بتقديم طلبات العضوية';
COMMENT ON POLICY "membership_applications_select_own" ON membership_applications IS 'يسمح للمستخدم برؤية طلباته الخاصة';
COMMENT ON POLICY "membership_applications_select_admin" ON membership_applications IS 'يسمح للمدراء برؤية جميع الطلبات';
COMMENT ON POLICY "membership_applications_update_admin" ON membership_applications IS 'يسمح للمدراء بتحديث الطلبات';
COMMENT ON POLICY "membership_applications_delete_admin" ON membership_applications IS 'يسمح للمدراء بحذف الطلبات';
