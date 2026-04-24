-- =============================================
-- نظام الانتخابات — 26: السماح بتعديل الترشح في حالة pending
-- =============================================
-- توسعة resubmit_candidacy لتقبل التعديل أيضاً عندما يكون الترشح
-- في حالة pending (قيد المراجعة)، لتفعيل أزرار "تعديل" في
-- كاردات البيان والملف داخل ملفي الانتخابي.
--
-- نختار حدثاً مختلفاً للتسجيل بحسب الحالة السابقة:
--   • needs_edit → pending  : candidate_resubmitted (إعادة تقديم بعد طلب تعديل)
--   • pending    → pending  : candidate_updated      (تعديل ذاتي قبل المراجعة)
--
-- ونوسّع get_candidate_audit_trail لاستيعاب الحدث الجديد.
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

    IF v_elec_status <> 'candidacy_open' THEN
        RAISE EXCEPTION 'لا يمكن التعديل بعد إغلاق باب الترشح';
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


CREATE OR REPLACE FUNCTION public.get_candidate_audit_trail(p_candidate UUID)
RETURNS TABLE (
    event_type  TEXT,
    payload     JSONB,
    actor_name  TEXT,
    created_at  TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user      UUID;
    v_election  UUID;
BEGIN
    SELECT user_id, election_id INTO v_user, v_election
    FROM election_candidates
    WHERE id = p_candidate;

    IF v_user IS NULL THEN
        RETURN;
    END IF;

    IF auth.uid() <> v_user AND NOT has_election_admin_permission(auth.uid()) THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        l.event_type,
        l.payload,
        p.full_name AS actor_name,
        l.created_at
    FROM election_audit_log l
    LEFT JOIN profiles p ON p.id = l.actor_id
    WHERE l.election_id = v_election
      AND l.event_type IN (
          'candidacy_submitted',
          'candidate_reviewed',
          'candidate_resubmitted',
          'candidate_updated',
          'candidate_withdrawn'
      )
      AND (l.payload ->> 'candidate_id')::UUID = p_candidate
    ORDER BY l.created_at ASC;
END;
$$;
