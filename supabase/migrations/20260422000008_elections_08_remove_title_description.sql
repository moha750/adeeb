-- =============================================
-- نظام الانتخابات — 08: إزالة title_ar / description_ar
-- ونقل تحديد voting_end لمرحلة فتح التصويت بدلاً من الإنشاء
-- =============================================

-- =========================================================
-- (أ) حذف الأعمدة من جدول elections
-- =========================================================
ALTER TABLE elections DROP COLUMN IF EXISTS title_ar;
ALTER TABLE elections DROP COLUMN IF EXISTS description_ar;

-- =========================================================
-- (ب) إعادة تعريف get_eligible_elections_for_user بدون العمودين
-- =========================================================
DROP FUNCTION IF EXISTS get_eligible_elections_for_user(UUID);

CREATE OR REPLACE FUNCTION get_eligible_elections_for_user(p_user UUID DEFAULT NULL)
RETURNS TABLE (
    election_id           UUID,
    target_role_name      TEXT,
    target_committee_id   INTEGER,
    target_committee_ar   TEXT,
    target_department_id  INTEGER,
    target_department_ar  TEXT,
    candidacy_end         TIMESTAMPTZ,
    has_submission        BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user UUID := COALESCE(p_user, auth.uid());
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.target_role_name,
        e.target_committee_id,
        c.committee_name_ar,
        e.target_department_id,
        d.name_ar,
        e.candidacy_end,
        EXISTS (
            SELECT 1 FROM election_candidates ec
            WHERE ec.election_id = e.id AND ec.user_id = v_user
              AND ec.status IN ('pending','approved','needs_edit')
        ) AS has_submission
    FROM elections e
    LEFT JOIN committees  c ON c.id = e.target_committee_id
    LEFT JOIN departments d ON d.id = e.target_department_id
    WHERE e.status = 'candidacy_open'
      AND e.archived_at IS NULL
      AND is_user_eligible_to_run(v_user, e.id) = true
    ORDER BY e.candidacy_end NULLS LAST, e.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_eligible_elections_for_user(UUID) TO authenticated;

-- =========================================================
-- (ج) إعادة تعريف get_votable_elections_for_user بدون العمودين
-- =========================================================
DROP FUNCTION IF EXISTS get_votable_elections_for_user(UUID);

CREATE OR REPLACE FUNCTION get_votable_elections_for_user(p_user UUID DEFAULT NULL)
RETURNS TABLE (
    election_id           UUID,
    target_role_name      TEXT,
    target_committee_id   INTEGER,
    target_committee_ar   TEXT,
    target_department_id  INTEGER,
    target_department_ar  TEXT,
    voting_end            TIMESTAMPTZ,
    has_voted             BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user UUID := COALESCE(p_user, auth.uid());
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.target_role_name,
        e.target_committee_id,
        c.committee_name_ar,
        e.target_department_id,
        d.name_ar,
        e.voting_end,
        EXISTS (
            SELECT 1 FROM election_votes v
            WHERE v.election_id = e.id AND v.voter_id = v_user
        ) AS has_voted
    FROM elections e
    LEFT JOIN committees  c ON c.id = e.target_committee_id
    LEFT JOIN departments d ON d.id = e.target_department_id
    WHERE e.status = 'voting_open'
      AND e.archived_at IS NULL
      AND is_user_eligible_to_vote(v_user, e.id) = true
    ORDER BY e.voting_end NULLS LAST, e.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_votable_elections_for_user(UUID) TO authenticated;

-- =========================================================
-- (د) تعديل transition_election لقبول voting_end عند فتح التصويت
-- =========================================================
DROP FUNCTION IF EXISTS transition_election(UUID, TEXT);

CREATE OR REPLACE FUNCTION transition_election(
    p_election    UUID,
    p_new_status  TEXT,
    p_voting_end  TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT has_election_admin_permission(auth.uid()) THEN
        RAISE EXCEPTION 'غير مصرح بتغيير حالة الانتخاب';
    END IF;

    IF p_new_status = 'voting_open' THEN
        IF p_voting_end IS NULL THEN
            RAISE EXCEPTION 'نهاية التصويت مطلوبة عند فتح التصويت';
        END IF;
        IF p_voting_end <= now() THEN
            RAISE EXCEPTION 'نهاية التصويت يجب أن تكون في المستقبل';
        END IF;
        UPDATE elections
           SET status = p_new_status,
               voting_end = p_voting_end
         WHERE id = p_election;
    ELSE
        UPDATE elections SET status = p_new_status WHERE id = p_election;
    END IF;

    INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
    VALUES (p_election, auth.uid(), 'status_transition',
            jsonb_build_object('new_status', p_new_status,
                               'voting_end', p_voting_end));
END;
$$;

GRANT EXECUTE ON FUNCTION transition_election(UUID, TEXT, TIMESTAMPTZ) TO authenticated;
