-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260722125037   الاسم: add_organizing_department_to_activities


ALTER TABLE public.activities ADD COLUMN organizing_department_id integer REFERENCES public.departments(id);

COMMENT ON COLUMN public.activities.organizing_department_id IS
  'القسم المنظِّم (بديلٌ عن اللجنة). واحدٌ فقط من (لجنة/قسم) يُضبَط، وكلاهما NULL = على مستوى النادي.';

ALTER TABLE public.activities ADD CONSTRAINT activities_one_organizer
  CHECK (NOT (organizing_committee_id IS NOT NULL AND organizing_department_id IS NOT NULL));

CREATE INDEX idx_activities_organizing_department ON public.activities(organizing_department_id);

