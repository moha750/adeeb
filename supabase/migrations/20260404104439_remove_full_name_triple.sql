-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260404104439   الاسم: remove_full_name_triple


-- 1. حذف الـ trigger
DROP TRIGGER IF EXISTS trigger_sync_member_details_to_profiles ON member_details;

-- 2. حذف الدالة
DROP FUNCTION IF EXISTS sync_member_details_to_profiles();

-- 3. حذف العمود
ALTER TABLE member_details DROP COLUMN IF EXISTS full_name_triple;

