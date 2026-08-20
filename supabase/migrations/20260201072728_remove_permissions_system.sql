-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260201072728   الاسم: remove_permissions_system

-- حذف جداول نظام الصلاحيات بالكامل

-- حذف جدول سجل التدقيق للصلاحيات
DROP TABLE IF EXISTS public.permissions_audit_log CASCADE;

-- حذف جدول الصلاحيات الخاصة للمستخدمين
DROP TABLE IF EXISTS public.user_specific_permissions CASCADE;

-- حذف جدول صلاحيات الأدوار
DROP TABLE IF EXISTS public.role_permissions CASCADE;

-- حذف جدول الصلاحيات الرئيسي
DROP TABLE IF EXISTS public.permissions CASCADE;

-- إضافة تعليق توضيحي
COMMENT ON SCHEMA public IS 'تم إزالة نظام الصلاحيات - يتم إدارة الأدوار من قاعدة البيانات مباشرة';
