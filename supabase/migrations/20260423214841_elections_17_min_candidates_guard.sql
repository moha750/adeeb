-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260423214841   الاسم: elections_17_min_candidates_guard

ALTER TABLE elections
    ADD COLUMN IF NOT EXISTS candidacy_auto_extended_at TIMESTAMPTZ;


CREATE OR REPLACE FUNCTION public._count_approved_candidates(p_election UUID)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COUNT(*)::INTEGER
    FROM election_candidates
    WHERE election_id = p_election
      AND status = 'approved';
$$;


CREATE OR REPLACE FUNCTION transition_election(
    p_election    UUID,
    p_new_status  TEXT,
    p_voting_end  TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_status TEXT;
    v_approved       INTEGER;
BEGIN
    IF NOT has_election_admin_permission(auth.uid()) THEN
        RAISE EXCEPTION 'غير مصرح بتغيير حالة الانتخاب';
    END IF;

    SELECT status INTO v_current_status FROM elections WHERE id = p_election;
    IF v_current_status IS NULL THEN
        RAISE EXCEPTION 'الانتخاب غير موجود';
    END IF;

    IF p_new_status = 'candidacy_closed' AND v_current_status = 'candidacy_open' THEN
        v_approved := public._count_approved_candidates(p_election);
        IF v_approved < 2 THEN
            RAISE EXCEPTION
                'لا يمكن إغلاق الترشح بأقل من مرشحَين مقبولَين (الحالي: %). استخدم الإغلاق الاستثنائي إن كان لابدّ من ذلك.',
                v_approved
                USING ERRCODE = 'check_violation';
        END IF;
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


CREATE OR REPLACE FUNCTION public.admin_force_close_candidacy(
    p_election UUID,
    p_reason   TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_status   TEXT;
    v_approved INTEGER;
BEGIN
    IF NOT has_election_admin_permission(auth.uid()) THEN
        RAISE EXCEPTION 'غير مصرح بتغيير حالة الانتخاب';
    END IF;

    IF p_reason IS NULL OR length(trim(p_reason)) < 10 THEN
        RAISE EXCEPTION 'سبب الإغلاق الاستثنائي مطلوب (10 أحرف على الأقل)';
    END IF;

    SELECT status INTO v_status FROM elections WHERE id = p_election;
    IF v_status IS NULL THEN
        RAISE EXCEPTION 'الانتخاب غير موجود';
    END IF;
    IF v_status <> 'candidacy_open' THEN
        RAISE EXCEPTION 'يُستخدم الإغلاق الاستثنائي فقط من حالة "ترشح مفتوح" (الحالي: %)', v_status;
    END IF;

    v_approved := public._count_approved_candidates(p_election);

    UPDATE elections SET status = 'candidacy_closed' WHERE id = p_election;

    INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
    VALUES (p_election, auth.uid(), 'candidacy_force_closed',
            jsonb_build_object(
                'approved_candidates', v_approved,
                'reason', p_reason
            ));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_force_close_candidacy(UUID, TEXT) TO authenticated;


DROP FUNCTION IF EXISTS sweep_election_deadlines();

CREATE OR REPLACE FUNCTION sweep_election_deadlines()
RETURNS TABLE (
    closed_candidacy   INTEGER,
    extended_candidacy INTEGER,
    closed_voting      INTEGER
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_closed_cand   INTEGER := 0;
    v_extended_cand INTEGER := 0;
    v_closed_voting INTEGER := 0;
    v_extension     INTERVAL := INTERVAL '48 hours';
    r               RECORD;
    v_approved      INTEGER;
    v_new_end       TIMESTAMPTZ;
BEGIN
    FOR r IN
        SELECT id, candidacy_auto_extended_at
        FROM elections
        WHERE status = 'candidacy_open'
          AND archived_at IS NULL
          AND candidacy_end IS NOT NULL
          AND candidacy_end < now()
    LOOP
        v_approved := public._count_approved_candidates(r.id);

        IF v_approved >= 2 THEN
            UPDATE elections SET status = 'candidacy_closed' WHERE id = r.id;
            v_closed_cand := v_closed_cand + 1;

        ELSIF r.candidacy_auto_extended_at IS NULL THEN
            v_new_end := now() + v_extension;
            UPDATE elections
               SET candidacy_end = v_new_end,
                   candidacy_auto_extended_at = now()
             WHERE id = r.id;
            v_extended_cand := v_extended_cand + 1;

            INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
            VALUES (r.id, NULL, 'candidacy_auto_extended',
                    jsonb_build_object(
                        'approved_candidates', v_approved,
                        'new_candidacy_end', v_new_end,
                        'extension_hours', 48
                    ));

            PERFORM public._send_election_notification(
                r.id,
                'election_voters',
                'تمديد باب الترشح',
                'تم تمديد باب الترشح 48 ساعة إضافية نظراً لعدم اكتمال المنافسة. بادر بالترشّح.',
                'warning',
                'high',
                NULL,
                jsonb_build_object('event', 'candidacy_auto_extended')
            );

        ELSE
            UPDATE elections SET status = 'candidacy_closed' WHERE id = r.id;
            v_closed_cand := v_closed_cand + 1;

            INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
            VALUES (r.id, NULL, 'candidacy_closed_low_competition',
                    jsonb_build_object('approved_candidates', v_approved));

            PERFORM public._send_election_notification(
                r.id,
                'admins',
                'انتخاب بلا منافسة كافية',
                'انتهى باب الترشح بأقل من مرشحَين مقبولَين بعد التمديد. يلزم قرار إداري: فتح التصويت بمرشح واحد أو إلغاء الانتخاب.',
                'warning',
                'high',
                NULL,
                jsonb_build_object('event', 'candidacy_closed_low_competition',
                                   'approved_candidates', v_approved)
            );
        END IF;
    END LOOP;

    WITH upd AS (
        UPDATE elections
        SET status = 'voting_closed'
        WHERE status = 'voting_open'
          AND archived_at IS NULL
          AND voting_end IS NOT NULL
          AND voting_end < now()
        RETURNING id
    )
    SELECT COUNT(*) INTO v_closed_voting FROM upd;

    IF v_closed_cand + v_extended_cand + v_closed_voting > 0 THEN
        INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
        VALUES (NULL, NULL, 'sweep_deadlines',
                jsonb_build_object('closed_candidacy',   v_closed_cand,
                                   'extended_candidacy', v_extended_cand,
                                   'closed_voting',      v_closed_voting));
    END IF;

    RETURN QUERY SELECT v_closed_cand, v_extended_cand, v_closed_voting;
END;
$$;
