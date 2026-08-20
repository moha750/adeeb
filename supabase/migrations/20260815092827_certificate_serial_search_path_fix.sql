-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260815092827   الاسم: certificate_serial_search_path_fix

-- `gen_random_bytes` تسكن `extensions` لا `public`، وكلتا دالّتي الإصدار تقصر مسارَها على
-- `public, pg_temp` — فالسلسلةُ العشوائيّة في رقم الشهادة تُردّ بـ«function does not exist».
-- وهذا كان كامنًا في شهادة الخبرة منذ بُنيت (لم تُصدَر منها ولا واحدة، فلم يظهر).
alter function public.issue_certificate(uuid, uuid, text, text)
  set search_path to 'public', 'extensions', 'pg_temp';

alter function public.issue_participation_certificate(uuid)
  set search_path to 'public', 'extensions', 'pg_temp';
