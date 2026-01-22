-- =====================================================
-- إصلاح سياسة INSERT لجدول site_visits
-- =====================================================
-- تاريخ الإنشاء: 2026-01-22
-- الوصف: إعادة إنشاء سياسة INSERT للسماح للجميع بتسجيل الزيارات
-- =====================================================

-- حذف السياسة القديمة إن وجدت
DROP POLICY IF EXISTS "allow_public_insert_visits" ON public.site_visits;

-- إنشاء سياسة INSERT جديدة
CREATE POLICY "allow_public_insert_visits"
    ON public.site_visits
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- التأكد من تفعيل RLS
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

-- تعليق
COMMENT ON POLICY "allow_public_insert_visits" ON public.site_visits 
IS 'السماح للجميع (anon و authenticated) بإدراج زيارات جديدة بدون قيود';
