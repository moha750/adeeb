-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260201023631   الاسم: add_detailed_stats_to_archived_cycles

-- إضافة حقل detailed_stats إلى جدول archived_membership_cycles
ALTER TABLE archived_membership_cycles 
ADD COLUMN IF NOT EXISTS detailed_stats jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN archived_membership_cycles.detailed_stats IS 'إحصائيات تفصيلية للدورة المؤرشفة';
