-- =============================================
-- نظام الانتخابات — 33: السماح بتعديل الترشح أثناء candidacy_closed
-- =============================================
-- (1) توسعة resubmit_candidacy للسماح بالتعديل عندما يكون الانتخاب في
--     إحدى الحالتين: candidacy_open أو candidacy_closed. يبقى التعديل
--     ممنوعاً بعد بدء التصويت أو اكتماله أو إلغائه.
-- (2) توسعة can_edit في get_user_candidacies ليصبح صحيحاً أيضاً
--     خلال مرحلة candidacy_closed، حتى يظهر زر "تعديل طلبي" لكاردات
--     طلبات التعديل في ملفي الانتخابي.
-- =============================================

CREATE OR REPLACE FUNCTION public.resubmit_candidacy(
    p_candidate         UUID,
    p_statement_ar      TEXT,
    p_file_url          TEXT DEFAULT NULL,
    p_file_name         TEXT DEFAULT NULL,
    p_file_size_bytes   INTEGER DEFAULT NULL,
    p_file_mime         TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user        UUID;
    v_election    UUID;
    v_status      TEXT;
    v_elec_status TEXT;
    v_event       TEXT;
BEGIN
    SELECT ec.user_id, ec.election_id, ec.status, e.status
      INTO v_user, v_election, v_status, v_elec_status
      FROM election_candidates ec
      JOIN elections e ON e.id = ec.election_id
     WHERE ec.id = p_candidate;

    IF v_user IS NULL THEN
        RAISE EXCEPTION 'الترشح غير موجود';
    END IF;

    IF v_user <> auth.uid() THEN
        RAISE EXCEPTION 'لا يمكن تعديل ترشح مستخدم آخر';
    END IF;

    IF v_status NOT IN ('pending', 'needs_edit') THEN
        RAISE EXCEPTION 'لا يمكن تعديل الترشح في حالته الحالية';
    END IF;

    IF v_elec_status NOT IN ('candidacy_open', 'candidacy_closed') THEN
        RAISE EXCEPTION 'لا يمكن التعديل بعد بدء مرحلة التصويت';
    END IF;

    UPDATE election_candidates
       SET statement_ar     = p_statement_ar,
           file_url         = p_file_url,
           file_name        = p_file_name,
           file_size_bytes  = p_file_size_bytes,
           file_mime        = p_file_mime,
           status           = 'pending',
           review_note_ar   = NULL,
           reviewed_at      = NULL,
           reviewed_by      = NULL
     WHERE id = p_candidate;

    v_event := CASE
        WHEN v_status = 'needs_edit' THEN 'candidate_resubmitted'
        ELSE 'candidate_updated'
    END;

    INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
    VALUES (v_election, auth.uid(), v_event,
            jsonb_build_object('candidate_id', p_candidate));
END;
$$;


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
          AND e.status IN ('candidacy_open','candidacy_closed')
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
