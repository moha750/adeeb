-- =============================================
-- نظام الانتخابات — 03: الدوال المساعدة
-- =============================================
-- دوال تُستخدم في RLS policies وTriggers وRPCs لاحقاً.

-- 1) صلاحية إدارة كاملة (manage_elections)
CREATE OR REPLACE FUNCTION has_election_admin_permission(p_user UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = p_user
          AND ur.is_active = true
          AND r.role_name IN ('club_president','executive_council_president','hr_committee_leader')
    );
$$;

-- 2) صلاحية رؤية مرشحي انتخاب معيّن
-- president_advisor: يرى كل الانتخابات
-- hr_admin_member: يرى انتخابات لجنته فقط (عبر user_roles.committee_id)
CREATE OR REPLACE FUNCTION has_election_view_permission(p_user UUID, p_election UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        -- president_advisor يرى كل شيء
        EXISTS (
            SELECT 1
            FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = p_user AND ur.is_active
              AND r.role_name = 'president_advisor'
        )
        OR
        -- hr_admin_member التابع للجنة الانتخاب
        EXISTS (
            SELECT 1
            FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            JOIN elections e ON e.id = p_election
            WHERE ur.user_id = p_user AND ur.is_active
              AND r.role_name = 'hr_admin_member'
              AND e.target_committee_id IS NOT NULL
              AND ur.committee_id = e.target_committee_id
        );
$$;

-- 3) وزن التصويت لمستخدم (أعلى وزن من أدواره النشطة، افتراضي 1.0)
CREATE OR REPLACE FUNCTION get_vote_weight(p_user UUID)
RETURNS NUMERIC
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(MAX(evw.weight), 1.0)
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    LEFT JOIN election_vote_weights evw ON evw.role_name = r.role_name
    WHERE ur.user_id = p_user
      AND ur.is_active = true;
$$;

-- 4) أعلى دور نشط للمستخدم (اسم الدور — لتسجيله في voter_role_snapshot)
CREATE OR REPLACE FUNCTION get_user_primary_role(p_user UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT r.role_name
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user
      AND ur.is_active = true
    ORDER BY r.role_level DESC
    LIMIT 1;
$$;

-- 5) فحص أهلية المستخدم للتصويت في انتخاب
-- يستخدم من trigger enforce_vote_eligibility ومن RPC get_anonymized_candidates
CREATE OR REPLACE FUNCTION is_user_eligible_to_vote(p_user UUID, p_election UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_election   elections%ROWTYPE;
    v_is_top     BOOLEAN;
    v_in_scope   BOOLEAN;
BEGIN
    SELECT * INTO v_election FROM elections WHERE id = p_election;
    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- أدوار الإدارة العليا يصوتون في كل الانتخابات
    SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = p_user AND ur.is_active
          AND r.role_name IN (
              'club_president','executive_council_president',
              'president_advisor','hr_committee_leader'
          )
    ) INTO v_is_top;

    IF v_is_top THEN
        RETURN true;
    END IF;

    -- حسب نوع الانتخاب
    IF v_election.target_role_name = 'department_head' THEN
        -- كل عضو في أي لجنة تابعة للقسم
        SELECT EXISTS (
            SELECT 1
            FROM user_roles ur
            JOIN committees c ON c.id = ur.committee_id
            WHERE ur.user_id = p_user AND ur.is_active
              AND c.department_id = v_election.target_department_id
        ) INTO v_in_scope;

    ELSE  -- committee_leader OR deputy_committee_leader
        -- كل عضو في اللجنة المستهدفة (بأي دور نشط) + hr_admin_member التابع
        SELECT EXISTS (
            SELECT 1
            FROM user_roles ur
            WHERE ur.user_id = p_user
              AND ur.is_active
              AND ur.committee_id = v_election.target_committee_id
        ) INTO v_in_scope;
    END IF;

    RETURN COALESCE(v_in_scope, false);
END;
$$;

-- 6) فحص أهلية المستخدم للترشح في انتخاب
-- يعكس نفس منطق enforce_candidacy_eligibility لكن بإرجاع boolean (للـ RPC)
CREATE OR REPLACE FUNCTION is_user_eligible_to_run(p_user UUID, p_election UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_election    elections%ROWTYPE;
    v_has_higher  BOOLEAN;
    v_blocks      BOOLEAN;
    v_in_scope    BOOLEAN;
    v_has_active  BOOLEAN;
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

    -- قواعد الترقية/الحظر:
    IF v_election.target_role_name = 'department_head' THEN
        -- إن كان المستخدم رئيس قسم مسبقاً (لأي قسم): ممنوع
        -- إن كان عضو لجنة/قائد/نائب في لجنة تابعة لهذا القسم: مسموح
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
        -- department_head لنفس القسم الذي تتبعه اللجنة: ممنوع
        SELECT EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            JOIN committees c ON c.id = v_election.target_committee_id
            WHERE ur.user_id = p_user AND ur.is_active
              AND r.role_name = 'department_head'
              AND ur.department_id = c.department_id
        ) INTO v_blocks;
        IF v_blocks THEN RETURN false; END IF;

        -- committee_leader الحالي لنفس اللجنة: ممنوع (هو فيه)
        SELECT EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = p_user AND ur.is_active
              AND r.role_name = 'committee_leader'
              AND ur.committee_id = v_election.target_committee_id
        ) INTO v_blocks;
        IF v_blocks THEN RETURN false; END IF;

        -- عضو نشط في اللجنة المستهدفة
        SELECT EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = p_user AND ur.is_active
              AND ur.committee_id = v_election.target_committee_id
        ) INTO v_in_scope;

    ELSE  -- deputy_committee_leader
        -- department_head لنفس القسم: ممنوع
        SELECT EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            JOIN committees c ON c.id = v_election.target_committee_id
            WHERE ur.user_id = p_user AND ur.is_active
              AND r.role_name = 'department_head'
              AND ur.department_id = c.department_id
        ) INTO v_blocks;
        IF v_blocks THEN RETURN false; END IF;

        -- committee_leader لنفس اللجنة ممنوع من الترشح لنائب (تنزيل)
        SELECT EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = p_user AND ur.is_active
              AND r.role_name = 'committee_leader'
              AND ur.committee_id = v_election.target_committee_id
        ) INTO v_blocks;
        IF v_blocks THEN RETURN false; END IF;

        -- deputy الحالي لنفس اللجنة ممنوع من الترشح لنائب (هو فيه)
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

    -- لا ترشح نشط آخر في انتخاب غير منتهٍ
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
