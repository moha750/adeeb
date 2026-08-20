-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260129064846   الاسم: 057_final_fix_use_anon_role

-- =====================================================
-- الحل النهائي الصحيح: استخدام anon role بشكل صريح
-- =====================================================
-- المشكلة المكتشفة: TO public لا يعمل مع anon role في Supabase
-- الحل: استخدام TO anon, authenticated بشكل صريح
-- =====================================================

-- 1. حذف policy القديم
DROP POLICY IF EXISTS "allow_public_insert_membership_applications" ON membership_applications;

-- 2. إنشاء policy جديد للـ anon و authenticated roles
CREATE POLICY "allow_anon_insert_membership_applications"
ON membership_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 3. التأكد من الصلاحيات
GRANT INSERT ON membership_applications TO anon;
GRANT INSERT ON membership_applications TO authenticated;
