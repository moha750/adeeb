-- =============================================
-- نظام الانتخابات — 21: منع إعادة الترشح بعد الانسحاب/الرفض
-- =============================================
-- القرار الحوكمي:
--   الانسحاب من انتخاب قرار نهائي في نفس الدورة. المستخدم الذي
--   انسحب (أو رُفض ترشحه) لا يحق له إعادة التقديم على نفس الانتخاب.
--   يستطيع الترشح في الدورة التالية بعد إغلاق/أرشفة الحالية.
--
-- التعديل:
--   نُضيف في is_user_eligible_to_run فحصاً لوجود أي صف سابق للمستخدم
--   على نفس الانتخاب (أيّاً كانت حالته). قيد UNIQUE(election_id, user_id)
--   يضمن أن وجود الصف = محاولة سابقة، والحالة تكون إما نشطة أو withdrawn
--   أو rejected.
-- =============================================

CREATE OR REPLACE FUNCTION is_user_eligible_to_run(p_user UUID, p_election UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_election     elections%ROWTYPE;
    v_has_higher   BOOLEAN;
    v_blocks       BOOLEAN;
    v_in_scope     BOOLEAN;
    v_has_active   BOOLEAN;
    v_has_prior    BOOLEAN;
BEGIN
    SELECT * INTO v_election FROM elections WHERE id = p_election;
    IF NOT FOUND OR v_election.status <> 'candidacy_open' OR v_election.archived_at IS NOT NULL THEN
        RETURN false;
    END IF;

    -- حظر الأدوار العليا (لا يحق لهم الترشح)
    SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = p_user AND ur.is_active
          AND r.role_name IN (
              'club_president','executive_council_president','president_advisor',
              'hr_committee_leader','qa_committee_leader',
              'hr_admin_member','qa_admin_member'
          )
    ) INTO v_has_higher;
    IF v_has_higher THEN RETURN false; END IF;

    -- قواعد الترقية/الحظر حسب نوع الانتخاب
    IF v_election.target_role_name = 'department_head' THEN
        SELECT EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = p_user AND ur.is_active
              AND r.role_name = 'department_head'
        ) INTO v_blocks;
        IF v_blocks THEN RETURN false; END IF;

        SELECT EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN committees c ON c.id = ur.committee_id
            WHERE ur.user_id = p_user AND ur.is_active
              AND c.department_id = v_election.target_department_id
        ) INTO v_in_scope;

    ELSIF v_election.target_role_name = 'committee_leader' THEN
        SELECT EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            JOIN committees c ON c.id = v_election.target_committee_id
            WHERE ur.user_id = p_user AND ur.is_active
              AND r.role_name = 'department_head'
              AND ur.department_id = c.department_id
        ) INTO v_blocks;
        IF v_blocks THEN RETURN false; END IF;

        SELECT EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = p_user AND ur.is_active
              AND r.role_name = 'committee_leader'
              AND ur.committee_id = v_election.target_committee_id
        ) INTO v_blocks;
        IF v_blocks THEN RETURN false; END IF;

        SELECT EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = p_user AND ur.is_active
              AND ur.committee_id = v_election.target_committee_id
        ) INTO v_in_scope;

    ELSE  -- deputy_committee_leader
        SELECT EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            JOIN committees c ON c.id = v_election.target_committee_id
            WHERE ur.user_id = p_user AND ur.is_active
              AND r.role_name = 'department_head'
              AND ur.department_id = c.department_id
        ) INTO v_blocks;
        IF v_blocks THEN RETURN false; END IF;

        SELECT EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = p_user AND ur.is_active
              AND r.role_name = 'committee_leader'
              AND ur.committee_id = v_election.target_committee_id
        ) INTO v_blocks;
        IF v_blocks THEN RETURN false; END IF;

        SELECT EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = p_user AND ur.is_active
              AND r.role_name = 'deputy_committee_leader'
              AND ur.committee_id = v_election.target_committee_id
        ) INTO v_blocks;
        IF v_blocks THEN RETURN false; END IF;

        SELECT EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = p_user AND ur.is_active
              AND ur.committee_id = v_election.target_committee_id
        ) INTO v_in_scope;
    END IF;

    IF NOT COALESCE(v_in_scope, false) THEN
        RETURN false;
    END IF;

    -- جديد: منع إعادة التقديم على نفس الانتخاب بعد انسحاب/رفض
    SELECT EXISTS (
        SELECT 1
        FROM election_candidates ec
        WHERE ec.election_id = p_election
          AND ec.user_id    = p_user
    ) INTO v_has_prior;
    IF v_has_prior THEN RETURN false; END IF;

    -- لا ترشح نشط آخر في انتخاب غير منتهٍ (عبر الانتخابات)
    SELECT EXISTS (
        SELECT 1
        FROM election_candidates ec
        JOIN elections e ON e.id = ec.election_id
        WHERE ec.user_id = p_user
          AND ec.status IN ('pending','approved','needs_edit')
          AND e.archived_at IS NULL
          AND e.status IN ('candidacy_open','candidacy_closed','voting_open','voting_closed')
    ) INTO v_has_active;

    RETURN NOT v_has_active;
END;
$$;
