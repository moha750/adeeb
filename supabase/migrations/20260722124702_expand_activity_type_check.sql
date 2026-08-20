-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260722124702   الاسم: expand_activity_type_check


ALTER TABLE public.activities DROP CONSTRAINT activities_activity_type_check;

ALTER TABLE public.activities ADD CONSTRAINT activities_activity_type_check
  CHECK (activity_type = ANY (ARRAY['activity'::text, 'program'::text, 'workshop'::text, 'dialogue'::text, 'camp'::text, 'exhibition'::text, 'course'::text]));

