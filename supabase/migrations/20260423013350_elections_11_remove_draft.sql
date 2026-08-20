-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260423013350   الاسم: elections_11_remove_draft

-- =============================================
-- نظام الانتخابات — 11: إلغاء مرحلة draft بشكل نهائي
-- =============================================
-- الانتخاب يُنشأ مباشرة في candidacy_open. لا توجد مسودة.

-- 1) حذف أي انتخابات في draft (مؤقتة، بلا مرشحين ولا أصوات)
DELETE FROM elections WHERE status = 'draft';

-- 2) تحديث CHECK constraint لإزالة draft
ALTER TABLE elections DROP CONSTRAINT IF EXISTS elections_status_check;
ALTER TABLE elections ADD CONSTRAINT elections_status_check
    CHECK (status IN ('candidacy_open','candidacy_closed','voting_open','voting_closed','completed','cancelled'));

-- 3) تغيير DEFAULT للحالة + candidacy_opened_at تلقائياً
ALTER TABLE elections ALTER COLUMN status SET DEFAULT 'candidacy_open';
ALTER TABLE elections ALTER COLUMN candidacy_opened_at SET DEFAULT now();

-- 4) إعادة تعريف آلة الحالة (بدون draft → candidacy_open)
CREATE OR REPLACE FUNCTION enforce_election_status_transition()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ok BOOLEAN := false;
BEGIN
    IF OLD.status = NEW.status THEN RETURN NEW; END IF;

    IF NEW.status = 'cancelled' THEN
        IF OLD.status = 'completed' THEN
            RAISE EXCEPTION 'لا يمكن إلغاء انتخاب مكتمل';
        END IF;
        RETURN NEW;
    END IF;

    IF OLD.status = 'candidacy_open' AND NEW.status = 'candidacy_closed' THEN
        v_ok := true;
    ELSIF OLD.status = 'candidacy_closed' AND NEW.status = 'candidacy_open' THEN
        v_ok := true;
    ELSIF OLD.status = 'candidacy_closed' AND NEW.status = 'voting_open' THEN
        v_ok := true;
        NEW.voting_opened_at := COALESCE(NEW.voting_opened_at, now());
    ELSIF OLD.status = 'voting_open' AND NEW.status = 'voting_closed' THEN
        v_ok := true;
    ELSIF OLD.status = 'voting_closed' AND NEW.status = 'completed' THEN
        v_ok := true;
        IF NEW.winner_candidate_id IS NULL THEN
            RAISE EXCEPTION 'لا يمكن إنهاء الانتخاب دون إعلان فائز';
        END IF;
        NEW.winner_declared_at := COALESCE(NEW.winner_declared_at, now());
    END IF;

    IF NOT v_ok THEN
        RAISE EXCEPTION 'انتقال غير مسموح للحالة: % → %', OLD.status, NEW.status;
    END IF;

    RETURN NEW;
END;
$$;

-- 5) قفل الأهداف — دائماً على UPDATE (لا استثناء draft بعد الآن)
CREATE OR REPLACE FUNCTION lock_election_targets()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.target_role_name <> OLD.target_role_name
       OR NEW.target_committee_id IS DISTINCT FROM OLD.target_committee_id
       OR NEW.target_department_id IS DISTINCT FROM OLD.target_department_id THEN
        RAISE EXCEPTION 'لا يمكن تعديل منصب/نطاق الانتخاب بعد الإنشاء';
    END IF;
    RETURN NEW;
END;
$$;

-- 6) تبسيط سياسة القراءة العامة — لم يعد هناك حالة draft لإخفائها
DROP POLICY IF EXISTS elections_select_all    ON elections;
DROP POLICY IF EXISTS elections_select_drafts ON elections;

CREATE POLICY elections_select_all ON elections
    FOR SELECT TO authenticated
    USING (true);
