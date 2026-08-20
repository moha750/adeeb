-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260322121731   الاسم: fix_role_names_short

UPDATE roles SET role_name_ar = 'قائد' WHERE id = 7;
UPDATE roles SET role_name_ar = 'نائب' WHERE id = 8;
UPDATE roles SET role_name_ar = 'عضو' WHERE id = 9;
