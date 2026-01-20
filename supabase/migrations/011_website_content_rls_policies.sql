-- =====================================================
-- سياسات الأمان لجداول محتوى الموقع
-- RLS Policies for Website Content Tables
-- =====================================================
-- تاريخ الإنشاء: 2026-01-17
-- الوصف: تفعيل RLS وتعريف السياسات لجداول محتوى الموقع
-- =====================================================

-- =====================================================
-- 1. سياسات جدول أعمالنا (works)
-- =====================================================

-- تفعيل RLS
ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: الجميع يمكنهم قراءة الأعمال المنشورة
CREATE POLICY "works_select_published" ON public.works
    FOR SELECT
    USING (is_published = true);

-- سياسة القراءة للإداريين: يمكنهم رؤية جميع الأعمال
CREATE POLICY "works_select_admin" ON public.works
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 7
            AND ur.is_active = true
        )
    );

-- سياسة الإضافة: المستوى 7 وأعلى
CREATE POLICY "works_insert" ON public.works
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 7
            AND ur.is_active = true
        )
    );

-- سياسة التعديل: المستوى 7 وأعلى
CREATE POLICY "works_update" ON public.works
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 7
            AND ur.is_active = true
        )
    );

-- سياسة الحذف: المستوى 7 وأعلى
CREATE POLICY "works_delete" ON public.works
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 7
            AND ur.is_active = true
        )
    );

-- =====================================================
-- 2. سياسات جدول الإنجازات (achievements)
-- =====================================================

-- تفعيل RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: الجميع يمكنهم قراءة الإنجازات
CREATE POLICY "achievements_select_all" ON public.achievements
    FOR SELECT
    USING (true);

-- سياسة الإضافة: المستوى 7 وأعلى
CREATE POLICY "achievements_insert" ON public.achievements
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 7
            AND ur.is_active = true
        )
    );

-- سياسة التعديل: المستوى 7 وأعلى
CREATE POLICY "achievements_update" ON public.achievements
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 7
            AND ur.is_active = true
        )
    );

-- سياسة الحذف: المستوى 7 وأعلى
CREATE POLICY "achievements_delete" ON public.achievements
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 7
            AND ur.is_active = true
        )
    );

-- =====================================================
-- 3. سياسات جدول الشركاء (sponsors)
-- =====================================================

-- تفعيل RLS
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: الجميع يمكنهم قراءة الشركاء النشطين
CREATE POLICY "sponsors_select_active" ON public.sponsors
    FOR SELECT
    USING (is_active = true);

-- سياسة القراءة للإداريين: يمكنهم رؤية جميع الشركاء
CREATE POLICY "sponsors_select_admin" ON public.sponsors
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 7
            AND ur.is_active = true
        )
    );

-- سياسة الإضافة: المستوى 7 وأعلى
CREATE POLICY "sponsors_insert" ON public.sponsors
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 7
            AND ur.is_active = true
        )
    );

-- سياسة التعديل: المستوى 7 وأعلى
CREATE POLICY "sponsors_update" ON public.sponsors
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 7
            AND ur.is_active = true
        )
    );

-- سياسة الحذف: المستوى 7 وأعلى
CREATE POLICY "sponsors_delete" ON public.sponsors
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 7
            AND ur.is_active = true
        )
    );

-- =====================================================
-- 4. سياسات جدول الأسئلة الشائعة (faq)
-- =====================================================

-- تفعيل RLS
ALTER TABLE public.faq ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: الجميع يمكنهم قراءة الأسئلة النشطة
CREATE POLICY "faq_select_active" ON public.faq
    FOR SELECT
    USING (is_active = true);

-- سياسة القراءة للإداريين: يمكنهم رؤية جميع الأسئلة
CREATE POLICY "faq_select_admin" ON public.faq
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 7
            AND ur.is_active = true
        )
    );

-- سياسة الإضافة: المستوى 7 وأعلى
CREATE POLICY "faq_insert" ON public.faq
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 7
            AND ur.is_active = true
        )
    );

-- سياسة التعديل: المستوى 7 وأعلى
CREATE POLICY "faq_update" ON public.faq
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 7
            AND ur.is_active = true
        )
    );

-- سياسة الحذف: المستوى 7 وأعلى
CREATE POLICY "faq_delete" ON public.faq
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 7
            AND ur.is_active = true
        )
    );
