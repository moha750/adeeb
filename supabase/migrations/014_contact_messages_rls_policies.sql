-- =====================================================
-- سياسات RLS لجدول رسائل التواصل
-- =====================================================
-- متكاملة مع نظام الصلاحيات المركزي
-- =====================================================

-- تفعيل RLS
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 1. السماح للجميع بإضافة رسالة جديدة (من الموقع العام)
-- =====================================================
CREATE POLICY "contact_messages_insert_public"
    ON contact_messages
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- =====================================================
-- 2. قراءة الرسائل (بناءً على نظام الصلاحيات)
-- =====================================================
CREATE POLICY "contact_messages_select_policy"
    ON contact_messages
    FOR SELECT
    TO authenticated
    USING (
        -- التحقق من صلاحيات المستخدم الخاصة
        EXISTS (
            SELECT 1 
            FROM public.user_specific_permissions usp
            JOIN public.permissions p ON usp.permission_id = p.id
            WHERE usp.user_id = auth.uid()
            AND p.permission_key LIKE 'contact_messages.%'
            AND usp.is_granted = true
            AND (usp.expires_at IS NULL OR usp.expires_at > NOW())
        )
        OR
        -- التحقق من صلاحيات الدور
        EXISTS (
            SELECT 1 
            FROM public.user_roles ur
            JOIN public.role_permissions rp ON ur.role_id = rp.role_id
            JOIN public.permissions p ON rp.permission_id = p.id
            WHERE ur.user_id = auth.uid()
            AND ur.is_active = true
            AND p.permission_key LIKE 'contact_messages.%'
        )
    );

-- =====================================================
-- 3. تحديث الرسائل (بناءً على نظام الصلاحيات)
-- =====================================================
CREATE POLICY "contact_messages_update_policy"
    ON contact_messages
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM public.user_specific_permissions usp
            JOIN public.permissions p ON usp.permission_id = p.id
            WHERE usp.user_id = auth.uid()
            AND p.permission_key LIKE 'contact_messages.%'
            AND usp.is_granted = true
            AND (usp.expires_at IS NULL OR usp.expires_at > NOW())
        )
        OR
        EXISTS (
            SELECT 1 
            FROM public.user_roles ur
            JOIN public.role_permissions rp ON ur.role_id = rp.role_id
            JOIN public.permissions p ON rp.permission_id = p.id
            WHERE ur.user_id = auth.uid()
            AND ur.is_active = true
            AND p.permission_key LIKE 'contact_messages.%'
        )
    );

-- =====================================================
-- 4. حذف الرسائل (بناءً على نظام الصلاحيات)
-- =====================================================
CREATE POLICY "contact_messages_delete_policy"
    ON contact_messages
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM public.user_specific_permissions usp
            JOIN public.permissions p ON usp.permission_id = p.id
            WHERE usp.user_id = auth.uid()
            AND p.permission_key LIKE 'contact_messages.%'
            AND usp.is_granted = true
            AND (usp.expires_at IS NULL OR usp.expires_at > NOW())
        )
        OR
        EXISTS (
            SELECT 1 
            FROM public.user_roles ur
            JOIN public.role_permissions rp ON ur.role_id = rp.role_id
            JOIN public.permissions p ON rp.permission_id = p.id
            WHERE ur.user_id = auth.uid()
            AND ur.is_active = true
            AND p.permission_key LIKE 'contact_messages.%'
        )
    );
