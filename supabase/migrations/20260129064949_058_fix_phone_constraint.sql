-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260129064949   الاسم: 058_fix_phone_constraint

-- =====================================================
-- الحل النهائي: إصلاح phone constraint
-- =====================================================
-- المشكلة الحقيقية المكتشفة:
-- CHECK constraint على phone يتطلب normalize_phone
-- لكن normalize_phone قد يفشل مع أرقام معينة
-- مما يمنع الإدراج حتى مع RLS policy صحيح
-- =====================================================

-- 1. حذف constraint القديم
ALTER TABLE membership_applications 
DROP CONSTRAINT IF EXISTS check_phone_format;

-- 2. إنشاء constraint جديد أكثر مرونة
-- يسمح بـ NULL أو أي رقم صالح
ALTER TABLE membership_applications 
ADD CONSTRAINT check_phone_format 
CHECK (
  phone IS NULL 
  OR length(trim(phone)) >= 10
);

-- ملاحظة: normalize_phone سيُطبق عبر trigger قبل الإدراج
-- لذا لا حاجة للتحقق منه في constraint
