-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260212204530   الاسم: create_elections_indexes_and_trigger

-- إنشاء فهارس للأداء على جدول elections
CREATE INDEX idx_elections_committee_id ON elections(committee_id);
CREATE INDEX idx_elections_status ON elections(status);
CREATE INDEX idx_elections_created_by ON elections(created_by);

-- Trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_elections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER elections_updated_at_trigger
    BEFORE UPDATE ON elections
    FOR EACH ROW
    EXECUTE FUNCTION update_elections_updated_at();
