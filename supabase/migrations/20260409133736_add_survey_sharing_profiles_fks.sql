-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260409133736   الاسم: add_survey_sharing_profiles_fks


ALTER TABLE public.survey_sharing
    ADD CONSTRAINT survey_sharing_shared_by_profiles_fkey
    FOREIGN KEY (shared_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.survey_sharing
    ADD CONSTRAINT survey_sharing_shared_with_profiles_fkey
    FOREIGN KEY (shared_with) REFERENCES public.profiles(id) ON DELETE CASCADE;

