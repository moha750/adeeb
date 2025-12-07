-- =====================================================
-- إصلاح مشكلة التكرار اللانهائي في RLS
-- =====================================================
-- المشكلة: السياسات كانت تستدعي نفس الجدول admin_users
-- الحل: استخدام دالة SECURITY DEFINER لتجاوز RLS
-- =====================================================

-- الخطوة 1: حذف السياسات القديمة
DROP POLICY IF EXISTS "Super admins can read all" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can manage admin users" ON public.admin_users;

-- الخطوة 2: إنشاء دالة مساعدة (SECURITY DEFINER تتجاوز RLS)
CREATE OR REPLACE FUNCTION is_super_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    -- استخدام استعلام مباشر بدون RLS
    RETURN EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE user_id = p_user_id
        AND role = 'super_admin'
        AND is_active = true
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- الخطوة 3: إعادة إنشاء السياسات باستخدام الدالة الجديدة
CREATE POLICY "Super admins can read all"
ON public.admin_users FOR SELECT
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage admin users"
ON public.admin_users FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- =====================================================
-- التحقق من نجاح الإصلاح
-- =====================================================

-- اختبار: يجب أن يعمل هذا الاستعلام بدون أخطاء
-- SELECT * FROM admin_users WHERE is_active = true;

RAISE NOTICE 'تم إصلاح مشكلة التكرار اللانهائي في RLS بنجاح!';
