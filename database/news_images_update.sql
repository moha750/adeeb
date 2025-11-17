-- تحديث جدول الأخبار لدعم صور متعددة مع أسماء المصورين
-- يجب تنفيذ هذا السكريبت في Supabase SQL Editor

-- إضافة حقل جديد للصور المتعددة (JSONB Array)
-- كل عنصر في المصفوفة يحتوي على: url, photographer_name
ALTER TABLE news 
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- إضافة تعليق للحقل الجديد
COMMENT ON COLUMN news.images IS 'مصفوفة الصور مع أسماء المصورين - كل عنصر يحتوي على {url: string, photographer: string}';

-- مثال على البيانات المخزنة:
-- [
--   {"url": "https://...", "photographer": "محمد أحمد"},
--   {"url": "https://...", "photographer": "سارة علي"}
-- ]

-- ملاحظة: الحقل image_url الحالي سيبقى للتوافق مع الأكواد القديمة
-- يمكن استخدامه كصورة رئيسية أو تركه فارغاً عند استخدام images
