-- =============================================
-- قواعد أهلية الترشح — الحماية على مستوى قاعدة البيانات
-- =============================================
-- 1) عضوية الوحدة المستهدفة إلزامية
-- 2) أصحاب المناصب العليا ممنوعون من الترشح
-- 3) قائد اللجنة لا يترشح لنائب نفس اللجنة
-- 4) رئيس القسم لا يترشح لمنصب في لجنة تتبع قسمه
-- 5) طلب ترشح واحد نشط فقط في أي وقت
-- =============================================

CREATE OR REPLACE FUNCTION enforce_candidacy_eligibility()
RETURNS TRIGGER AS $$
DECLARE
    v_target_role_name        TEXT;
    v_target_committee_id     INTEGER;
    v_target_department_id    INTEGER;
    v_committee_department_id INTEGER;
    v_count                   INTEGER;
BEGIN
    SELECT r.role_name, e.target_committee_id, e.target_department_id
      INTO v_target_role_name, v_target_committee_id, v_target_department_id
      FROM elections e
      JOIN roles r ON e.target_role_id = r.id
     WHERE e.id = NEW.election_id;

    -- (1) عضوية الوحدة المستهدفة
    IF v_target_committee_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_count
          FROM user_roles ur
         WHERE ur.user_id      = NEW.user_id
           AND ur.is_active    = true
           AND ur.committee_id = v_target_committee_id;
        IF v_count = 0 THEN
            RAISE EXCEPTION 'لا يحق لك الترشح لهذه اللجنة لأنك لست عضواً فيها'
                USING ERRCODE = 'P0001';
        END IF;
    ELSIF v_target_department_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_count
          FROM user_roles ur
         WHERE ur.user_id       = NEW.user_id
           AND ur.is_active     = true
           AND ur.department_id = v_target_department_id;
        IF v_count = 0 THEN
            RAISE EXCEPTION 'لا يحق لك الترشح لهذا القسم لأنك لست عضواً فيه'
                USING ERRCODE = 'P0001';
        END IF;
    END IF;

    -- (2) أصحاب المناصب العليا ممنوعون
    SELECT COUNT(*) INTO v_count
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
     WHERE ur.user_id   = NEW.user_id
       AND ur.is_active = true
       AND r.role_name IN (
           'club_president',
           'president_advisor',
           'executive_council_president',
           'hr_committee_leader',
           'qa_committee_leader',
           'hr_admin_member',
           'qa_admin_member'
       );
    IF v_count > 0 THEN
        RAISE EXCEPTION 'لا يحق لك الترشح لأنك تشغل منصباً قيادياً يمنع الترشح — يجب التنازل عنه أولاً'
            USING ERRCODE = 'P0001';
    END IF;

    -- (3) قائد اللجنة → نائب نفس اللجنة
    IF v_target_role_name = 'deputy_committee_leader'
       AND v_target_committee_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_count
          FROM user_roles ur
          JOIN roles r ON ur.role_id = r.id
         WHERE ur.user_id      = NEW.user_id
           AND ur.is_active    = true
           AND r.role_name     = 'committee_leader'
           AND ur.committee_id = v_target_committee_id;
        IF v_count > 0 THEN
            RAISE EXCEPTION 'لا يحق لك الترشح لمنصب نائب القائد لأنك تشغل منصب القائد في نفس اللجنة'
                USING ERRCODE = 'P0001';
        END IF;
    END IF;

    -- (4) رئيس القسم → منصب في لجنة تتبع قسمه
    IF v_target_role_name IN ('committee_leader', 'deputy_committee_leader')
       AND v_target_committee_id IS NOT NULL THEN
        SELECT c.department_id INTO v_committee_department_id
          FROM committees c
         WHERE c.id = v_target_committee_id;

        IF v_committee_department_id IS NOT NULL THEN
            SELECT COUNT(*) INTO v_count
              FROM user_roles ur
              JOIN roles r ON ur.role_id = r.id
             WHERE ur.user_id       = NEW.user_id
               AND ur.is_active     = true
               AND r.role_name      = 'department_head'
               AND ur.department_id = v_committee_department_id;
            IF v_count > 0 THEN
                RAISE EXCEPTION 'لا يحق لك الترشح لمنصب في لجنة تتبع قسماً ترأسه'
                    USING ERRCODE = 'P0001';
            END IF;
        END IF;
    END IF;

    -- (5) طلب ترشح نشط واحد فقط في أي وقت (عند الإنشاء)
    IF TG_OP = 'INSERT' THEN
        SELECT COUNT(*) INTO v_count
          FROM election_candidates ec
          JOIN elections e2 ON ec.election_id = e2.id
         WHERE ec.user_id = NEW.user_id
           AND ec.status IN ('pending', 'needs_edit', 'approved')
           AND e2.status NOT IN ('completed', 'cancelled');
        IF v_count > 0 THEN
            RAISE EXCEPTION 'لديك طلب ترشح نشط حالياً — لا يمكن تقديم طلب جديد حتى يُحسم السابق'
                USING ERRCODE = 'P0001';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_candidacy_eligibility ON election_candidates;
CREATE TRIGGER trg_enforce_candidacy_eligibility
    BEFORE INSERT OR UPDATE OF election_id, user_id ON election_candidates
    FOR EACH ROW
    EXECUTE FUNCTION enforce_candidacy_eligibility();
