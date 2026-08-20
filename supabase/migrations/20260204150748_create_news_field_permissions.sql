-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260204150748   الاسم: create_news_field_permissions

-- جدول صلاحيات الحقول للأخبار
CREATE TABLE IF NOT EXISTS news_field_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id uuid NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  writer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  is_editable boolean DEFAULT true,
  is_required boolean DEFAULT false,
  field_label text,
  field_type text DEFAULT 'text',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إضافة indexes
CREATE INDEX IF NOT EXISTS idx_news_field_permissions_news_id ON news_field_permissions(news_id);
CREATE INDEX IF NOT EXISTS idx_news_field_permissions_writer_id ON news_field_permissions(writer_id);

-- تعليق
COMMENT ON TABLE news_field_permissions IS 'صلاحيات الحقول - يحدد أي حقول يمكن للكتّاب تعديلها';

-- تفعيل RLS
ALTER TABLE news_field_permissions ENABLE ROW LEVEL SECURITY;

-- سياسات RLS
CREATE POLICY "الجميع يمكنهم قراءة صلاحيات الحقول" ON news_field_permissions
  FOR SELECT USING (true);

CREATE POLICY "القادة يمكنهم إدارة صلاحيات الحقول" ON news_field_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.role_name IN ('club_president', 'committee_leader', 'committee_deputy')
      AND ur.is_active = true
    )
  );
