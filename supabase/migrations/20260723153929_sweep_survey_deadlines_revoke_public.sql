-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260723153929   الاسم: sweep_survey_deadlines_revoke_public

-- الكنس دالّةٌ **تُغيّر البيانات** يشغّلها الـcron (postgres) وحده — لا تُكشَف كـRPC عامّ.
revoke execute on function public.sweep_survey_deadlines() from public, anon, authenticated;
