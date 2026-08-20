-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260206162204   الاسم: add_photographer_fields_to_news


-- إضافة حقول المصورين لجدول الأخبار
ALTER TABLE public.news 
ADD COLUMN IF NOT EXISTS cover_photographer text,
ADD COLUMN IF NOT EXISTS gallery_photographers text[];

COMMENT ON COLUMN public.news.cover_photographer IS 'اسم مصور صورة الغلاف';
COMMENT ON COLUMN public.news.gallery_photographers IS 'أسماء مصوري صور المعرض';

