-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260719233250   الاسم: add_organizing_committee_to_activities


ALTER TABLE public.activities
  ADD COLUMN organizing_committee_id integer REFERENCES public.committees(id);

COMMENT ON COLUMN public.activities.organizing_committee_id IS
  'اللجنة المنظِّمة للفعاليّة (تتدحرج للقسم والمجلس). NULL = على مستوى النادي/غير محدّد.';

CREATE INDEX idx_activities_organizing_committee ON public.activities(organizing_committee_id);

