-- =============================================
-- نظام الانتخابات — 25: إضافة candidacy_end إلى get_user_candidacies
-- =============================================
-- الغرض: عرض موعد إغلاق الترشح في كارد "تفاصيل المنصب".
-- =============================================

DROP FUNCTION IF EXISTS public.get_user_candidacies(UUID);

CREATE FUNCTION public.get_user_candidacies(p_user UUID DEFAULT NULL)
RETURNS TABLE (
    candidate_id         UUID,
    election_id          UUID,
    election_status      TEXT,
    election_archived_at TIMESTAMPTZ,
    target_role_name     TEXT,
    target_committee_ar  TEXT,
    target_department_ar TEXT,
    candidate_number     INTEGER,
    candidate_status     TEXT,
    statement_ar         TEXT,
    file_url             TEXT,
    file_name            TEXT,
    review_note_ar       TEXT,
    reviewed_at          TIMESTAMPTZ,
    submitted_at         TIMESTAMPTZ,
    candidacy_end        TIMESTAMPTZ,
    can_withdraw         BOOLEAN,
    can_edit             BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user UUID := COALESCE(p_user, auth.uid());
BEGIN
    RETURN QUERY
    SELECT
        ec.id,
        e.id,
        e.status,
        e.archived_at,
        e.target_role_name,
        c.committee_name_ar,
        d.name_ar,
        ec.candidate_number,
        ec.status,
        ec.statement_ar,
        ec.file_url,
        ec.file_name,
        ec.review_note_ar,
        ec.reviewed_at,
        ec.submitted_at,
        e.candidacy_end,
        (ec.status IN ('pending','approved','needs_edit')
          AND e.status IN ('candidacy_open','candidacy_closed')
          AND e.archived_at IS NULL) AS can_withdraw,
        (ec.status = 'needs_edit'
          AND e.status = 'candidacy_open'
          AND e.archived_at IS NULL) AS can_edit
    FROM election_candidates ec
    JOIN elections e ON e.id = ec.election_id
    LEFT JOIN committees  c ON c.id = e.target_committee_id
    LEFT JOIN departments d ON d.id = e.target_department_id
    WHERE ec.user_id = v_user
    ORDER BY ec.submitted_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_candidacies(UUID) TO authenticated;
