-- =============================================
-- نظام الانتخابات — 05: RPCs
-- =============================================
-- RPCs للاستعلام عن المرشحين/الانتخابات المؤهلة، التبويبات الديناميكية،
-- إعلان الفائز، الأرشفة، والكنس الدوري للمواعيد.

-- =========================================================
-- 1) get_anonymized_candidates(election)
--    للعضو: يرجع معرّف المرشح + الرقم + البيان + ملف — بدون user_id أو اسم
-- =========================================================
CREATE OR REPLACE FUNCTION get_anonymized_candidates(p_election UUID)
RETURNS TABLE (
    candidate_id     UUID,
    candidate_number INTEGER,
    statement_ar     TEXT,
    file_url         TEXT,
    file_name        TEXT,
    file_size_bytes  INTEGER,
    file_mime        TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_election elections%ROWTYPE;
    v_eligible BOOLEAN;
    v_is_admin BOOLEAN;
    v_is_view  BOOLEAN;
BEGIN
    SELECT * INTO v_election FROM elections WHERE id = p_election;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'الانتخاب غير موجود';
    END IF;

    -- يسمح للأدمن/viewer أيضاً (لتبسيط الواجهة)
    v_is_admin := has_election_admin_permission(auth.uid());
    v_is_view  := has_election_view_permission(auth.uid(), p_election);

    IF NOT v_is_admin AND NOT v_is_view THEN
        -- العضو يمكنه الاطلاع على المرشحين المجهولين فقط إذا كان مؤهلاً للتصويت
        -- ومنذ فتح التصويت (قبل ذلك لا يراهم أبداً)
        IF v_election.status NOT IN ('voting_open','voting_closed','completed') THEN
            RAISE EXCEPTION 'لا يمكن عرض المرشحين قبل فتح التصويت';
        END IF;

        SELECT is_user_eligible_to_vote(auth.uid(), p_election) INTO v_eligible;
        IF NOT v_eligible THEN
            RAISE EXCEPTION 'غير مؤهل لعرض مرشحي هذا الانتخاب';
        END IF;
    END IF;

    RETURN QUERY
    SELECT
        ec.id,
        ec.candidate_number,
        ec.statement_ar,
        ec.file_url,
        ec.file_name,
        ec.file_size_bytes,
        ec.file_mime
    FROM election_candidates ec
    WHERE ec.election_id = p_election
      AND ec.status = 'approved'
    ORDER BY ec.candidate_number;
END;
$$;

-- =========================================================
-- 2) get_candidates_with_identity(election)
--    للأدمن/viewer: بيانات كاملة مع user_id والاسم
-- =========================================================
CREATE OR REPLACE FUNCTION get_candidates_with_identity(p_election UUID)
RETURNS TABLE (
    candidate_id      UUID,
    candidate_number  INTEGER,
    user_id           UUID,
    full_name         TEXT,
    username          TEXT,
    avatar_url        TEXT,
    statement_ar      TEXT,
    file_url          TEXT,
    file_name         TEXT,
    file_size_bytes   INTEGER,
    file_mime         TEXT,
    status            TEXT,
    review_note_ar    TEXT,
    reviewed_by       UUID,
    reviewed_at       TIMESTAMPTZ,
    withdrawn_at      TIMESTAMPTZ,
    submitted_at      TIMESTAMPTZ,
    updated_at        TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT has_election_admin_permission(auth.uid())
       AND NOT has_election_view_permission(auth.uid(), p_election) THEN
        RAISE EXCEPTION 'غير مصرح برؤية بيانات المرشحين';
    END IF;

    RETURN QUERY
    SELECT
        ec.id,
        ec.candidate_number,
        ec.user_id,
        p.full_name,
        p.username,
        p.avatar_url,
        ec.statement_ar,
        ec.file_url,
        ec.file_name,
        ec.file_size_bytes,
        ec.file_mime,
        ec.status,
        ec.review_note_ar,
        ec.reviewed_by,
        ec.reviewed_at,
        ec.withdrawn_at,
        ec.submitted_at,
        ec.updated_at
    FROM election_candidates ec
    JOIN profiles p ON p.id = ec.user_id
    WHERE ec.election_id = p_election
    ORDER BY ec.candidate_number;
END;
$$;

-- =========================================================
-- 3) get_eligible_elections_for_user(user)
--    الانتخابات المفتوحة للترشح والمؤهل لها المستخدم
-- =========================================================
CREATE OR REPLACE FUNCTION get_eligible_elections_for_user(p_user UUID DEFAULT NULL)
RETURNS TABLE (
    election_id           UUID,
    target_role_name      TEXT,
    target_committee_id   INTEGER,
    target_committee_ar   TEXT,
    target_department_id  INTEGER,
    target_department_ar  TEXT,
    title_ar              TEXT,
    description_ar        TEXT,
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
        e.title_ar,
        e.description_ar,
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

-- =========================================================
-- 4) get_votable_elections_for_user(user)
--    الانتخابات المفتوحة للتصويت والمؤهل لها المستخدم ولم يصوّت بعد
-- =========================================================
CREATE OR REPLACE FUNCTION get_votable_elections_for_user(p_user UUID DEFAULT NULL)
RETURNS TABLE (
    election_id           UUID,
    target_role_name      TEXT,
    target_committee_id   INTEGER,
    target_committee_ar   TEXT,
    target_department_id  INTEGER,
    target_department_ar  TEXT,
    title_ar              TEXT,
    description_ar        TEXT,
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
        e.title_ar,
        e.description_ar,
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

-- =========================================================
-- 5) get_user_candidacies(user)
--    ترشحاتي (لقسم "ملفي الانتخابي")
-- =========================================================
CREATE OR REPLACE FUNCTION get_user_candidacies(p_user UUID DEFAULT NULL)
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

