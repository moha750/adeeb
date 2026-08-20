-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260204014345   الاسم: create_board_members_table

-- إنشاء جدول أعضاء المجلس الإداري والتنفيذي
CREATE TABLE IF NOT EXISTS board_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    position_title TEXT NOT NULL,
    position_type TEXT NOT NULL CHECK (position_type IN ('supreme_council', 'administrative_council', 'executive_council')),
    image_url TEXT,
    bio TEXT,
    social_links JSONB DEFAULT '{}',
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- إنشاء فهرس للترتيب والنوع
CREATE INDEX IF NOT EXISTS idx_board_members_type_order ON board_members(position_type, display_order);
CREATE INDEX IF NOT EXISTS idx_board_members_active ON board_members(is_active);

-- تفعيل RLS
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;

-- سياسات RLS
CREATE POLICY "Anyone can view active board members"
    ON board_members FOR SELECT
    USING (is_active = true);

CREATE POLICY "Authenticated users can manage board members"
    ON board_members FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_board_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS board_members_updated_at_trigger ON board_members;
CREATE TRIGGER board_members_updated_at_trigger
    BEFORE UPDATE ON board_members
    FOR EACH ROW
    EXECUTE FUNCTION update_board_members_updated_at();

-- إدراج بيانات تجريبية (يمكن حذفها لاحقاً)
INSERT INTO board_members (full_name, position_title, position_type, display_order) VALUES
('رئيس النادي', 'رئيس النادي', 'supreme_council', 1),
('نائب الرئيس', 'نائب الرئيس', 'supreme_council', 2),
('مدير المجلس الإداري', 'مدير المجلس الإداري', 'administrative_council', 1),
('نائب مدير المجلس الإداري', 'نائب مدير المجلس الإداري', 'administrative_council', 2),
('مدير المجلس التنفيذي', 'مدير المجلس التنفيذي', 'executive_council', 1),
('نائب مدير المجلس التنفيذي', 'نائب مدير المجلس التنفيذي', 'executive_council', 2)
ON CONFLICT DO NOTHING;
