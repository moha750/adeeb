-- =============================================
-- نظام الانتخابات — 31: RPCs أرشيف التفاصيل الكامل
-- =============================================
-- get_election_audit_log: السجل الكامل للانتخاب (لأدمن أو مراجع)
-- get_election_vote_detail: ربط الناخب بالمرشح المختار (للأدمن فقط بعد الأرشفة)
-- =============================================

-- =========================================================
-- 1) get_election_audit_log(p_election)
--    سجل كامل لانتخاب واحد، مع اسم الفاعل
-- =========================================================
CREATE OR REPLACE FUNCTION get_election_audit_log(p_election UUID)
RETURNS TABLE (
    id          BIGINT,
    created_at  TIMESTAMPTZ,
    event_type  TEXT,
    actor_id    UUID,
    actor_name  TEXT,
    payload     JSONB
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
        RAISE EXCEPTION 'غير مصرح بعرض سجل التدقيق';
    END IF;

    RETURN QUERY
    SELECT
        al.id,
        al.created_at,
        al.event_type,
        al.actor_id,
        p.full_name,
        al.payload
    FROM election_audit_log al
    LEFT JOIN profiles p ON p.id = al.actor_id
    WHERE al.election_id = p_election
    ORDER BY al.created_at DESC, al.id DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_election_audit_log(UUID) TO authenticated;


-- =========================================================
-- 2) get_election_vote_detail(p_election)
--    تفصيل الأصوات (الناخب → المرشح + الوزن + الوقت)
--    حارسان:
--      • أدمن فقط (المراجع لا يُسمح له)
--      • فقط بعد الأرشفة (سرّية الصوت أثناء التصويت)
-- =========================================================
CREATE OR REPLACE FUNCTION get_election_vote_detail(p_election UUID)
RETURNS TABLE (
    voter_id           UUID,
    voter_name         TEXT,
    voter_role         TEXT,
    candidate_id       UUID,
    candidate_number   INTEGER,
    candidate_name     TEXT,
    vote_weight        NUMERIC,
    voted_at           TIMESTAMPTZ
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

    IF NOT has_election_admin_permission(auth.uid()) THEN
        RAISE EXCEPTION 'تفصيل الأصوات متاح للأدمن فقط';
    END IF;

    IF v_election.archived_at IS NULL
       OR v_election.status NOT IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'تفصيل الأصوات يُكشف فقط بعد أرشفة الانتخاب';
    END IF;

    RETURN QUERY
    SELECT
        v.voter_id,
        vp.full_name,
        v.voter_role_snapshot,
        v.candidate_id,
        ec.candidate_number,
        cp.full_name,
        v.vote_weight,
        v.created_at
    FROM election_votes v
    JOIN election_candidates ec ON ec.id = v.candidate_id
    LEFT JOIN profiles vp ON vp.id = v.voter_id
    LEFT JOIN profiles cp ON cp.id = ec.user_id
    WHERE v.election_id = p_election
    ORDER BY v.created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION get_election_vote_detail(UUID) TO authenticated;
