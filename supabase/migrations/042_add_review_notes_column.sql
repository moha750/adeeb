-- إضافة عمود review_notes لحفظ ملاحظات المراجعة بشكل منفصل
-- هذا العمود يُستخدم لحفظ ملاحظات "قيد المراجعة" قبل اتخاذ القرار النهائي

ALTER TABLE membership_applications
ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- إضافة تعليق توضيحي للعمود
COMMENT ON COLUMN membership_applications.review_notes IS 'ملاحظات المراجعة المؤقتة عند وضع الطلب قيد المراجعة، يتم دمجها مع admin_notes عند اتخاذ القرار النهائي';
