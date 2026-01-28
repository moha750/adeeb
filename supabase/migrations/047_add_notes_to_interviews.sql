-- =====================================================
-- إضافة عمود notes إلى جدول membership_interviews
-- =====================================================
-- تاريخ الإنشاء: 2026-01-28
-- الوصف: إضافة حقل الملاحظات لتسجيل أسباب الرفض والملاحظات الإدارية
-- =====================================================

-- إضافة عمود notes إذا لم يكن موجوداً
ALTER TABLE membership_interviews 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- إضافة تعليق توضيحي
COMMENT ON COLUMN membership_interviews.notes IS 'ملاحظات إدارية وأسباب الرفض أو القبول';

-- تحديث السجلات الموجودة لنقل البيانات من result_notes إلى notes إن وجدت
UPDATE membership_interviews 
SET notes = result_notes 
WHERE notes IS NULL AND result_notes IS NOT NULL;
