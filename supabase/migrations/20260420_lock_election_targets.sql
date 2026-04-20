-- =============================================
-- قفل حقول الهدف (target_role_id, target_committee_id, target_department_id)
-- بعد انتقال الانتخاب إلى candidacy_open
-- المبرّر: أي تعديل بعد فتح الترشح يكسر أهلية المرشحين الموجودين.
-- إذا احتاج الأدمن التعديل → يجب إلغاء الانتخاب وإنشاء جديد.
-- =============================================

CREATE OR REPLACE FUNCTION lock_election_targets()
RETURNS TRIGGER AS $$
BEGIN
    -- قبل candidacy_open والانتقالات الأعلى: كل شيء قابل للتعديل
    IF OLD.status = 'draft' THEN
        RETURN NEW;
    END IF;

    -- إذا كان الانتخاب خرج عن draft، لا يُسمح بتعديل الحقول الهدفية
    IF OLD.target_role_id       IS DISTINCT FROM NEW.target_role_id
       OR OLD.target_committee_id  IS DISTINCT FROM NEW.target_committee_id
       OR OLD.target_department_id IS DISTINCT FROM NEW.target_department_id THEN
        RAISE EXCEPTION 'لا يمكن تعديل منصب/لجنة/قسم الانتخاب بعد فتح الترشح — ألغِ الانتخاب وأنشئ واحداً جديداً'
            USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lock_election_targets ON elections;
CREATE TRIGGER trg_lock_election_targets
    BEFORE UPDATE OF target_role_id, target_committee_id, target_department_id ON elections
    FOR EACH ROW
    EXECUTE FUNCTION lock_election_targets();
