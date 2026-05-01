-- =============================================
-- نظام الانتخابات — 29: RPC مشاركة المصوّتين (للوحة المراقبة الإدارية)
-- =============================================
-- get_election_voters_participation: قائمة المؤهَّلين + حالة "صوّت/لم يصوّت" + الوقت
--   • لا تكشف لمن صوّت كل ناخب (سرّية الصوت محفوظة)
--   • مقتصرة على has_election_admin_permission OR has_election_view_permission
-- =============================================

CREATE OR REPLACE FUNCTION get_election_voters_participation(p_election UUID)
RETURNS TABLE (
    user_id     UUID,
    full_name   TEXT,
    role_name   TEXT,
    has_voted   BOOLEAN,
    voted_at    TIMESTAMPTZ,
    vote_weight NUMERIC
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_election elections%ROWTYPE;
BEGIN
    SELECT * INTO v_election FROM elections WHERE id = p_election;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'الانتخاب غير موجود';
    END IF;

    IF NOT has_election_admin_permission(auth.uid())
       AND NOT has_election_view_permission(auth.uid(), p_election) THEN
        RAISE EXCEPTION 'غير مصرح بعرض قائمة المصوّتين';
    END IF;

    RETURN QUERY
    WITH eligible AS (
        -- (أ) أدوار الإدارة العليا — ناخبون في كل الانتخابات
        SELECT DISTINCT ur.user_id AS uid
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.is_active
          AND r.role_name IN (
              'club_president','executive_council_president',
              'president_advisor','hr_committee_leader'
          )
        UNION
        -- (ب) ضمن نطاق الانتخاب
        SELECT DISTINCT ur.user_id AS uid
        FROM user_roles ur
        WHERE ur.is_active
          AND (
              (v_election.target_role_name = 'department_head'
                AND EXISTS (
                    SELECT 1 FROM committees c
                    WHERE c.id = ur.committee_id
                      AND c.department_id = v_election.target_department_id
                )
              )
              OR
              (v_election.target_role_name IN ('committee_leader','deputy_committee_leader')
                AND ur.committee_id = v_election.target_committee_id
              )
          )
    )
    SELECT
        p.id,
        p.full_name,
        COALESCE(get_user_primary_role(p.id), 'unknown'),
        v.id IS NOT NULL,
        v.created_at,
        v.vote_weight
    FROM eligible e
    JOIN profiles p ON p.id = e.uid
    LEFT JOIN election_votes v
        ON v.election_id = p_election AND v.voter_id = p.id
    ORDER BY (v.id IS NOT NULL) DESC, p.full_name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_election_voters_participation(UUID) TO authenticated;
