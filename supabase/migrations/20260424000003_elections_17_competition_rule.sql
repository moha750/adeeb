-- =============================================
-- نظام الانتخابات — 17: قاعدة المنافسة (حدّ أدنى مرشحَين)
-- =============================================
-- التغييرات:
--   (أ) إلزام الحدّ الأدنى (2 مرشحَين نشطَين) لإغلاق الترشح اليدوي.
--   (ب) عند انتهاء المهلة ولم يكتمل النصاب: تمديد تلقائي مرة واحدة
--       لمدة 24 ساعة مع إشعار "تمديد باب الترشح لنقص المنافسة".
--   (ج) إذا انتهى التمديد وبقي العدد < 2: إغلاق تلقائي مع إشعار
--       "إغلاق تلقائي بسبب عدم توفر منافسين".
--
--   المرشح النشط = status IN ('pending','approved','needs_edit')
--   (استبعاد withdrawn و rejected).
-- =============================================


-- ════════════════════════════════════════════════════════════════
-- (1) عمود تتبّع التمديد (لضمان مرة واحدة فقط)
-- ════════════════════════════════════════════════════════════════
ALTER TABLE elections
    ADD COLUMN IF NOT EXISTS candidacy_extended_once BOOLEAN NOT NULL DEFAULT FALSE;


-- ════════════════════════════════════════════════════════════════
-- (2) Helper: عدد المرشحين النشطين في انتخاب
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public._count_active_candidates(p_election UUID)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COUNT(*)::INT
    FROM election_candidates
    WHERE election_id = p_election
      AND status IN ('pending','approved','needs_edit');
$$;

GRANT EXECUTE ON FUNCTION public._count_active_candidates(UUID) TO authenticated;


-- ════════════════════════════════════════════════════════════════
-- (3) transition_election: منع الإغلاق اليدوي قبل مرشحَين اثنين
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.transition_election(p_election UUID, p_new_status TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_status TEXT;
    v_active_count   INT;
BEGIN
    IF NOT has_election_admin_permission(auth.uid()) THEN
        RAISE EXCEPTION 'غير مصرح بتغيير حالة الانتخاب';
    END IF;

    SELECT status INTO v_current_status
    FROM elections
    WHERE id = p_election;

    IF v_current_status IS NULL THEN
        RAISE EXCEPTION 'الانتخاب غير موجود';
    END IF;

    -- قاعدة المنافسة: الإغلاق اليدوي يتطلب >= 2 مرشحَين نشطَين
    IF v_current_status = 'candidacy_open' AND p_new_status = 'candidacy_closed' THEN
        v_active_count := public._count_active_candidates(p_election);
        IF v_active_count < 2 THEN
            RAISE EXCEPTION 'لا يمكن إغلاق باب الترشح قبل وجود مرشحَين على الأقل لضمان المنافسة (الحالي: %).', v_active_count;
        END IF;
    END IF;

    UPDATE elections SET status = p_new_status WHERE id = p_election;

    INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
    VALUES (p_election, auth.uid(), 'status_transition',
            jsonb_build_object('new_status', p_new_status));
END;
$$;


-- ════════════════════════════════════════════════════════════════
-- (4) sweep_election_deadlines: تمديد ذكي ثم إغلاق
-- ════════════════════════════════════════════════════════════════
-- نحتاج DROP لأن توقيع OUT parameters يختلف عن تعريف Postgres الداخلي
DROP FUNCTION IF EXISTS public.sweep_election_deadlines();

CREATE FUNCTION public.sweep_election_deadlines()
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
    -- ── (أ) معالجة الترشحات المنتهية ──
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
            -- تمديد تلقائي 24 ساعة (مرّة واحدة فقط)
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
            -- إغلاق تلقائي
            UPDATE elections SET status = 'candidacy_closed' WHERE id = r.id;
            v_closed_c := v_closed_c + 1;

            IF v_count < 2 THEN
                -- إغلاق بسبب عدم توفر منافسين (حتى بعد التمديد أو لا يستحق تمديد)
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
                -- إغلاق طبيعي (اكتمل النصاب)
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

    -- ── (ب) إغلاق تلقائي للتصويت (كما هو) ──
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

    -- audit عام
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

REVOKE EXECUTE ON FUNCTION public.sweep_election_deadlines() FROM PUBLIC;
