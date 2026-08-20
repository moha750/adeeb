-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260204150757   الاسم: create_news_collaboration_comments

-- جدول التعليقات التعاونية على الأخبار (بين القادة والكتّاب)
CREATE TABLE IF NOT EXISTS news_collaboration_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id uuid NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id),
  comment_text text NOT NULL,
  is_internal boolean DEFAULT true,
  parent_comment_id uuid REFERENCES news_collaboration_comments(id) ON DELETE CASCADE,
  mentioned_users uuid[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- إضافة indexes
CREATE INDEX IF NOT EXISTS idx_news_collab_comments_news_id ON news_collaboration_comments(news_id);
CREATE INDEX IF NOT EXISTS idx_news_collab_comments_user_id ON news_collaboration_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_news_collab_comments_created_at ON news_collaboration_comments(created_at DESC);

-- تعليق
COMMENT ON TABLE news_collaboration_comments IS 'تعليقات داخلية بين القادة والكتّاب على الأخبار';

-- تفعيل RLS
ALTER TABLE news_collaboration_comments ENABLE ROW LEVEL SECURITY;

-- سياسات RLS
CREATE POLICY "المشاركون يمكنهم رؤية التعليقات" ON news_collaboration_comments
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM news_writer_assignments nwa
      WHERE nwa.news_id = news_collaboration_comments.news_id
      AND nwa.writer_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.role_name IN ('club_president', 'committee_leader', 'committee_deputy')
      AND ur.is_active = true
    )
  );

CREATE POLICY "المشاركون يمكنهم إضافة تعليقات" ON news_collaboration_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND (
      EXISTS (
        SELECT 1 FROM news_writer_assignments nwa
        WHERE nwa.news_id = news_collaboration_comments.news_id
        AND nwa.writer_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('club_president', 'committee_leader', 'committee_deputy')
        AND ur.is_active = true
      )
    )
  );

CREATE POLICY "صاحب التعليق يمكنه التعديل والحذف" ON news_collaboration_comments
  FOR UPDATE USING (auth.uid() = user_id);
