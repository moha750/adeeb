-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260129063600   الاسم: 055_fix_membership_insert_final

-- =====================================================
-- الحل النهائي الدقيق لمشكلة إرسال طلبات التسجيل
-- =====================================================
-- المشكلة المكتشفة:
-- 1. Policy موجود باسم "membership_applications_insert_public" 
--    لكنه يحتوي على شرط WITH CHECK خاطئ منطقياً
-- 2. الشرط يقارن الحقل بنفسه بدلاً من مقارنته بالصفوف الأخرى
-- =====================================================

-- 1. حذف جميع policies الإدراج القديمة
DROP POLICY IF EXISTS "membership_applications_insert_public" ON membership_applications;
DROP POLICY IF EXISTS "allow_public_insert_membership_applications" ON membership_applications;
DROP POLICY IF EXISTS "public_insert_membership_applications" ON membership_applications;
DROP POLICY IF EXISTS "allow_insert_membership_applications" ON membership_applications;

-- 2. إنشاء policy جديد صحيح للإدراج العام
-- السماح بالإدراج للجميع بدون قيود معقدة
-- التحقق من التكرار سيتم في الكود البرمجي
CREATE POLICY "allow_public_insert_membership_applications"
ON membership_applications
FOR INSERT
TO public
WITH CHECK (true);

-- 3. منح صلاحية INSERT لـ anon role
-- ملاحظة: الجدول يستخدم UUID (gen_random_uuid) وليس SERIAL، لذا لا يوجد sequence
GRANT INSERT ON membership_applications TO anon;

-- 4. التأكد من تفعيل RLS
ALTER TABLE membership_applications ENABLE ROW LEVEL SECURITY;

-- ملاحظات:
-- - هذا يسمح لأي شخص بإرسال طلب تسجيل (السلوك المطلوب)
-- - التحقق من التكرار والبيانات يتم في الكود البرمجي
-- - الموافقة على الطلبات تتم من لوحة التحكم
-- - Policies الأخرى (SELECT, UPDATE, DELETE) تبقى محمية للإداريين فقط
