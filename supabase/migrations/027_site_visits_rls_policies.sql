-- =====================================================
-- سياسات RLS لجدول زيارات الموقع
-- =====================================================
-- تاريخ الإنشاء: 2026-01-20
-- الوصف: سياسات الأمان والصلاحيات لجداول الزيارات
-- =====================================================

-- =====================================================
-- 1. تفعيل RLS على الجداول
-- =====================================================
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_visits_daily_stats ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. سياسات الإدراج (INSERT) - site_visits
-- =====================================================
-- السماح للجميع بإدراج زيارات جديدة (بدون مصادقة)
CREATE POLICY "allow_public_insert_visits"
    ON public.site_visits
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- =====================================================
-- 3. سياسات القراءة (SELECT) - site_visits
-- =====================================================
-- السماح للمستخدمين المصادقين بمستوى 5 فأعلى بقراءة البيانات
CREATE POLICY "allow_authorized_select_visits"
    ON public.site_visits
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
                AND ur.is_active = true
                AND r.role_level >= 5
        )
    );

-- =====================================================
-- 4. سياسات الحذف (DELETE) - site_visits
-- =====================================================
-- السماح للمستخدمين بمستوى 8 فأعلى بحذف البيانات
CREATE POLICY "allow_admin_delete_visits"
    ON public.site_visits
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
                AND ur.is_active = true
                AND r.role_level >= 8
        )
    );

-- =====================================================
-- 5. سياسات القراءة - site_visits_daily_stats
-- =====================================================
-- السماح للمستخدمين المصادقين بمستوى 5 فأعلى بقراءة الإحصائيات
CREATE POLICY "allow_authorized_select_daily_stats"
    ON public.site_visits_daily_stats
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
                AND ur.is_active = true
                AND r.role_level >= 5
        )
    );

-- =====================================================
-- 6. سياسات الإدراج والتحديث - site_visits_daily_stats
-- =====================================================
-- السماح للنظام بتحديث الإحصائيات اليومية (من خلال المشغلات)
CREATE POLICY "allow_system_update_daily_stats"
    ON public.site_visits_daily_stats
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- 7. منح صلاحيات تنفيذ الدوال
-- =====================================================
-- السماح للمستخدمين المصادقين باستدعاء دوال الإحصائيات
GRANT EXECUTE ON FUNCTION get_visit_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_pages TO authenticated;
GRANT EXECUTE ON FUNCTION get_visits_by_day TO authenticated;

-- السماح للمستخدمين غير المصادقين بإدراج البيانات فقط
GRANT INSERT ON public.site_visits TO anon;

-- منح صلاحيات القراءة للمستخدمين المصادقين
GRANT SELECT ON public.site_visits TO authenticated;
GRANT SELECT ON public.site_visits_daily_stats TO authenticated;

-- =====================================================
-- 8. تعليقات على السياسات
-- =====================================================
COMMENT ON POLICY "allow_public_insert_visits" ON public.site_visits 
    IS 'السماح لجميع الزوار بتسجيل زياراتهم';

COMMENT ON POLICY "allow_authorized_select_visits" ON public.site_visits 
    IS 'السماح للمستخدمين بمستوى 5 فأعلى بعرض بيانات الزيارات';

COMMENT ON POLICY "allow_admin_delete_visits" ON public.site_visits 
    IS 'السماح للمسؤولين بمستوى 8 فأعلى بحذف بيانات الزيارات';
