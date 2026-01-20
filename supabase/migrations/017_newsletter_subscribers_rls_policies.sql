-- =====================================================
-- سياسات RLS لجدول مشتركي النشرة البريدية
-- =====================================================
-- متكاملة مع نظام الصلاحيات المركزي
-- =====================================================

-- تفعيل RLS
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 1. السماح للجميع بإضافة اشتراك جديد (من الموقع العام)
-- =====================================================
CREATE POLICY "newsletter_subscribers_insert_public"
    ON newsletter_subscribers
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- =====================================================
-- 2. قراءة المشتركين (بناءً على نظام الصلاحيات)
-- =====================================================
CREATE POLICY "newsletter_subscribers_select_policy"
    ON newsletter_subscribers
    FOR SELECT
    TO authenticated
    USING (
        -- التحقق من صلاحيات المستخدم الخاصة
        EXISTS (
            SELECT 1 
            FROM public.user_specific_permissions usp
            JOIN public.permissions p ON usp.permission_id = p.id
            WHERE usp.user_id = auth.uid()
            AND p.permission_key LIKE 'newsletter.%'
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
            AND p.permission_key LIKE 'newsletter.%'
        )
    );

-- =====================================================
-- 3. تحديث المشتركين (بناءً على نظام الصلاحيات)
-- =====================================================
CREATE POLICY "newsletter_subscribers_update_policy"
    ON newsletter_subscribers
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM public.user_specific_permissions usp
            JOIN public.permissions p ON usp.permission_id = p.id
            WHERE usp.user_id = auth.uid()
            AND p.permission_key LIKE 'newsletter.%'
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
            AND p.permission_key LIKE 'newsletter.%'
        )
    );

-- =====================================================
-- 4. حذف المشتركين (بناءً على نظام الصلاحيات)
-- =====================================================
CREATE POLICY "newsletter_subscribers_delete_policy"
    ON newsletter_subscribers
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM public.user_specific_permissions usp
            JOIN public.permissions p ON usp.permission_id = p.id
            WHERE usp.user_id = auth.uid()
            AND p.permission_key LIKE 'newsletter.%'
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
            AND p.permission_key LIKE 'newsletter.%'
        )
    );
