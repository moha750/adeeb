-- =============================================
-- نظام الانتخابات — 24: RPC إعادة التقديم بعد طلب التعديل (مع audit log)
-- =============================================
-- المشكلة:
--   نموذج التعديل في الكلاينت كان يستخدم UPDATE مباشرة على
--   election_candidates، فلا يُسجَّل حدث "أعاد التقديم" في
--   election_audit_log → فجوة في كارد "مسار طلبك".
--
-- الحل:
--   RPC رسمي للإعادة:
--     • يتأكد أن المتصل هو صاحب الترشح.
--     • يتأكد أن الحالة الحالية needs_edit (إعادة التقديم تحت طلب التعديل).
--     • يتأكد أن الانتخاب ما زال candidacy_open.
--     • يحدّث البيان/الملف، ويعيد الحالة إلى pending، ويُفرّغ ملاحظة المراجعة.
--     • يُسجّل candidate_resubmitted في election_audit_log.
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
        RAISE EXCEPTION 'لا يمكن إعادة تقديم ترشح مستخدم آخر';
    END IF;

    IF v_status <> 'needs_edit' THEN
        RAISE EXCEPTION 'إعادة التقديم متاحة فقط للترشحات التي طُلب تعديلها';
    END IF;

    IF v_elec_status <> 'candidacy_open' THEN
        RAISE EXCEPTION 'لا يمكن إعادة التقديم بعد إغلاق باب الترشح';
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

    INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
    VALUES (v_election, auth.uid(), 'candidate_resubmitted',
            jsonb_build_object('candidate_id', p_candidate));
END;
$$;

GRANT EXECUTE ON FUNCTION public.resubmit_candidacy(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT) TO authenticated;


-- ════════════════════════════════════════════════════════════════
-- توسيع get_candidate_audit_trail ليشمل الحدث الجديد
-- ════════════════════════════════════════════════════════════════
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
          'candidate_withdrawn'
      )
      AND (l.payload ->> 'candidate_id')::UUID = p_candidate
    ORDER BY l.created_at ASC;
END;
$$;
