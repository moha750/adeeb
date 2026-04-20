-- =============================================
-- حماية التصويت على مستوى قاعدة البيانات
-- (1) الانتخاب يجب أن يكون في حالة voting_open
-- (2) المصوّت عضو فعّال في الوحدة المستهدفة (لجنة أو قسم)
-- (3) المرشّح المُصوَّت له مقبول وفي هذا الانتخاب
-- (4) لا يمكن التصويت للنفس
-- =============================================

CREATE OR REPLACE FUNCTION enforce_vote_eligibility()
RETURNS TRIGGER AS $$
DECLARE
    v_election_status       TEXT;
    v_target_committee_id   INTEGER;
    v_target_department_id  INTEGER;
    v_candidate_election_id UUID;
    v_candidate_status      TEXT;
    v_candidate_user_id     UUID;
    v_count                 INTEGER;
BEGIN
    SELECT status, target_committee_id, target_department_id
      INTO v_election_status, v_target_committee_id, v_target_department_id
      FROM elections
     WHERE id = NEW.election_id;

    IF v_election_status IS NULL THEN
        RAISE EXCEPTION 'الانتخاب غير موجود' USING ERRCODE = 'P0001';
    END IF;

    -- (1) يجب أن يكون التصويت مفتوحًا
    IF v_election_status <> 'voting_open' THEN
        RAISE EXCEPTION 'لا يمكن التصويت الآن — الانتخاب ليس في مرحلة التصويت المفتوح'
            USING ERRCODE = 'P0001';
    END IF;

    -- (2) المصوّت عضو فعّال في الوحدة المستهدفة
    IF v_target_committee_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_count
          FROM user_roles ur
         WHERE ur.user_id      = NEW.voter_id
           AND ur.is_active    = true
           AND ur.committee_id = v_target_committee_id;
        IF v_count = 0 THEN
            RAISE EXCEPTION 'لا يحق لك التصويت لأنك لست عضواً فعّالاً في اللجنة المستهدفة'
                USING ERRCODE = 'P0001';
        END IF;
    ELSIF v_target_department_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_count
          FROM user_roles ur
          LEFT JOIN committees c ON c.id = ur.committee_id
         WHERE ur.user_id   = NEW.voter_id
           AND ur.is_active = true
           AND (ur.department_id = v_target_department_id
                OR c.department_id = v_target_department_id);
        IF v_count = 0 THEN
            RAISE EXCEPTION 'لا يحق لك التصويت لأنك لست عضواً فعّالاً في القسم المستهدف'
                USING ERRCODE = 'P0001';
        END IF;
    END IF;

    -- (3) المرشّح المُصوَّت له في هذا الانتخاب ومقبول
    SELECT election_id, status, user_id
      INTO v_candidate_election_id, v_candidate_status, v_candidate_user_id
      FROM election_candidates
     WHERE id = NEW.candidate_id;

    IF v_candidate_election_id IS NULL THEN
        RAISE EXCEPTION 'المرشّح غير موجود' USING ERRCODE = 'P0001';
    END IF;

    IF v_candidate_election_id <> NEW.election_id THEN
        RAISE EXCEPTION 'المرشّح لا ينتمي لهذا الانتخاب' USING ERRCODE = 'P0001';
    END IF;

    IF v_candidate_status <> 'approved' THEN
        RAISE EXCEPTION 'المرشّح غير مقبول — لا يمكن التصويت له' USING ERRCODE = 'P0001';
    END IF;

    -- (4) لا تصويت للنفس
    IF v_candidate_user_id = NEW.voter_id THEN
        RAISE EXCEPTION 'لا يمكنك التصويت لنفسك' USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_vote_eligibility ON election_votes;
CREATE TRIGGER trg_enforce_vote_eligibility
    BEFORE INSERT ON election_votes
    FOR EACH ROW
    EXECUTE FUNCTION enforce_vote_eligibility();

-- منع تعديل الأصوات بعد الإدراج (المبدأ: الصوت نهائي)
CREATE OR REPLACE FUNCTION prevent_vote_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'لا يمكن تعديل صوت بعد إدراجه' USING ERRCODE = 'P0001';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_vote_update ON election_votes;
CREATE TRIGGER trg_prevent_vote_update
    BEFORE UPDATE ON election_votes
    FOR EACH ROW
    EXECUTE FUNCTION prevent_vote_update();
