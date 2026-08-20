-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260130191419   الاسم: create_site_settings_table

-- إنشاء جدول إعدادات الموقع
CREATE TABLE IF NOT EXISTS public.site_settings (
    id SERIAL PRIMARY KEY,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    setting_type TEXT DEFAULT 'text' CHECK (setting_type IN ('text', 'number', 'boolean', 'json', 'url')),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إضافة تعليق على الجدول
COMMENT ON TABLE public.site_settings IS 'جدول إعدادات الموقع العامة';

-- إضافة RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: يمكن لجميع المستخدمين المصادق عليهم قراءة الإعدادات النشطة
CREATE POLICY "Allow authenticated users to read active settings"
    ON public.site_settings
    FOR SELECT
    TO authenticated
    USING (is_active = true);

-- سياسة الكتابة: فقط المسؤولون (role_level >= 8) يمكنهم التعديل
CREATE POLICY "Allow admins to manage settings"
    ON public.site_settings
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 8
            AND ur.is_active = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_level >= 8
            AND ur.is_active = true
        )
    );

-- إدراج الإعدادات الأولية
INSERT INTO public.site_settings (setting_key, setting_value, setting_type, description, is_active) VALUES
('whatsapp_general_group', 'https://chat.whatsapp.com/YOUR_GENERAL_GROUP_LINK', 'url', 'رابط قروب مجلس أدِيب العام', true),
('whatsapp_female_group', 'https://chat.whatsapp.com/YOUR_FEMALE_GROUP_LINK', 'url', 'رابط قروب مجلس أدِيبات', true)
ON CONFLICT (setting_key) DO NOTHING;

-- إنشاء دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION public.update_site_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء Trigger
CREATE TRIGGER site_settings_updated_at
    BEFORE UPDATE ON public.site_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_site_settings_updated_at();
