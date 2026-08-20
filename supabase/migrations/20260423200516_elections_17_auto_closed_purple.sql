-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260423200516   الاسم: elections_17_auto_closed_purple

CREATE OR REPLACE FUNCTION public.sweep_election_deadlines()
RETURNS TABLE(closed_candidacy integer, closed_voting integer)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_c INTEGER := 0;
    v_v INTEGER := 0;
    r   RECORD;
BEGIN
    FOR r IN
        UPDATE elections
           SET status = 'candidacy_closed'
         WHERE status = 'candidacy_open'
           AND archived_at IS NULL
           AND candidacy_end IS NOT NULL
           AND candidacy_end < now()
        RETURNING id
    LOOP
        v_c := v_c + 1;
        PERFORM _send_election_notification(
            r.id,
            'election_participants',
            'أُغلق باب الترشح تلقائياً',
            'انتهت فترة تقديم الترشيحات لـ ' || _election_target_label(r.id) || '. لن يُقبل مرشحون جدد.',
            'purple',
            'normal',
            NULL,
            jsonb_build_object('event', 'candidacy_auto_closed')
        );
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
        PERFORM _send_election_notification(
            r.id,
            'election_participants',
            'انتهى التصويت تلقائياً',
            'انتهت فترة التصويت لـ ' || _election_target_label(r.id) || '. بانتظار إعلان الفائز.',
            'info',
            'normal',
            NULL,
            jsonb_build_object('event', 'voting_auto_closed')
        );
    END LOOP;

    IF v_c + v_v > 0 THEN
        INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
        VALUES (NULL, NULL, 'sweep_deadlines',
                jsonb_build_object('closed_candidacy', v_c, 'closed_voting', v_v));
    END IF;

    RETURN QUERY SELECT v_c, v_v;
END;
$$;
