-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260420012657   الاسم: candidate_status_machine

CREATE OR REPLACE FUNCTION enforce_candidate_status_transition()
RETURNS TRIGGER AS $$
DECLARE
    v_allowed BOOLEAN := false;
BEGIN
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    v_allowed := CASE
        WHEN OLD.status = 'pending'    AND NEW.status IN ('approved','rejected','needs_edit','withdrawn') THEN true
        WHEN OLD.status = 'needs_edit' AND NEW.status IN ('pending','withdrawn')                          THEN true
        WHEN OLD.status = 'approved'   AND NEW.status IN ('withdrawn')                                    THEN true
        ELSE false
    END;

    IF NOT v_allowed THEN
        RAISE EXCEPTION 'انتقال غير مسموح في حالة المرشّح: % → %', OLD.status, NEW.status
            USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_candidate_status_transition ON election_candidates;
CREATE TRIGGER trg_enforce_candidate_status_transition
    BEFORE UPDATE OF status ON election_candidates
    FOR EACH ROW
    EXECUTE FUNCTION enforce_candidate_status_transition();
