-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260204150808   الاسم: update_news_rls_policies

-- تحديث سياسات RLS لجدول news لتتوافق مع النظام الجديد

-- حذف السياسات القديمة إن وجدت
DROP POLICY IF EXISTS "الجميع يمكنهم قراءة الأخبار المنشورة" ON news;
DROP POLICY IF EXISTS "المسؤولون يمكنهم إدارة الأخبار" ON news;

-- سياسة القراءة: الأخبار المنشورة للجميع، والباقي للمعنيين فقط
CREATE POLICY "قراءة الأخبار حسب الصلاحيات" ON news
  FOR SELECT USING (
    status = 'published' OR
    workflow_status = 'published' OR
    created_by = auth.uid() OR
    auth.uid() = ANY(assigned_writers) OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.role_name IN ('club_president', 'committee_leader', 'committee_deputy')
      AND ur.is_active = true
      AND (ur.committee_id = news.committee_id OR r.role_name = 'club_president')
    )
  );

-- سياسة الإنشاء: القادة فقط
CREATE POLICY "إنشاء الأخبار للقادة فقط" ON news
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.role_name IN ('club_president', 'committee_leader', 'committee_deputy')
      AND ur.is_active = true
    )
  );

-- سياسة التعديل: القادة أو الكتّاب المعينين (حسب الحقول المتاحة)
CREATE POLICY "تعديل الأخبار حسب الصلاحيات" ON news
  FOR UPDATE USING (
    created_by = auth.uid() OR
    auth.uid() = ANY(assigned_writers) OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.role_name IN ('club_president', 'committee_leader', 'committee_deputy')
      AND ur.is_active = true
      AND (ur.committee_id = news.committee_id OR r.role_name = 'club_president')
    )
  );

-- سياسة الحذف: القادة فقط
CREATE POLICY "حذف الأخبار للقادة فقط" ON news
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.role_name IN ('club_president', 'committee_leader', 'committee_deputy')
      AND ur.is_active = true
      AND (ur.committee_id = news.committee_id OR r.role_name = 'club_president')
    )
  );
