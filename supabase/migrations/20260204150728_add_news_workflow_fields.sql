-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260204150728   الاسم: add_news_workflow_fields

-- إضافة حقول workflow للجدول الحالي news
ALTER TABLE news 
ADD COLUMN IF NOT EXISTS workflow_status text DEFAULT 'draft' 
  CHECK (workflow_status IN ('draft', 'assigned', 'in_progress', 'ready_for_review', 'published', 'archived')),
ADD COLUMN IF NOT EXISTS assigned_writers uuid[],
ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
ADD COLUMN IF NOT EXISTS available_fields jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
ADD COLUMN IF NOT EXISTS committee_id integer REFERENCES committees(id),
ADD COLUMN IF NOT EXISTS review_notes text,
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- إضافة تعليقات للحقول الجديدة
COMMENT ON COLUMN news.workflow_status IS 'حالة سير العمل: draft, assigned, in_progress, ready_for_review, published, archived';
COMMENT ON COLUMN news.assigned_writers IS 'معرفات الكتّاب المعينين للخبر';
COMMENT ON COLUMN news.assigned_by IS 'من قام بتعيين الكتّاب';
COMMENT ON COLUMN news.assigned_at IS 'وقت تعيين الكتّاب';
COMMENT ON COLUMN news.available_fields IS 'الحقول المتاحة للكتّاب للتعديل';
COMMENT ON COLUMN news.submitted_at IS 'وقت إرسال الخبر للمراجعة';
COMMENT ON COLUMN news.reviewed_by IS 'من راجع الخبر';
COMMENT ON COLUMN news.reviewed_at IS 'وقت المراجعة';
COMMENT ON COLUMN news.committee_id IS 'اللجنة المسؤولة عن الخبر';
COMMENT ON COLUMN news.review_notes IS 'ملاحظات المراجعة';
COMMENT ON COLUMN news.rejection_reason IS 'سبب الرفض إن وجد';
