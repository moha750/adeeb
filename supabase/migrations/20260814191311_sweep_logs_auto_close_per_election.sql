-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260814191311   الاسم: sweep_logs_auto_close_per_election

-- **ما تفعله الكنّاسةُ يُكتب في سجلّ المقعد الذي وقع عليه** (أمرُ المالك ٢٠٢٦-٠٨-١٤):
-- كانت تُغلق بابَ الترشّح وبابَ التصويت ثمّ تكتب حصادَها في صفٍّ **عامٍّ** واحد (`sweep_deadlines`
-- بعددٍ مجرَّد و`election_id = NULL`)، فيبقى سجلُّ كلِّ مقعدٍ صامتًا عن أظهرِ ما جرى له. ووقوفُ
-- المقعد كان يُسجَّل وحدَه، فافترق أخوان في المعاملة.
--
-- والسطران المضافان يكتبان بفاعلٍ `NULL` — والشاشةُ تقرؤه «بواسطة النظام»: الفعلُ وقع بحكم
-- الموعد لا بقرار أحد، فلا يُنسَب إلى أحد. ونوعُ الحدث `status_transition` نفسُه الذي يكتبه
-- المشرف حين يُغلق بيده، فلا مفردةَ ثانيةٌ للفعل الواحد؛ ويفترقان بالفاعل وحدَه (وبـ`auto`).
--
-- ولا يمسّ هذا سلوكًا: الإغلاقُ والإشعاراتُ والتزكيةُ كما هي حرفًا.
CREATE OR REPLACE FUNCTION public.sweep_election_deadlines()
 RETURNS TABLE(closed_candidacy integer, closed_voting integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_closed_c  INTEGER := 0;
    v_stalled   INTEGER := 0;
    v_v         INTEGER := 0;
    r           RECORD;
    v_count     INTEGER;
    v_label     TEXT;
BEGIN
    FOR r IN
        SELECT id
        FROM elections
        WHERE status = 'candidacy_open'
          AND archived_at IS NULL
          AND stalled_at IS NULL
          AND candidacy_end IS NOT NULL
          AND candidacy_end < now()
    LOOP
        v_count := public._count_active_candidates(r.id);
        v_label := public._election_target_label(r.id);

        IF v_count = 0 THEN
            UPDATE elections SET stalled_at = now() WHERE id = r.id;

            PERFORM public._send_election_notification(
                r.id, 'election_admins', 'انتخابٌ بلا مرشّحين ينتظر قرارك',
                'انتهت مهلةُ الترشّح لـ ' || v_label
                    || ' ولم يتقدّم أحد. الانتخابُ واقفٌ حتّى تختار: تمديدُ المهلة، أو تكليفُ شاغل، أو إلغاءٌ بسبب.',
                'warning', 'high', NULL,
                jsonb_build_object('event', 'candidacy_stalled', 'active_count', 0)
            );

            INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
            VALUES (r.id, NULL, 'candidacy_stalled', jsonb_build_object('active_count', 0));

            v_stalled := v_stalled + 1;

        ELSE
            UPDATE elections SET status = 'candidacy_closed' WHERE id = r.id;

            -- الإغلاقُ الآليّ يُكتب في سجلّ مقعده (بفاعلٍ NULL = النظام)
            INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
            VALUES (r.id, NULL, 'status_transition',
                    jsonb_build_object('new_status', 'candidacy_closed',
                                       'auto', true,
                                       'active_count', v_count));

            PERFORM public._send_election_notification(
                r.id, 'election_participants', 'أُغلق باب الترشح تلقائياً',
                'انتهت فترة تقديم الترشيحات لـ ' || v_label || '. لن يُقبل مرشحون جدد.',
                'info', 'normal', NULL,
                jsonb_build_object('event', 'candidacy_auto_closed', 'active_count', v_count)
            );

            v_closed_c := v_closed_c + 1;
        END IF;
    END LOOP;

    FOR r IN
        SELECT id
        FROM elections
        WHERE status = 'voting_open'
          AND archived_at IS NULL
          AND voting_end IS NOT NULL
          AND voting_end < now()
    LOOP
        UPDATE elections SET status = 'voting_closed' WHERE id = r.id;
        v_v := v_v + 1;

        -- وكذلك إغلاقُ التصويت. ويُكتب قبل `_finalize_confidence` فيبقى الترتيبُ صادقًا:
        -- أُغلق البابُ أوّلًا، ثمّ سقطت التزكيةُ إن سقطت (فتكتب هي سطرَ إلغائها بعده).
        INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
        VALUES (r.id, NULL, 'status_transition',
                jsonb_build_object('new_status', 'voting_closed', 'auto', true));

        IF NOT public._finalize_confidence(r.id) THEN
            PERFORM public._send_election_notification(
                r.id, 'election_participants', 'انتهى التصويت تلقائياً',
                'انتهت فترة التصويت لـ ' || public._election_target_label(r.id)
                    || '. بانتظار إعلان الفائز.',
                'info', 'normal', NULL,
                jsonb_build_object('event', 'voting_auto_closed')
            );
        END IF;
    END LOOP;

    IF v_closed_c + v_stalled + v_v > 0 THEN
        INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
        VALUES (NULL, NULL, 'sweep_deadlines',
                jsonb_build_object(
                    'closed_candidacy',  v_closed_c,
                    'stalled_candidacy', v_stalled,
                    'closed_voting',     v_v
                ));
    END IF;

    RETURN QUERY SELECT v_closed_c, v_v;
END;
$function$;
