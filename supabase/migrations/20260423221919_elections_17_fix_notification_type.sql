-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260423221919   الاسم: elections_17_fix_notification_type

CREATE OR REPLACE FUNCTION public.sweep_election_deadlines()
RETURNS TABLE(closed_candidacy integer, closed_voting integer)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_closed_c  INTEGER := 0;
    v_ext       INTEGER := 0;
    v_v         INTEGER := 0;
    r           RECORD;
    v_count     INTEGER;
    v_new_end   TIMESTAMPTZ;
    v_label     TEXT;
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

        ELSE
            UPDATE elections SET status = 'candidacy_closed' WHERE id = r.id;
            v_closed_c := v_closed_c + 1;

            IF v_count < 2 THEN
                PERFORM public._send_election_notification(
                    r.id,
                    'election_participants',
                    'أُغلق باب الترشح تلقائياً',
                    'أُغلق باب الترشح لـ ' || v_label
                        || ' تلقائياً بسبب عدم توفر منافسين (المرشحون: ' || v_count || ').',
                    'error',
                    'high',
                    NULL,
                    jsonb_build_object(
                        'event',        'candidacy_auto_closed_no_competition',
                        'active_count', v_count
                    )
                );

                INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
                VALUES (r.id, NULL, 'candidacy_auto_closed_no_competition',
                        jsonb_build_object('active_count', v_count));

            ELSE
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
            END IF;
        END IF;
    END LOOP;

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

    IF v_closed_c + v_ext + v_v > 0 THEN
        INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
        VALUES (NULL, NULL, 'sweep_deadlines',
                jsonb_build_object(
                    'closed_candidacy',   v_closed_c,
                    'extended_candidacy', v_ext,
                    'closed_voting',      v_v
                ));
    END IF;

    RETURN QUERY SELECT v_closed_c, v_v;
END;
$$;
