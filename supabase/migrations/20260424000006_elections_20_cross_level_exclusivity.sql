-- =============================================
-- نظام الانتخابات — 20: حصر المستويات (قسم ↔ لجانه)
-- =============================================
-- القاعدة الحوكمية:
--   • لا يُفتح انتخاب رئيس قسم إن كانت توجد انتخابات نشطة في لجانه.
--   • لا يُفتح انتخاب لجنة إن كان يوجد انتخاب نشط لرئيس قسمها.
--
-- لا يمكن التعبير عنها بـ UNIQUE INDEX لأنها تعبر مستويين من الجدول
-- عبر FK (committees.department_id). نستخدم BEFORE trigger.
-- =============================================

CREATE OR REPLACE FUNCTION public.enforce_election_scope_exclusivity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    -- إن كانت الحالة نهائية أو الصف مُؤرشف، لا فحص
    IF NEW.status IN ('completed','cancelled') OR NEW.archived_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- (1) انتخاب على مستوى القسم: لا يُقبل إن كان في أي لجنة تابعة
    --     انتخاب نشط
    IF NEW.target_department_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1
            FROM elections e
            JOIN committees c ON c.id = e.target_committee_id
            WHERE c.department_id = NEW.target_department_id
              AND e.archived_at IS NULL
              AND e.status NOT IN ('completed','cancelled')
              AND e.id IS DISTINCT FROM NEW.id
        ) THEN
            RAISE EXCEPTION 'لا يمكن فتح انتخاب لرئيس القسم بينما توجد انتخابات نشطة في إحدى لجانه.';
        END IF;
    END IF;

    -- (2) انتخاب على مستوى اللجنة: لا يُقبل إن كان للقسم الأب
    --     انتخاب رئيس قسم نشط
    IF NEW.target_committee_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1
            FROM elections e
            JOIN committees c ON c.id = NEW.target_committee_id
            WHERE e.target_department_id = c.department_id
              AND e.archived_at IS NULL
              AND e.status NOT IN ('completed','cancelled')
              AND e.id IS DISTINCT FROM NEW.id
        ) THEN
            RAISE EXCEPTION 'لا يمكن فتح انتخاب للجنة بينما يوجد انتخاب نشط لرئيس قسمها.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_election_scope_exclusivity ON elections;

CREATE TRIGGER trg_enforce_election_scope_exclusivity
    BEFORE INSERT OR UPDATE OF target_committee_id, target_department_id, status, archived_at
    ON elections
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_election_scope_exclusivity();
