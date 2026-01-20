-- تفعيل RLS على جداول العضوية
ALTER TABLE membership_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_settings ENABLE ROW LEVEL SECURITY;

-- سياسات جدول طلبات العضوية (membership_applications)

-- السماح للجميع بإدراج طلبات جديدة (للتسجيل العام)
CREATE POLICY "allow_public_insert_membership_applications"
ON membership_applications
FOR INSERT
TO public
WITH CHECK (true);

-- السماح للمستخدمين المصادقين بقراءة الطلبات حسب الصلاحيات
CREATE POLICY "allow_authenticated_select_membership_applications"
ON membership_applications
FOR SELECT
TO authenticated
USING (
    check_permission(auth.uid(), 'membership.view')
);

-- السماح للمستخدمين المصادقين بتحديث الطلبات حسب الصلاحيات
CREATE POLICY "allow_authenticated_update_membership_applications"
ON membership_applications
FOR UPDATE
TO authenticated
USING (
    check_permission(auth.uid(), 'membership.manage')
)
WITH CHECK (
    check_permission(auth.uid(), 'membership.manage')
);

-- السماح للمستخدمين المصادقين بحذف الطلبات حسب الصلاحيات
CREATE POLICY "allow_authenticated_delete_membership_applications"
ON membership_applications
FOR DELETE
TO authenticated
USING (
    check_permission(auth.uid(), 'membership.delete')
);

-- سياسات جدول إعدادات التسجيل (membership_settings)

-- السماح للجميع بقراءة الإعدادات (للتحقق من حالة التسجيل)
CREATE POLICY "allow_public_select_membership_settings"
ON membership_settings
FOR SELECT
TO public
USING (true);

-- السماح للمستخدمين المصادقين بتحديث الإعدادات حسب الصلاحيات
CREATE POLICY "allow_authenticated_update_membership_settings"
ON membership_settings
FOR UPDATE
TO authenticated
USING (
    check_permission(auth.uid(), 'membership.settings')
)
WITH CHECK (
    check_permission(auth.uid(), 'membership.settings')
);

-- تعليقات توضيحية
COMMENT ON POLICY "allow_public_insert_membership_applications" ON membership_applications IS 'السماح للجميع بإرسال طلبات التسجيل';
COMMENT ON POLICY "allow_authenticated_select_membership_applications" ON membership_applications IS 'السماح للمستخدمين المصرح لهم بعرض الطلبات';
COMMENT ON POLICY "allow_authenticated_update_membership_applications" ON membership_applications IS 'السماح للمستخدمين المصرح لهم بتحديث الطلبات';
COMMENT ON POLICY "allow_authenticated_delete_membership_applications" ON membership_applications IS 'السماح للمستخدمين المصرح لهم بحذف الطلبات';
COMMENT ON POLICY "allow_public_select_membership_settings" ON membership_settings IS 'السماح للجميع بقراءة إعدادات التسجيل';
COMMENT ON POLICY "allow_authenticated_update_membership_settings" ON membership_settings IS 'السماح للمستخدمين المصرح لهم بتعديل إعدادات التسجيل';
