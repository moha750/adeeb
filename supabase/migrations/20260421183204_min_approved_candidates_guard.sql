-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260421183204   الاسم: min_approved_candidates_guard

CREATE OR REPLACE FUNCTION enforce_election_status_transition()
RETURNS TRIGGER AS $$
DECLARE
    v_allowed  BOOLEAN := false;
    v_approved INTEGER := 0;
BEGIN
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    v_allowed := CASE
        WHEN OLD.status = 'draft'             AND NEW.status IN ('candidacy_open','cancelled')                  THEN true
        WHEN OLD.status = 'candidacy_open'    AND NEW.status IN ('candidacy_closed','cancelled')                THEN true
        WHEN OLD.status = 'candidacy_closed'  AND NEW.status IN ('voting_open','candidacy_open','cancelled')    THEN true
        WHEN OLD.status = 'voting_open'       AND NEW.status IN ('voting_closed','cancelled')                   THEN true
        WHEN OLD.status = 'voting_closed'     AND NEW.status IN ('completed','cancelled')                       THEN true
        ELSE false
    END;

    IF NOT v_allowed THEN
        RAISE EXCEPTION 'انتقال غير مسموح في حالة الانتخاب: % → %', OLD.status, NEW.status
            USING ERRCODE = 'P0001';
    END IF;

    IF OLD.status = 'candidacy_closed' AND NEW.status = 'voting_open' THEN
        SELECT COUNT(*) INTO v_approved
        FROM election_candidates
        WHERE election_id = NEW.id AND status = 'approved';

        IF v_approved < 2 THEN
            RAISE EXCEPTION 'لا يمكن فتح باب التصويت: يلزم وجود مرشحَين معتمدَين على الأقل (الحالي: %)', v_approved
                USING ERRCODE = 'P0001';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
