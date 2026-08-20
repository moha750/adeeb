-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260203040135   الاسم: restructure_roles_hierarchy

-- تحديث الهيكل التنظيمي لنادي أدِيب
-- المجلس الإداري: المستويات 10-7
-- المجلس التنفيذي: المستويات 6-3

-- أولاً: تحديث المستويات والأسماء في جدول roles
UPDATE roles SET role_level = 8, role_name_ar = 'قائد لجنة الضمان والجودة' WHERE id = 3;
UPDATE roles SET role_level = 9, role_name_ar = 'قائد لجنة الموارد البشرية' WHERE id = 2;
UPDATE roles SET role_level = 7, role_name_ar = 'عضو إداري' WHERE id IN (4, 5);
UPDATE roles SET role_level = 6, role_name_ar = 'رئيس المجلس التنفيذي' WHERE id = 6;
UPDATE roles SET role_level = 5, role_name_ar = 'قائد لجنة' WHERE id = 7;
UPDATE roles SET role_level = 4, role_name_ar = 'نائب قائد لجنة' WHERE id = 8;
UPDATE roles SET role_level = 3, role_name_ar = 'عضو لجنة' WHERE id = 9;

-- ثانياً: نقل جميع الأعضاء من المستوى 5 إلى المستوى 3
-- نحتاج لتحديث user_roles لتشير إلى role_id الجديد
UPDATE user_roles 
SET role_id = 9 
WHERE role_id IN (SELECT id FROM roles WHERE role_level = 5 AND role_name = 'committee_member');
