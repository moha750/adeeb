-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260207095735   الاسم: create_testimonials_table


-- إنشاء جدول الشهادات/آراء الأعضاء
CREATE TABLE IF NOT EXISTS public.testimonials (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    rating integer DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
    text text NOT NULL,
    member_name text NOT NULL,
    committee text,
    avatar_url text,
    visible boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة العامة للشهادات المرئية
CREATE POLICY testimonials_select_visible ON public.testimonials
    FOR SELECT USING (visible = true);

-- سياسة الإدراج والتعديل والحذف للأدمن
CREATE POLICY testimonials_admin_all ON public.testimonials
    FOR ALL USING (public.is_admin_user(auth.uid()));

