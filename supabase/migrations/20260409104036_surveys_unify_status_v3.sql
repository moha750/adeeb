-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260409104036   الاسم: surveys_unify_status_v3


-- ═══════════════════════════════════════════════════════════════
-- الخطوة 1: توسيع CHECK constraint ليشمل 'deleted'
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE surveys DROP CONSTRAINT IF EXISTS surveys_status_check;
ALTER TABLE surveys ADD CONSTRAINT surveys_status_check
    CHECK (status = ANY (ARRAY['draft','active','paused','closed','archived','deleted']));

-- ═══════════════════════════════════════════════════════════════
-- الخطوة 2: ترحيل البيانات
-- ═══════════════════════════════════════════════════════════════

UPDATE surveys SET status = 'deleted'  WHERE COALESCE(is_deleted, false) = true;
UPDATE surveys SET status = 'archived' WHERE COALESCE(is_archived, false) = true AND COALESCE(is_deleted, false) = false;

-- ═══════════════════════════════════════════════════════════════
-- الخطوة 3: حذف السياسة المعتمدة على الأعمدة القديمة أولاً
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS surveys_select_all ON public.surveys;

-- ═══════════════════════════════════════════════════════════════
-- الخطوة 4: حذف الأعمدة القديمة
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE surveys DROP COLUMN IF EXISTS is_archived;
ALTER TABLE surveys DROP COLUMN IF EXISTS is_deleted;

-- ═══════════════════════════════════════════════════════════════
-- الخطوة 5: إعادة إنشاء سياسة SELECT النظيفة
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY surveys_select_all ON public.surveys
    FOR SELECT
    TO public
    USING (
        status IN ('published', 'active')
        OR (auth.uid() = created_by)
    );

