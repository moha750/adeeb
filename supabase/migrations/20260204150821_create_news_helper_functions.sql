-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260204150821   الاسم: create_news_helper_functions

-- دالة للتحقق من صلاحيات الكتابة على حقل معين
CREATE OR REPLACE FUNCTION can_writer_edit_field(
  p_news_id uuid,
  p_writer_id uuid,
  p_field_name text
) RETURNS boolean AS $$
BEGIN
  -- إذا كان قائد أو نائب، يمكنه تعديل كل شيء
  IF EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_writer_id
    AND r.role_name IN ('club_president', 'committee_leader', 'committee_deputy')
    AND ur.is_active = true
  ) THEN
    RETURN true;
  END IF;

  -- التحقق من صلاحيات الحقل
  RETURN EXISTS (
    SELECT 1 FROM news_field_permissions
    WHERE news_id = p_news_id
    AND (writer_id = p_writer_id OR writer_id IS NULL)
    AND field_name = p_field_name
    AND is_editable = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لتسجيل نشاط على خبر
CREATE OR REPLACE FUNCTION log_news_activity(
  p_news_id uuid,
  p_action text,
  p_details jsonb DEFAULT '{}'
) RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO news_activity_log (news_id, user_id, action, details)
  VALUES (p_news_id, auth.uid(), p_action, p_details)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة للحصول على عدد الكتّاب الذين أكملوا عملهم
CREATE OR REPLACE FUNCTION get_completed_writers_count(p_news_id uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM news_writer_assignments
    WHERE news_id = p_news_id
    AND status = 'completed'
  );
END;
$$ LANGUAGE plpgsql;

-- دالة للحصول على إجمالي الكتّاب المعينين
CREATE OR REPLACE FUNCTION get_total_writers_count(p_news_id uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM news_writer_assignments
    WHERE news_id = p_news_id
  );
END;
$$ LANGUAGE plpgsql;

-- Trigger لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إضافة triggers
DROP TRIGGER IF EXISTS update_news_writer_assignments_updated_at ON news_writer_assignments;
CREATE TRIGGER update_news_writer_assignments_updated_at
  BEFORE UPDATE ON news_writer_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_news_field_permissions_updated_at ON news_field_permissions;
CREATE TRIGGER update_news_field_permissions_updated_at
  BEFORE UPDATE ON news_field_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_news_collab_comments_updated_at ON news_collaboration_comments;
CREATE TRIGGER update_news_collab_comments_updated_at
  BEFORE UPDATE ON news_collaboration_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
