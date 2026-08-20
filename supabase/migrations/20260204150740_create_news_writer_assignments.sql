-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260204150740   الاسم: create_news_writer_assignments

-- جدول تعيينات الكتّاب للأخبار
CREATE TABLE IF NOT EXISTS news_writer_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id uuid NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  writer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES profiles(id),
  assigned_at timestamptz DEFAULT now(),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'in_progress', 'completed')),
  notified boolean DEFAULT false,
  notification_sent_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  last_edited_at timestamptz,
  notes text,
  assignment_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(news_id, writer_id)
);

-- إضافة indexes للأداء
CREATE INDEX IF NOT EXISTS idx_news_writer_assignments_news_id ON news_writer_assignments(news_id);
CREATE INDEX IF NOT EXISTS idx_news_writer_assignments_writer_id ON news_writer_assignments(writer_id);
CREATE INDEX IF NOT EXISTS idx_news_writer_assignments_status ON news_writer_assignments(status);

-- إضافة تعليق للجدول
COMMENT ON TABLE news_writer_assignments IS 'جدول تعيينات الكتّاب للأخبار - يتتبع من تم تعيينه لكتابة كل خبر وحالة التعيين';

-- تفعيل RLS
ALTER TABLE news_writer_assignments ENABLE ROW LEVEL SECURITY;

-- سياسات RLS
CREATE POLICY "الكتّاب يمكنهم رؤية تعييناتهم" ON news_writer_assignments
  FOR SELECT USING (
    auth.uid() = writer_id OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.role_name IN ('club_president', 'committee_leader', 'committee_deputy')
      AND ur.is_active = true
    )
  );

CREATE POLICY "القادة يمكنهم إدارة التعيينات" ON news_writer_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.role_name IN ('club_president', 'committee_leader', 'committee_deputy')
      AND ur.is_active = true
    )
  );
