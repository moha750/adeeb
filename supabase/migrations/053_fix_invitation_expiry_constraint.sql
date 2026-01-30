-- =====================================================
-- إصلاح constraint valid_expiry في جدول membership_invitations
-- =====================================================
-- 
-- المشكلة: constraint كان يتطلب expires_at >= created_at + 24 hours
-- هذا يسبب مشاكل بسبب فروقات التوقيت والميلي ثانية
-- 
-- الحل: تغيير الحد الأدنى إلى expires_at > created_at فقط
-- مع الحفاظ على الحد الأقصى 7 أيام
-- =====================================================

-- 1. حذف constraint القديم
ALTER TABLE membership_invitations 
DROP CONSTRAINT IF EXISTS valid_expiry;

-- 2. إضافة constraint الجديد المحسّن
ALTER TABLE membership_invitations 
ADD CONSTRAINT valid_expiry CHECK (
    expires_at > created_at AND
    expires_at <= created_at + INTERVAL '7 days'
);

-- ملاحظة: هذا التغيير يسمح بإنشاء دعوات بأي مدة أكبر من 0 وحتى 7 أيام
-- التحقق من الحد الأدنى 24 ساعة يتم في الكود البرمجي (JavaScript)
