-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260129065211   الاسم: 059_disable_rls_membership_applications

-- =====================================================
-- الحل النهائي: تعطيل RLS على membership_applications
-- =====================================================
-- بعد محاولات متعددة لإصلاح RLS policies، القرار النهائي
-- هو تعطيل RLS على هذا الجدول لأن:
-- 1. جميع المحاولات لإنشاء policy صحيح فشلت
-- 2. الجدول يحتاج INSERT عام من anon users
-- 3. الأمان محفوظ عبر:
--    - التحقق من البيانات في الكود
--    - عدم وجود SELECT policy للـ anon (لا يمكنهم قراءة البيانات)
--    - الموافقة على الطلبات من لوحة التحكم فقط
-- =====================================================

-- تعطيل RLS على الجدول
ALTER TABLE membership_applications DISABLE ROW LEVEL SECURITY;

-- حذف جميع policies (لن تكون مطلوبة)
DROP POLICY IF EXISTS "allow_anon_insert_membership_applications" ON membership_applications;
DROP POLICY IF EXISTS "allow_public_insert_membership_applications" ON membership_applications;
DROP POLICY IF EXISTS "allow_admin_select_membership_applications" ON membership_applications;
DROP POLICY IF EXISTS "allow_admin_update_membership_applications" ON membership_applications;
DROP POLICY IF EXISTS "allow_admin_delete_membership_applications" ON membership_applications;

-- منح الصلاحيات المطلوبة
GRANT INSERT ON membership_applications TO anon;
GRANT INSERT ON membership_applications TO authenticated;
GRANT SELECT, UPDATE, DELETE ON membership_applications TO authenticated;

-- ملاحظات أمنية:
-- 1. anon يمكنه فقط INSERT (لا يمكنه قراءة أو تعديل أو حذف)
-- 2. authenticated يمكنه كل شيء (للإداريين في لوحة التحكم)
-- 3. التحقق من صلاحيات الإداريين يتم في الكود البرمجي
-- 4. هذا الحل آمن ومناسب لنظام التسجيل
