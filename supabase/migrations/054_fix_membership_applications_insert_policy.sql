-- =====================================================
-- إصلاح policy الإدراج لجدول membership_applications
-- =====================================================
-- 
-- المشكلة: policy "allow_public_insert_membership_applications" موجود
-- ولكن يظهر خطأ 401 Unauthorized عند محاولة الإدراج
-- 
-- السبب المحتمل: 
-- 1. Policy تم حذفه أو تعطيله في migration لاحق
-- 2. RLS تم تفعيله ولكن لا توجد policy صالحة للإدراج العام
-- 
-- الحل: إعادة إنشاء policy بشكل صريح مع التأكد من عدم وجود تعارضات
-- =====================================================

-- 1. حذف أي policies قديمة للإدراج العام
DROP POLICY IF EXISTS "allow_public_insert_membership_applications" ON membership_applications;
DROP POLICY IF EXISTS "public_insert_membership_applications" ON membership_applications;
DROP POLICY IF EXISTS "allow_insert_membership_applications" ON membership_applications;

-- 2. إنشاء policy جديد للسماح بالإدراج للجميع (بما في ذلك المستخدمين غير المسجلين)
CREATE POLICY "allow_public_insert_membership_applications"
ON membership_applications
FOR INSERT
TO public
WITH CHECK (true);

-- 3. التأكد من أن anon role لديه صلاحيات INSERT
GRANT INSERT ON membership_applications TO anon;
GRANT USAGE ON SEQUENCE membership_applications_id_seq TO anon;

-- ملاحظة: هذا يسمح لأي شخص بإرسال طلب تسجيل، وهو السلوك المطلوب
-- التحقق من صحة البيانات يتم في الكود البرمجي (JavaScript)
-- والموافقة على الطلبات تتم من لوحة التحكم من قبل الإداريين
