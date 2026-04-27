-- =============================================
-- توسيع قائمة أنواع النشاط لتشمل "جلسة حوارية"
-- =============================================
-- السياق: واجهة الإدارة باتت تعرض نوعين فقط (ورشة، جلسة حوارية).
-- نُبقي القيم القديمة ('activity','program') مسموحة في DB لتفادي
-- كسر الصفوف الموجودة، ونضيف 'dialogue' كقيمة جديدة.

ALTER TABLE activities
    DROP CONSTRAINT IF EXISTS activities_activity_type_check;

ALTER TABLE activities
    ADD CONSTRAINT activities_activity_type_check
    CHECK (activity_type IN ('activity','program','workshop','dialogue'));
