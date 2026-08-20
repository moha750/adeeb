-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260318185710   الاسم: create_stats_table

-- جدول الإحصائيات
CREATE TABLE IF NOT EXISTS stats (
    id SERIAL PRIMARY KEY,
    stat_type VARCHAR(50) NOT NULL UNIQUE,
    count BIGINT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إدراج القيم الأولية
INSERT INTO stats (stat_type, count) 
VALUES 
    ('visitors', 0),
    ('downloads', 0)
ON CONFLICT (stat_type) DO NOTHING;

-- دالة لزيادة العداد
CREATE OR REPLACE FUNCTION increment_stat(p_stat_type VARCHAR)
RETURNS BIGINT AS $$
DECLARE
    new_count BIGINT;
BEGIN
    UPDATE stats 
    SET count = count + 1, 
        updated_at = NOW()
    WHERE stat_type = p_stat_type
    RETURNING count INTO new_count;
    
    RETURN new_count;
END;
$$ LANGUAGE plpgsql;

-- السماح بالقراءة للجميع
ALTER TABLE stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON stats
    FOR SELECT USING (true);

CREATE POLICY "Allow public increment" ON stats
    FOR UPDATE USING (true);

