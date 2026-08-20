-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260723142507   الاسم: survey_lifecycle_flags

-- تبسيط دورة حياة الاستبيان: الأرشفة والحذف عَلَمان متعامدان (archived_at/deleted_at) لا حالتان.
-- الحالتان القديمتان تُنقلان إلى 'closed' (عَلَماهما محفوظان أصلًا فيُميّزان الموضع: الأرشيف/المحذوفات).
-- البيانات أوّلًا ثمّ القيد — وإلّا رفض القيدُ الجديد الصفوفَ القائمة.
update surveys set status = 'closed' where status in ('archived', 'deleted');

alter table surveys drop constraint surveys_status_check;
alter table surveys add constraint surveys_status_check
  check (status = any (array['draft'::text, 'active'::text, 'paused'::text, 'closed'::text]));
