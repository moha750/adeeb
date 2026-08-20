-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260201205118   الاسم: fix_admin_rls_policies_for_messages_and_newsletter


-- إضافة سياسات SELECT للمسؤولين لجدول contact_messages
CREATE POLICY "contact_messages_select_admin"
ON contact_messages
FOR SELECT
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

-- إضافة سياسات UPDATE للمسؤولين لجدول contact_messages
CREATE POLICY "contact_messages_update_admin"
ON contact_messages
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
)
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

-- إضافة سياسات SELECT للمسؤولين لجدول newsletter_subscribers
CREATE POLICY "newsletter_subscribers_select_admin"
ON newsletter_subscribers
FOR SELECT
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

-- إضافة سياسات UPDATE للمسؤولين لجدول newsletter_subscribers
CREATE POLICY "newsletter_subscribers_update_admin"
ON newsletter_subscribers
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
)
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

-- إضافة سياسات DELETE للمسؤولين لجدول newsletter_subscribers
CREATE POLICY "newsletter_subscribers_delete_admin"
ON newsletter_subscribers
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
);

