-- =============================================
-- حراسة إعلان الفائز
-- (1) الفائز يجب أن يكون مرشّحاً مقبولاً في نفس الانتخاب
-- (2) الحالة يجب أن تكون voting_closed عند الإعلان (winner_user_id != NULL)
-- (3) بمجرد تعيين الفائز، لا يمكن تغييره إلا بإلغاء الانتخاب
-- =============================================

CREATE OR REPLACE FUNCTION enforce_winner_declaration()
RETURNS TRIGGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- إذا لم يتغيّر الفائز فلا فحص
    IF (OLD.winner_user_id IS NOT DISTINCT FROM NEW.winner_user_id) THEN
        RETURN NEW;
    END IF;

    -- إذا أُلغي الفائز (NULL) فمسموح فقط عند إلغاء الانتخاب
    IF NEW.winner_user_id IS NULL THEN
        IF NEW.status <> 'cancelled' THEN
            RAISE EXCEPTION 'لا يمكن إزالة الفائز إلا عند إلغاء الانتخاب'
                USING ERRCODE = 'P0001';
        END IF;
        RETURN NEW;
    END IF;

    -- منع تغيير الفائز بعد تعيينه (إلا إذا كان قديمُه NULL)
    IF OLD.winner_user_id IS NOT NULL THEN
        RAISE EXCEPTION 'لا يمكن تغيير الفائز بعد تعيينه'
            USING ERRCODE = 'P0001';
    END IF;

    -- يجب أن تكون الحالة voting_closed أو الانتقال إلى completed
    IF NEW.status NOT IN ('voting_closed','completed') THEN
        RAISE EXCEPTION 'لا يمكن إعلان الفائز إلا عند إغلاق التصويت'
            USING ERRCODE = 'P0001';
    END IF;

    -- الفائز مرشّح مقبول في هذا الانتخاب
    SELECT COUNT(*) INTO v_count
      FROM election_candidates
     WHERE election_id = NEW.id
       AND user_id     = NEW.winner_user_id
       AND status      = 'approved';

    IF v_count = 0 THEN
        RAISE EXCEPTION 'الفائز المختار ليس مرشّحاً مقبولاً في هذا الانتخاب'
            USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_winner_declaration ON elections;
CREATE TRIGGER trg_enforce_winner_declaration
    BEFORE UPDATE OF winner_user_id ON elections
    FOR EACH ROW
    EXECUTE FUNCTION enforce_winner_declaration();
