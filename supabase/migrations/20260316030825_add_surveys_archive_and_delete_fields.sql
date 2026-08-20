-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260316030825   الاسم: add_surveys_archive_and_delete_fields

-- إضافة حقول الأرشفة والحذف لجدول الاستبيانات
ALTER TABLE surveys 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS permanent_delete_at TIMESTAMPTZ;

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_surveys_archived ON surveys(is_archived) WHERE is_archived = TRUE;
CREATE INDEX IF NOT EXISTS idx_surveys_deleted ON surveys(is_deleted) WHERE is_deleted = TRUE;
CREATE INDEX IF NOT EXISTS idx_surveys_permanent_delete ON surveys(permanent_delete_at) WHERE permanent_delete_at IS NOT NULL;

-- إضافة تعليقات توضيحية
COMMENT ON COLUMN surveys.is_archived IS 'هل الاستبيان مؤرشف';
COMMENT ON COLUMN surveys.archived_at IS 'تاريخ الأرشفة';
COMMENT ON COLUMN surveys.archived_by IS 'المستخدم الذي قام بالأرشفة';
COMMENT ON COLUMN surveys.is_deleted IS 'هل الاستبيان محذوف (حذف مؤقت)';
COMMENT ON COLUMN surveys.deleted_at IS 'تاريخ الحذف المؤقت';
COMMENT ON COLUMN surveys.deleted_by IS 'المستخدم الذي قام بالحذف';
COMMENT ON COLUMN surveys.permanent_delete_at IS 'تاريخ الحذف النهائي المجدول (بعد 30 يوم من الحذف المؤقت)';
