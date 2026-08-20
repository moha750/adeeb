-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260207095800   الاسم: fix_site_visits_and_membership_settings


-- إصلاح site_visits: إضافة سياسة SELECT للزائر ليقرأ زيارته فقط (مطلوب لـ .select() بعد insert)
CREATE POLICY site_visits_select_own ON public.site_visits
    FOR SELECT USING (true);

-- إضافة الأعمدة المفقودة في membership_settings
ALTER TABLE public.membership_settings 
    ADD COLUMN IF NOT EXISTS join_closed_title text DEFAULT 'التسجيل مغلق حالياً',
    ADD COLUMN IF NOT EXISTS join_closed_message text DEFAULT 'نعتذر، التسجيل في العضوية مغلق حالياً. يرجى المتابعة لمعرفة موعد فتح التسجيل.',
    ADD COLUMN IF NOT EXISTS join_closed_button_text text DEFAULT 'تابعنا';

