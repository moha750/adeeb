-- =============================================
-- نظام الانتخابات — 30: أرشفة شاملة بدون حذف
-- =============================================
-- التغيير:
--   • cancel_election: لا يحذف election_candidates ولا election_votes ولا الملفات.
--     يُغيّر الحالة إلى cancelled ويُؤرشف فقط.
--   • sweep_election_deadlines (فرع auto-cancel-no-competition):
--     لا يحذف المرشحين، يُغيّر الحالة فقط.
--   • التوقيعات تبقى نفسها لتفادي كسر العقد مع العميل
--     (cancel_election يُرجع TEXT[] فارغاً بدل مسارات للحذف).
-- =============================================

DROP FUNCTION IF EXISTS cancel_election(UUID, TEXT);

CREATE OR REPLACE FUNCTION cancel_election(
    p_election  UUID,
    p_reason    TEXT DEFAULT NULL
)
RETURNS TEXT[]
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_status                TEXT;
    v_votes_preserved       INT := 0;
    v_candidates_preserved  INT := 0;
    v_files_preserved       INT := 0;
BEGIN
    IF NOT has_election_admin_permission(auth.uid()) THEN
        RAISE EXCEPTION 'غير مصرح بإلغاء الانتخاب';
    END IF;

    SELECT status INTO v_status FROM elections WHERE id = p_election;
    IF v_status IS NULL THEN
        RAISE EXCEPTION 'الانتخاب غير موجود';
    END IF;
    IF v_status = 'completed' THEN
        RAISE EXCEPTION 'لا يمكن إلغاء انتخاب مكتمل';
    END IF;

    -- إحصاءات للسجل (بدون حذف)
    SELECT COUNT(*) INTO v_votes_preserved
      FROM election_votes WHERE election_id = p_election;
    SELECT COUNT(*) INTO v_candidates_preserved
      FROM election_candidates WHERE election_id = p_election;
    SELECT COUNT(*) INTO v_files_preserved
      FROM storage.objects
     WHERE bucket_id = 'election-files'
       AND name LIKE '%/' || p_election::text || '/%';

    UPDATE elections
       SET status              = 'cancelled',
           winner_candidate_id = NULL,
           winner_declared_at  = NULL,
           winner_declared_by  = NULL,
           archived_at         = COALESCE(archived_at, now())
     WHERE id = p_election;

    INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
    VALUES (p_election, auth.uid(), 'cancelled',
            jsonb_build_object(
                'reason',                p_reason,
                'votes_preserved',       v_votes_preserved,
                'candidates_preserved',  v_candidates_preserved,
                'files_preserved',       v_files_preserved
            ));

    -- نُرجع مصفوفة فارغة لإبقاء التوقيع متوافقاً مع العميل القديم.
    RETURN '{}'::TEXT[];
END;
$$;

GRANT EXECUTE ON FUNCTION cancel_election(UUID, TEXT) TO authenticated;


-- =============================================
-- sweep_election_deadlines: إلغاء تلقائي بدون حذف
-- =============================================
CREATE OR REPLACE FUNCTION public.sweep_election_deadlines()
RETURNS TABLE(closed_candidacy integer, closed_voting integer)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_closed_c            INTEGER := 0;
    v_ext                 INTEGER := 0;
    v_cancelled           INTEGER := 0;
    v_v                   INTEGER := 0;
    r                     RECORD;
    v_count               INTEGER;
    v_new_end             TIMESTAMPTZ;
    v_label               TEXT;
BEGIN
    FOR r IN
        SELECT id, candidacy_extended_once
        FROM elections
        WHERE status = 'candidacy_open'
          AND archived_at IS NULL
          AND candidacy_end IS NOT NULL
          AND candidacy_end < now()
    LOOP
        v_count := public._count_active_candidates(r.id);
        v_label := public._election_target_label(r.id);

        IF v_count < 2 AND NOT r.candidacy_extended_once THEN
            -- (أ) تمديد تلقائي 24 ساعة
            v_new_end := now() + interval '24 hours';
            UPDATE elections
               SET candidacy_end           = v_new_end,
                   candidacy_extended_once = TRUE
             WHERE id = r.id;

            PERFORM public._send_election_notification(
                r.id, 'election_voters', 'تمديد باب الترشح',
                'تم تمديد باب الترشح لـ ' || v_label
                    || ' لمدة 24 ساعة إضافية بسبب نقص المنافسة. باب الترشح ما زال مفتوحاً.',
                'warning', 'high', NULL,
                jsonb_build_object('event', 'candidacy_auto_extended',
                                   'new_end', v_new_end, 'active_count', v_count)
            );

            INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
            VALUES (r.id, NULL, 'candidacy_auto_extended',
                    jsonb_build_object('new_end', v_new_end, 'active_count', v_count));

            v_ext := v_ext + 1;

        ELSIF v_count < 2 THEN
            -- (ب) إلغاء تلقائي بدون حذف — المرشّحون والملفات تبقى للأرشفة
            UPDATE elections
               SET status              = 'cancelled',
                   winner_candidate_id = NULL,
                   winner_declared_at  = NULL,
                   winner_declared_by  = NULL,
                   archived_at         = now()
             WHERE id = r.id;

            PERFORM public._send_election_notification(
                r.id, 'election_participants', 'أُلغي الانتخاب تلقائياً',
                'أُلغي الانتخاب لـ ' || v_label
                    || ' تلقائياً بسبب عدم توفر منافسين بعد فترة التمديد (المرشحون: ' || v_count || ').',
                'error', 'high', NULL,
                jsonb_build_object('event', 'election_auto_cancelled_no_competition',
                                   'active_count', v_count, 'candidates_preserved', v_count)
            );

            INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
            VALUES (r.id, NULL, 'election_auto_cancelled_no_competition',
                    jsonb_build_object('active_count', v_count,
                                       'candidates_preserved', v_count));

            v_cancelled := v_cancelled + 1;

        ELSE
            -- (ج) الإغلاق الطبيعي
            UPDATE elections SET status = 'candidacy_closed' WHERE id = r.id;

            PERFORM public._send_election_notification(
                r.id, 'election_participants', 'أُغلق باب الترشح تلقائياً',
                'انتهت فترة تقديم الترشيحات لـ ' || v_label || '. لن يُقبل مرشحون جدد.',
                'info', 'normal', NULL,
                jsonb_build_object('event', 'candidacy_auto_closed')
            );

            v_closed_c := v_closed_c + 1;
        END IF;
    END LOOP;

    -- إغلاق تلقائي للتصويت (كما هو)
    FOR r IN
        UPDATE elections
           SET status = 'voting_closed'
         WHERE status = 'voting_open'
           AND archived_at IS NULL
           AND voting_end IS NOT NULL
           AND voting_end < now()
        RETURNING id
    LOOP
        v_v := v_v + 1;
        PERFORM public._send_election_notification(
            r.id, 'election_participants', 'انتهى التصويت تلقائياً',
            'انتهت فترة التصويت لـ ' || public._election_target_label(r.id)
                || '. بانتظار إعلان الفائز.',
            'info', 'normal', NULL,
            jsonb_build_object('event', 'voting_auto_closed')
        );
    END LOOP;

    IF v_closed_c + v_ext + v_cancelled + v_v > 0 THEN
        INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
        VALUES (NULL, NULL, 'sweep_deadlines',
                jsonb_build_object(
                    'closed_candidacy',    v_closed_c,
                    'extended_candidacy',  v_ext,
                    'cancelled_candidacy', v_cancelled,
                    'closed_voting',       v_v
                ));
    END IF;

    RETURN QUERY SELECT v_closed_c, v_v;
END;
$$;
