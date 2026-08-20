-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260421183141   الاسم: allow_reopen_candidacy

CREATE OR REPLACE FUNCTION enforce_election_status_transition()
RETURNS TRIGGER AS $$
DECLARE
    v_allowed BOOLEAN := false;
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

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
