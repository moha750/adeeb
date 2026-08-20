-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260314224650   الاسم: fix_membership_applications_about_nullable


-- تغيير حقل about ليقبل NULL
ALTER TABLE membership_applications 
ALTER COLUMN about DROP NOT NULL;

-- تحديث القيم الفارغة الحالية إلى NULL
UPDATE membership_applications 
SET about = NULL 
WHERE about = '';

