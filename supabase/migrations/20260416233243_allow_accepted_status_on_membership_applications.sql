-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260416233243   الاسم: allow_accepted_status_on_membership_applications

ALTER TABLE public.membership_applications DROP CONSTRAINT IF EXISTS membership_applications_status_check;
ALTER TABLE public.membership_applications ADD CONSTRAINT membership_applications_status_check CHECK (status = ANY (ARRAY['new'::text, 'under_review'::text, 'approved_for_interview'::text, 'accepted'::text, 'rejected'::text, 'archived'::text]));
