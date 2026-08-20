-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260404174251   الاسم: create_councils_table


CREATE TABLE public.councils (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    description TEXT,
    group_link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.councils ENABLE ROW LEVEL SECURITY;

CREATE POLICY "councils_public_read" ON public.councils
    FOR SELECT USING (true);

CREATE POLICY "councils_admin_write" ON public.councils
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON r.id = ur.role_id
            WHERE ur.user_id = auth.uid()
              AND ur.is_active = true
              AND r.role_level >= 8
        )
    );

INSERT INTO public.councils (id, name_ar) VALUES
    ('administrative', 'المجلس الإداري'),
    ('executive',      'المجلس التنفيذي');

