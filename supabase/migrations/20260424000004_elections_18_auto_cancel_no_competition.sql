-- =============================================
-- نظام الانتخابات — 18: إلغاء تلقائي بدل الإغلاق في حال انعدام المنافسة
-- =============================================
-- التغيير:
--   في sweep_election_deadlines، فرع "انتهت المهلة بعد التمديد و العدد < 2":
--   بدل الانتقال إلى candidacy_closed، نُلغي الانتخاب فعلياً
--   (status = cancelled, archived_at = now()) مع حذف أي مرشحين متبقّين،
--   بحيث لا يظهر في Kanban ولا يتمكّن الأدمن من فتح تصويت عليه.
--
--   منطق الإلغاء هنا مكافئ لـ cancel_election لكن بدون فحص الصلاحية
--   (الدالة تعمل SECURITY DEFINER من pg_cron حيث auth.uid() = NULL).
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
    v_candidates_deleted  INTEGER;
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
            -- (أ) تمديد تلقائي مرة واحدة 24 ساعة
            v_new_end := now() + interval '24 hours';
            UPDATE elections
               SET candidacy_end           = v_new_end,
                   candidacy_extended_once = TRUE
             WHERE id = r.id;

            PERFORM public._send_election_notification(
                r.id,
                'election_voters',
                'تمديد باب الترشح',
                'تم تمديد باب الترشح لـ ' || v_label
                    || ' لمدة 24 ساعة إضافية بسبب نقص المنافسة. باب الترشح ما زال مفتوحاً.',
                'warning',
                'high',
                NULL,
                jsonb_build_object(
                    'event',        'candidacy_auto_extended',
                    'new_end',      v_new_end,
                    'active_count', v_count
                )
            );

            INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
            VALUES (r.id, NULL, 'candidacy_auto_extended',
                    jsonb_build_object('new_end', v_new_end, 'active_count', v_count));

            v_ext := v_ext + 1;

        ELSIF v_count < 2 THEN
            -- (ب) انتهى التمديد والعدد لا يزال < 2 → إلغاء تلقائي + أرشفة
            WITH d AS (
                DELETE FROM election_candidates
                 WHERE election_id = r.id
                RETURNING 1
            )
            SELECT COUNT(*) INTO v_candidates_deleted FROM d;

            UPDATE elections
               SET status              = 'cancelled',
                   winner_candidate_id = NULL,
                   winner_declared_at  = NULL,
                   winner_declared_by  = NULL,
                   archived_at         = now()
             WHERE id = r.id;

            PERFORM public._send_election_notification(
                r.id,
                'election_participants',
                'أُلغي الانتخاب تلقائياً',
                'أُلغي الانتخاب لـ ' || v_label
                    || ' تلقائياً بسبب عدم توفر منافسين بعد فترة التمديد (المرشحون: ' || v_count || ').',
                'error',
                'high',
                NULL,
                jsonb_build_object(
                    'event',              'election_auto_cancelled_no_competition',
                    'active_count',       v_count,
                    'candidates_deleted', v_candidates_deleted
                )
            );

            INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
            VALUES (r.id, NULL, 'election_auto_cancelled_no_competition',
                    jsonb_build_object(
                        'active_count',       v_count,
                        'candidates_deleted', v_candidates_deleted
                    ));

            v_cancelled := v_cancelled + 1;

        ELSE
            -- (ج) الإغلاق الطبيعي (عدد كافٍ من المرشحين)
            UPDATE elections SET status = 'candidacy_closed' WHERE id = r.id;

            PERFORM public._send_election_notification(
                r.id,
                'election_participants',
                'أُغلق باب الترشح تلقائياً',
                'انتهت فترة تقديم الترشيحات لـ ' || v_label || '. لن يُقبل مرشحون جدد.',
                'info',
                'normal',
                NULL,
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
            r.id,
            'election_participants',
            'انتهى التصويت تلقائياً',
            'انتهت فترة التصويت لـ ' || public._election_target_label(r.id)
                || '. بانتظار إعلان الفائز.',
            'info',
            'normal',
            NULL,
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