-- =========================================================
-- 6) get_election_results(election)
--    نتائج الانتخاب (يكشف الأسماء للأدمن/viewer، وللجميع بعد completed)
-- =========================================================
CREATE OR REPLACE FUNCTION get_election_results(p_election UUID)
RETURNS TABLE (
    candidate_id      UUID,
    candidate_number  INTEGER,
    user_id           UUID,
    full_name         TEXT,
    avatar_url        TEXT,
    total_weight      NUMERIC,
    total_votes       BIGINT,
    is_winner         BOOLEAN
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_election elections%ROWTYPE;
    v_reveal   BOOLEAN;
BEGIN
    SELECT * INTO v_election FROM elections WHERE id = p_election;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'الانتخاب غير موجود';
    END IF;

    v_reveal := v_election.status = 'completed'
             OR has_election_admin_permission(auth.uid())
             OR has_election_view_permission(auth.uid(), p_election);

    -- قبل الإعلان للعضو العادي: لا يرى أسماء ولا مجموع أصوات لفرد (يرى قائمة مرشحين فقط)
    IF NOT v_reveal THEN
        RAISE EXCEPTION 'النتائج غير متاحة حتى إعلان الفائز';
    END IF;

    RETURN QUERY
    SELECT
        ec.id,
        ec.candidate_number,
        ec.user_id,
        p.full_name,
        p.avatar_url,
        COALESCE(SUM(v.vote_weight), 0)::NUMERIC AS total_weight,
        COUNT(v.id)::BIGINT AS total_votes,
        (v_election.winner_candidate_id = ec.id) AS is_winner
    FROM election_candidates ec
    JOIN profiles p ON p.id = ec.user_id
    LEFT JOIN election_votes v ON v.candidate_id = ec.id
    WHERE ec.election_id = p_election
      AND ec.status = 'approved'
    GROUP BY ec.id, ec.candidate_number, ec.user_id, p.full_name, p.avatar_url
    ORDER BY total_weight DESC, ec.candidate_number;
END;
$$;

-- =========================================================
-- 7) count_user_election_tabs(user)
--    يرجع 4 أعداد لبناء التبويبات الجانبية ديناميكياً
-- =========================================================
CREATE OR REPLACE FUNCTION count_user_election_tabs(p_user UUID DEFAULT NULL)
RETURNS TABLE (
    can_run         INTEGER,
    has_submission  INTEGER,
    can_vote        INTEGER,
    can_view        INTEGER
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user UUID := COALESCE(p_user, auth.uid());
    v_can_run   INTEGER := 0;
    v_has_sub   INTEGER := 0;
    v_can_vote  INTEGER := 0;
    v_can_view  INTEGER := 0;
BEGIN
    -- الانتخابات المفتوحة للترشح ومؤهل لها
    SELECT COUNT(*) INTO v_can_run
    FROM elections e
    WHERE e.status = 'candidacy_open'
      AND e.archived_at IS NULL
      AND is_user_eligible_to_run(v_user, e.id);

    -- الترشحات النشطة للمستخدم (pending/approved/needs_edit) في انتخابات غير مؤرشفة
    SELECT COUNT(*) INTO v_has_sub
    FROM election_candidates ec
    JOIN elections e ON e.id = ec.election_id
    WHERE ec.user_id = v_user
      AND ec.status IN ('pending','approved','needs_edit')
      AND e.archived_at IS NULL
      AND e.status IN ('candidacy_open','candidacy_closed','voting_open','voting_closed','completed');

    -- الانتخابات المفتوحة للتصويت ومؤهل ولم يصوت
    SELECT COUNT(*) INTO v_can_vote
    FROM elections e
    WHERE e.status = 'voting_open'
      AND e.archived_at IS NULL
      AND is_user_eligible_to_vote(v_user, e.id)
      AND NOT EXISTS (
          SELECT 1 FROM election_votes v
          WHERE v.election_id = e.id AND v.voter_id = v_user
      );

    -- الانتخابات التي يحق للمستخدم رؤية مرشحيها (viewer مخول)
    SELECT COUNT(*) INTO v_can_view
    FROM elections e
    WHERE e.archived_at IS NULL
      AND e.status IN ('candidacy_open','candidacy_closed','voting_open','voting_closed','completed')
      AND has_election_view_permission(v_user, e.id);

    RETURN QUERY SELECT v_can_run, v_has_sub, v_can_vote, v_can_view;
END;
$$;

-- =========================================================
-- 8) declare_winner(election, candidate)
--    إعلان الفائز بذرّية: SELECT FOR UPDATE لمنع race condition
-- =========================================================
CREATE OR REPLACE FUNCTION declare_winner(p_election UUID, p_candidate UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_election elections%ROWTYPE;
BEGIN
    IF NOT has_election_admin_permission(auth.uid()) THEN
        RAISE EXCEPTION 'غير مصرح بإعلان الفائز';
    END IF;

    -- قفل صف الانتخاب
    SELECT * INTO v_election FROM elections WHERE id = p_election FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'الانتخاب غير موجود';
    END IF;

    IF v_election.archived_at IS NOT NULL THEN
        RAISE EXCEPTION 'الانتخاب مؤرشف';
    END IF;

    IF v_election.status NOT IN ('voting_closed') THEN
        RAISE EXCEPTION 'يجب أن يكون التصويت مغلقاً قبل إعلان الفائز';
    END IF;

    IF v_election.winner_candidate_id IS NOT NULL THEN
        RAISE EXCEPTION 'الفائز معلن مسبقاً';
    END IF;

    -- تحديث الفائز + نقل الحالة إلى completed (الحرّاس في الـ triggers تتكفل بالباقي)
    UPDATE elections
    SET winner_candidate_id = p_candidate,
        winner_declared_by  = auth.uid(),
        winner_declared_at  = now(),
        status              = 'completed'
    WHERE id = p_election;

    INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
    VALUES (p_election, auth.uid(), 'declare_winner',
            jsonb_build_object('candidate_id', p_candidate));
END;
$$;

-- =========================================================
-- 9) archive_election(election)
-- =========================================================
CREATE OR REPLACE FUNCTION archive_election(p_election UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_status TEXT;
    v_archived TIMESTAMPTZ;
BEGIN
    IF NOT has_election_admin_permission(auth.uid()) THEN
        RAISE EXCEPTION 'غير مصرح بأرشفة الانتخاب';
    END IF;

    SELECT status, archived_at INTO v_status, v_archived FROM elections WHERE id = p_election;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'الانتخاب غير موجود';
    END IF;

    IF v_archived IS NOT NULL THEN
        RAISE EXCEPTION 'الانتخاب مؤرشف مسبقاً';
    END IF;

    IF v_status NOT IN ('completed','cancelled') THEN
        RAISE EXCEPTION 'يمكن أرشفة الانتخابات المكتملة أو الملغاة فقط';
    END IF;

    UPDATE elections SET archived_at = now() WHERE id = p_election;

    INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
    VALUES (p_election, auth.uid(), 'archived', '{}'::jsonb);
END;
$$;

-- =========================================================
-- 10) cancel_election(election, reason)
-- =========================================================
CREATE OR REPLACE FUNCTION cancel_election(p_election UUID, p_reason TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT has_election_admin_permission(auth.uid()) THEN
        RAISE EXCEPTION 'غير مصرح بإلغاء الانتخاب';
    END IF;

    UPDATE elections SET status = 'cancelled' WHERE id = p_election;

    INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
    VALUES (p_election, auth.uid(), 'cancelled',
            jsonb_build_object('reason', p_reason));
END;
$$;

-- =========================================================
-- 11) transition_election(election, new_status)
--     انتقال يدوي للحالة (للأدمن) — يعتمد على trigger للتحقق
-- =========================================================
CREATE OR REPLACE FUNCTION transition_election(p_election UUID, p_new_status TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT has_election_admin_permission(auth.uid()) THEN
        RAISE EXCEPTION 'غير مصرح بتغيير حالة الانتخاب';
    END IF;

    UPDATE elections SET status = p_new_status WHERE id = p_election;

    INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
    VALUES (p_election, auth.uid(), 'status_transition',
            jsonb_build_object('new_status', p_new_status));
END;
$$;

-- =========================================================
-- 12) submit_candidacy(election, statement, file_*)
--     RPC مريح يُدرج ترشحاً (الـ triggers تتحقق من الأهلية وتعيّن الرقم)
-- =========================================================
CREATE OR REPLACE FUNCTION submit_candidacy(
    p_election          UUID,
    p_statement_ar      TEXT,
    p_file_url          TEXT DEFAULT NULL,
    p_file_name         TEXT DEFAULT NULL,
    p_file_size_bytes   INTEGER DEFAULT NULL,
    p_file_mime         TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO election_candidates
        (election_id, user_id, candidate_number,
         statement_ar, file_url, file_name, file_size_bytes, file_mime)
    VALUES
        (p_election, auth.uid(), 0,  -- سيُعاد كتابته من trigger
         p_statement_ar, p_file_url, p_file_name, p_file_size_bytes, p_file_mime)
    RETURNING id INTO v_id;

    INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
    VALUES (p_election, auth.uid(), 'candidacy_submitted',
            jsonb_build_object('candidate_id', v_id));

    RETURN v_id;
END;
$$;

-- =========================================================
-- 13) review_candidate(candidate, new_status, note)
-- =========================================================
CREATE OR REPLACE FUNCTION review_candidate(
    p_candidate   UUID,
    p_new_status  TEXT,
    p_note_ar     TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_election UUID;
BEGIN
    IF NOT has_election_admin_permission(auth.uid()) THEN
        RAISE EXCEPTION 'غير مصرح بمراجعة المرشحين';
    END IF;

    IF p_new_status NOT IN ('approved','rejected','needs_edit') THEN
        RAISE EXCEPTION 'قيمة حالة المرشح غير مدعومة في المراجعة';
    END IF;

    UPDATE election_candidates
    SET status         = p_new_status,
        review_note_ar = p_note_ar,
        reviewed_by    = auth.uid(),
        reviewed_at    = now()
    WHERE id = p_candidate
    RETURNING election_id INTO v_election;

    IF v_election IS NULL THEN
        RAISE EXCEPTION 'المرشح غير موجود';
    END IF;

    INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
    VALUES (v_election, auth.uid(), 'candidate_reviewed',
            jsonb_build_object(
                'candidate_id', p_candidate,
                'new_status',   p_new_status,
                'note',         p_note_ar));
END;
$$;

-- =========================================================
-- 14) withdraw_candidacy(candidate)
-- =========================================================
CREATE OR REPLACE FUNCTION withdraw_candidacy(p_candidate UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user UUID;
    v_election UUID;
BEGIN
    SELECT user_id, election_id INTO v_user, v_election
    FROM election_candidates WHERE id = p_candidate;

    IF v_user IS NULL THEN
        RAISE EXCEPTION 'الترشح غير موجود';
    END IF;

    IF v_user <> auth.uid() AND NOT has_election_admin_permission(auth.uid()) THEN
        RAISE EXCEPTION 'لا يمكن الانسحاب نيابة عن مرشح آخر';
    END IF;

    UPDATE election_candidates
    SET status = 'withdrawn',
        withdrawn_at = now()
    WHERE id = p_candidate;

    INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
    VALUES (v_election, auth.uid(), 'candidate_withdrawn',
            jsonb_build_object('candidate_id', p_candidate));
END;
$$;

-- =========================================================
-- 15) cast_vote(election, candidate)
-- =========================================================
CREATE OR REPLACE FUNCTION cast_vote(p_election UUID, p_candidate UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id UUID;
BEGIN
    -- الـ trigger سيحقن vote_weight و voter_role_snapshot ويتحقق من كل شيء
    INSERT INTO election_votes
        (election_id, voter_id, candidate_id, vote_weight, voter_role_snapshot)
    VALUES
        (p_election, auth.uid(), p_candidate, 1.0, 'placeholder')
    RETURNING id INTO v_id;

    INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
    VALUES (p_election, auth.uid(), 'vote_cast',
            jsonb_build_object('vote_id', v_id));

    RETURN v_id;
END;
$$;

-- =========================================================
-- 16) sweep_election_deadlines()
--     تُستدعى من pg_cron كل دقيقة
-- =========================================================
CREATE OR REPLACE FUNCTION sweep_election_deadlines()
RETURNS TABLE (
    closed_candidacy INTEGER,
    closed_voting    INTEGER
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_c INTEGER := 0;
    v_v INTEGER := 0;
BEGIN
    WITH upd AS (
        UPDATE elections
        SET status = 'candidacy_closed'
        WHERE status = 'candidacy_open'
          AND archived_at IS NULL
          AND candidacy_end IS NOT NULL
          AND candidacy_end < now()
        RETURNING id
    )
    SELECT COUNT(*) INTO v_c FROM upd;

    WITH upd AS (
        UPDATE elections
        SET status = 'voting_closed'
        WHERE status = 'voting_open'
          AND archived_at IS NULL
          AND voting_end IS NOT NULL
          AND voting_end < now()
        RETURNING id
    )
    SELECT COUNT(*) INTO v_v FROM upd;

    IF v_c + v_v > 0 THEN
        INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
        VALUES (NULL, NULL, 'sweep_deadlines',
                jsonb_build_object('closed_candidacy', v_c, 'closed_voting', v_v));
    END IF;

    RETURN QUERY SELECT v_c, v_v;
END;
$$;

-- =========================================================
-- صلاحيات التنفيذ
-- =========================================================
-- RPCs للعضو العادي
GRANT EXECUTE ON FUNCTION get_anonymized_candidates(UUID)       TO authenticated;
GRANT EXECUTE ON FUNCTION get_eligible_elections_for_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_votable_elections_for_user(UUID)  TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_candidacies(UUID)            TO authenticated;
GRANT EXECUTE ON FUNCTION get_election_results(UUID)            TO authenticated;
GRANT EXECUTE ON FUNCTION count_user_election_tabs(UUID)        TO authenticated;
GRANT EXECUTE ON FUNCTION submit_candidacy(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION withdraw_candidacy(UUID)              TO authenticated;
GRANT EXECUTE ON FUNCTION cast_vote(UUID, UUID)                 TO authenticated;

-- RPCs للأدمن/viewer (تتحقق من الصلاحية داخلياً)
GRANT EXECUTE ON FUNCTION get_candidates_with_identity(UUID)    TO authenticated;
GRANT EXECUTE ON FUNCTION declare_winner(UUID, UUID)            TO authenticated;
GRANT EXECUTE ON FUNCTION archive_election(UUID)                TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_election(UUID, TEXT)           TO authenticated;
GRANT EXECUTE ON FUNCTION transition_election(UUID, TEXT)       TO authenticated;
GRANT EXECUTE ON FUNCTION review_candidate(UUID, TEXT, TEXT)    TO authenticated;

-- sweep للمستخدم postgres فقط (يُستدعى من pg_cron)
REVOKE EXECUTE ON FUNCTION sweep_election_deadlines() FROM PUBLIC;
