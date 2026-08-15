-- =========================================================
-- الانتخابات : المرشّحُ الوحيد يُعرَض على الناخبين، والمقعدُ الخالي ينتظر إنسانًا
--
-- العلّة : كان القانونُ يعامل «مرشّحٌ واحد» و«لا مرشّح» معاملةً واحدة — يمدّ الباب
-- أربعًا وعشرين ساعةً مرّةً، ثمّ يُلغي الانتخاب صامتًا. فمن تقدّم وحده عوقب بصمت
-- غيره، والمقعدُ الخالي أُعدم بقرارٍ لا يوقّعه إنسان.
--
-- الحكم (بكلمة المالك) :
--   • مرشّحٌ واحد  : يجوز أن يتولّى بلا منافس إن أيّده الناخبون. فيُغلق الترشّح
--     ويُفتح **تصويتُ تزكية** : يؤيّد أو يعترض. إن غلب التأييدُ وزنًا فهو الفائز
--     ويُسنَد المنصب كأيّ فائز؛ وإن لم يغلب سقطت التزكية وأُلغي الانتخاب بسببٍ مسجّل.
--   • لا مرشّح    : لا تمديدَ ولا إلغاءَ من الآلة. يقف الانتخاب موسومًا بـ`stalled_at`
--     وتُرفع الحال لمن يملك إدارة الانتخابات : يمدّد بمهلةٍ يختارها، أو يكلّف شاغلًا،
--     أو يُلغي بسببٍ مكتوب. والبابُ يبقى مفتوحًا في أثناء الانتظار، فإن تقدّم عضوٌ
--     سقط الوسمُ من نفسه وعاد المسار طبيعيًّا.
--
-- ملاحظة : `candidacy_extended_once` و`candidacy_auto_extended_at` صارا عمودَين
-- ميّتَين بموت التمديد التلقائيّ. لا يُقرآن ولا يُكتبان بعد اليوم، وتُركا في مكانهما
-- (لا يُحذف صفٌّ ولا عمودٌ إلّا بإذنٍ صريح).
-- =========================================================

/* ═══ ١ : خانةُ الاقتراع تحمل رأيًا لا اسمًا فقط ═══════════════════════ */

ALTER TABLE public.election_votes
    ADD COLUMN IF NOT EXISTS vote_choice TEXT NOT NULL DEFAULT 'approve';

ALTER TABLE public.election_votes DROP CONSTRAINT IF EXISTS election_votes_choice_check;
ALTER TABLE public.election_votes
    ADD CONSTRAINT election_votes_choice_check CHECK (vote_choice IN ('approve', 'reject'));

COMMENT ON COLUMN public.election_votes.vote_choice IS
'رأيُ الناخب : تأييدٌ لمن اختاره، أو اعتراضٌ في تزكية مرشّحٍ وحيد. كلُّ صوتٍ في انتخابٍ تنافسيّ تأييدٌ بالضرورة (الافتراض).';

/* ═══ ٢ : وسمُ المقعد المتعثّر ═════════════════════════════════════════ */

ALTER TABLE public.elections
    ADD COLUMN IF NOT EXISTS stalled_at TIMESTAMPTZ;

COMMENT ON COLUMN public.elections.stalled_at IS
'حلّت مهلةُ الترشّح ولا مرشّح : الانتخاب واقفٌ ينتظر قرار إنسان (تمديدٌ أو تكليفٌ أو إلغاء). يسقط الوسمُ بترشّحٍ جديد أو بموعدٍ جديد.';

COMMENT ON COLUMN public.elections.candidacy_extended_once IS
'ميّت : كان للتمديد التلقائيّ (٢٤ ساعة) الذي أُلغي في 2026-08-13. لا يُقرأ ولا يُكتب.';

/* ═══ ٣ : أدواتُ الحساب — تزكيةٌ أم تنافس، وكم وزنُ كلّ رأي ═══════════ */

CREATE OR REPLACE FUNCTION public.is_confidence_election(p_election UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    -- معتمَدٌ واحدٌ لا غير : الاقتراعُ عليه تزكيةٌ لا اختيارٌ بين اثنين.
    SELECT public._count_approved_candidates(p_election) = 1;
$$;

CREATE OR REPLACE FUNCTION public._choice_weight(p_election UUID, p_choice TEXT)
RETURNS NUMERIC
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(SUM(vote_weight), 0)::NUMERIC
    FROM election_votes
    WHERE election_id = p_election AND vote_choice = p_choice;
$$;

/* ═══ ٤ : الصوتُ يحمل رأيه — والاعتراضُ لا يكون إلّا في تزكية ═════════ */

DROP FUNCTION IF EXISTS public.cast_vote(UUID, UUID);

CREATE OR REPLACE FUNCTION public.cast_vote(
    p_election  UUID,
    p_candidate UUID,
    p_choice    TEXT DEFAULT 'approve'
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id     UUID;
    v_choice TEXT := COALESCE(NULLIF(TRIM(p_choice), ''), 'approve');
BEGIN
    IF v_choice NOT IN ('approve', 'reject') THEN
        RAISE EXCEPTION 'رأيٌ غير معروف في بطاقة الاقتراع';
    END IF;

    IF v_choice = 'reject' AND NOT public.is_confidence_election(p_election) THEN
        RAISE EXCEPTION 'الاعتراض لا يكون إلّا في تزكية مرشّحٍ وحيد';
    END IF;

    INSERT INTO election_votes
        (election_id, voter_id, candidate_id, vote_weight, voter_role_snapshot, vote_choice)
    VALUES
        (p_election, auth.uid(), p_candidate, 1.0, 'placeholder', v_choice)
    RETURNING id INTO v_id;

    -- السجلّ يقول «صوّت» ولا يقول «بماذا» : الرأيُ يبقى في الصفّ المُعمّى وحده.
    INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
    VALUES (p_election, auth.uid(), 'vote_cast',
            jsonb_build_object('vote_id', v_id));

    RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_vote(UUID, UUID, TEXT) TO authenticated, service_role;

/* ═══ ٥ : فتحُ التصويت يقبل مرشّحًا واحدًا (تزكيةً) ═══════════════════ */

CREATE OR REPLACE FUNCTION public.promote_to_voting_check()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_unreviewed INT;
    v_approved   INT;
BEGIN
    IF NEW.status <> 'voting_open' OR OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    SELECT
        COUNT(*) FILTER (WHERE status IN ('pending','needs_edit')),
        COUNT(*) FILTER (WHERE status = 'approved')
    INTO v_unreviewed, v_approved
    FROM election_candidates
    WHERE election_id = NEW.id;

    IF v_unreviewed > 0 THEN
        RAISE EXCEPTION 'لا يمكن فتح التصويت: يوجد % مرشحاً قيد المراجعة', v_unreviewed;
    END IF;

    -- الواحدُ يُعرَض على الناخبين تزكيةً؛ والفراغُ وحده يمنع فتح الصندوق.
    IF v_approved < 1 THEN
        RAISE EXCEPTION 'لا يمكن فتح التصويت: لا مرشّح معتمَد';
    END IF;

    RETURN NEW;
END;
$$;

/* ═══ ٦ : إلغاءٌ داخليٌّ بلا حارس — تناديه الكنّاسةُ ودوالُّ الحسم ═════ */

CREATE OR REPLACE FUNCTION public._cancel_election_apply(
    p_election UUID,
    p_reason   TEXT,
    p_event    TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE elections
       SET status              = 'cancelled',
           winner_candidate_id = NULL,
           winner_declared_at  = NULL,
           winner_declared_by  = NULL,
           stalled_at          = NULL,
           archived_at         = COALESCE(archived_at, now())
     WHERE id = p_election;

    INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
    VALUES (p_election, auth.uid(), p_event,
            jsonb_build_object('reason', p_reason));
END;
$$;

REVOKE ALL ON FUNCTION public._cancel_election_apply(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

/* ═══ ٧ : حسمُ التزكية — إن لم يغلب التأييدُ سقطت وأُلغي الانتخاب ═════ */

CREATE OR REPLACE FUNCTION public._finalize_confidence(p_election UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_status TEXT;
    v_yes    NUMERIC;
    v_no     NUMERIC;
BEGIN
    SELECT status INTO v_status FROM elections WHERE id = p_election;
    IF v_status IS DISTINCT FROM 'voting_closed' THEN RETURN FALSE; END IF;
    IF NOT public.is_confidence_election(p_election) THEN RETURN FALSE; END IF;

    v_yes := public._choice_weight(p_election, 'approve');
    v_no  := public._choice_weight(p_election, 'reject');

    -- التزكيةُ تحتاج غلبةً صريحة : التعادلُ والصمتُ ليسا تأييدًا.
    IF v_yes > v_no THEN RETURN FALSE; END IF;

    PERFORM public._cancel_election_apply(
        p_election,
        'سقطت التزكية : لم يغلب التأييدُ الاعتراض (تأييد ' || v_yes || ' مقابل ' || v_no || ')',
        'confidence_failed');

    PERFORM public._send_election_notification(
        p_election, 'election_participants', 'سقطت التزكية',
        'لم يغلب التأييدُ الاعتراضَ في تزكية ' || public._election_target_label(p_election)
            || '. أُلغي الانتخاب وبقي المقعد شاغرًا.',
        'warning', 'high', NULL,
        jsonb_build_object('event', 'confidence_failed',
                           'approve_weight', v_yes, 'reject_weight', v_no));

    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public._finalize_confidence(UUID) FROM PUBLIC, anon, authenticated;

/* ═══ ٨ : الانتقالُ اليدويّ — يكفي مرشّحٌ واحد، والتصويتُ يُحسَم بإغلاقه ═ */

CREATE OR REPLACE FUNCTION public.transition_election(
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
    v_active_count   INT;
    v_reopened       BOOLEAN := FALSE;
BEGIN
    IF NOT has_election_admin_permission(auth.uid()) THEN
        RAISE EXCEPTION 'غير مصرح بتغيير حالة الانتخاب';
    END IF;

    SELECT status INTO v_current_status FROM elections WHERE id = p_election;
    IF v_current_status IS NULL THEN
        RAISE EXCEPTION 'الانتخاب غير موجود';
    END IF;

    -- الإغلاقُ اليدويّ للترشّح : لا يصحّ على صندوقٍ فارغ. والواحدُ يمضي تزكيةً.
    IF p_new_status = 'candidacy_closed' AND v_current_status = 'candidacy_open' THEN
        v_active_count := public._count_active_candidates(p_election);
        IF v_active_count < 1 THEN
            RAISE EXCEPTION
                'لا يمكن إغلاق باب الترشح ولا مرشّح فيه؛ مدِّد المهلة أو كلِّف شاغلًا أو ألغِ الانتخاب.'
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    IF p_new_status = 'voting_open' THEN
        IF p_voting_end IS NOT NULL AND p_voting_end <= now() THEN
            RAISE EXCEPTION 'نهاية التصويت يجب أن تكون في المستقبل';
        END IF;
        UPDATE elections
           SET status     = p_new_status,
               voting_end = p_voting_end
         WHERE id = p_election;

    ELSIF p_new_status = 'candidacy_open' AND v_current_status = 'candidacy_closed' THEN
        -- إعادةُ فتحٍ : يُرفع الموعدُ الماضي فلا تُغلقه الكنّاسة بعد لحظة، ويسقط وسمُ التعثّر.
        v_reopened := TRUE;
        UPDATE elections
           SET status        = p_new_status,
               candidacy_end = NULL,
               stalled_at    = NULL
         WHERE id = p_election;

    ELSE
        UPDATE elections SET status = p_new_status WHERE id = p_election;
    END IF;

    INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
    VALUES (p_election, auth.uid(), 'status_transition',
            jsonb_build_object('new_status', p_new_status,
                               'voting_end', p_voting_end,
                               'candidacy_end_cleared', v_reopened));

    -- إغلاقُ تصويتِ تزكيةٍ لم يغلب فيه التأييد يُسقطها من فوره (بسببٍ مسجّل).
    IF p_new_status = 'voting_closed' THEN
        PERFORM public._finalize_confidence(p_election);
    END IF;
END;
$$;

/* ═══ ٩ : الكنّاسة — لا تمدّد ولا تُعدم؛ تُغلق أو تُوقِف وتُنادي إنسانًا ═ */

CREATE OR REPLACE FUNCTION public.sweep_election_deadlines()
RETURNS TABLE(closed_candidacy INTEGER, closed_voting INTEGER)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
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
            -- (أ) لا مرشّح : يقف الانتخاب وينتظر قرار إنسان. البابُ يبقى مفتوحًا لمن أراد.
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
            -- (ب) الإغلاق الطبيعيّ : واحدًا كان أو أكثر. والواحدُ يُعرَض تزكيةً.
            UPDATE elections SET status = 'candidacy_closed' WHERE id = r.id;

            PERFORM public._send_election_notification(
                r.id, 'election_participants', 'أُغلق باب الترشح تلقائياً',
                'انتهت فترة تقديم الترشيحات لـ ' || v_label || '. لن يُقبل مرشحون جدد.',
                'info', 'normal', NULL,
                jsonb_build_object('event', 'candidacy_auto_closed', 'active_count', v_count)
            );

            v_closed_c := v_closed_c + 1;
        END IF;
    END LOOP;

    -- إغلاق التصويت عند موعده، ثمّ حسمُ التزكية إن كانت تزكيةً لم يغلب فيها التأييد.
    -- (يُقرأ ثمّ يُحدَّث صفًّا صفًّا لأنّ الحسم يكتب في الجدول نفسه داخل الحلقة.)
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
$$;

/* ═══ ١٠ : ترشّحٌ في أثناء الانتظار يرفع الوسم ويرفع الموعد الماضي ════ */

CREATE OR REPLACE FUNCTION public.clear_stall_on_candidacy()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- الموعدُ الذي مضى يُرفع معه، وإلّا أغلقت الكنّاسةُ البابَ بعد دقيقةٍ من ترشّحه.
    UPDATE elections
       SET stalled_at    = NULL,
           candidacy_end = NULL
     WHERE id = NEW.election_id
       AND stalled_at IS NOT NULL;

    IF FOUND THEN
        INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
        VALUES (NEW.election_id, NEW.user_id, 'stall_cleared_by_candidacy',
                jsonb_build_object('candidate_id', NEW.id));
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS candidates_clear_stall ON public.election_candidates;
CREATE TRIGGER candidates_clear_stall
    AFTER INSERT ON public.election_candidates
    FOR EACH ROW EXECUTE FUNCTION public.clear_stall_on_candidacy();

/* ═══ ١١ : حارسُ الإعلان — التأييدُ وحده يُحسب، والتزكيةُ تُشترط غلبتُها ═ */

CREATE OR REPLACE FUNCTION public.enforce_winner_declaration()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cand        election_candidates%ROWTYPE;
    v_dept        integer;
    v_top_weight  NUMERIC;
    v_this_weight NUMERIC;
    v_no_weight   NUMERIC;
BEGIN
    IF NEW.winner_candidate_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF OLD.winner_candidate_id IS NOT DISTINCT FROM NEW.winner_candidate_id THEN
        RETURN NEW;
    END IF;

    IF OLD.winner_candidate_id IS NOT NULL AND NEW.status <> 'cancelled' THEN
        RAISE EXCEPTION 'لا يمكن تغيير الفائز بعد إعلانه';
    END IF;

    SELECT * INTO v_cand FROM election_candidates WHERE id = NEW.winner_candidate_id;
    IF NOT FOUND OR v_cand.election_id <> NEW.id OR v_cand.status <> 'approved' THEN
        RAISE EXCEPTION 'الفائز المقترح ليس مرشحاً معتمداً في هذا الانتخاب';
    END IF;

    IF NEW.status NOT IN ('voting_closed','completed') THEN
        RAISE EXCEPTION 'لا يمكن إعلان الفائز إلا بعد إغلاق التصويت';
    END IF;

    -- تزكيةُ مرشّحٍ وحيد : لا تصحّ إلّا بغلبة التأييد على الاعتراض.
    IF public.is_confidence_election(NEW.id) THEN
        v_this_weight := public._choice_weight(NEW.id, 'approve');
        v_no_weight   := public._choice_weight(NEW.id, 'reject');
        IF NOT (v_this_weight > v_no_weight) THEN
            RAISE EXCEPTION 'سقطت التزكية: لم يغلب التأييدُ الاعتراض';
        END IF;
        NEW.winner_declared_at := COALESCE(NEW.winner_declared_at, now());
        NEW.winner_declared_by := COALESCE(NEW.winner_declared_by, auth.uid());
        RETURN NEW;
    END IF;

    v_dept := COALESCE(NEW.target_department_id,
                       (SELECT c.department_id FROM committees c WHERE c.id = NEW.target_committee_id));

    -- أ٣: لا يفوز العضو بمقعدين في القسم نفسه في الدورة نفسها (تنسيقًا أو قيادةً أو نيابةً).
    IF EXISTS (
        SELECT 1 FROM elections e2
        JOIN election_candidates ec2 ON ec2.id = e2.winner_candidate_id
        WHERE e2.id <> NEW.id
          AND election_department(e2.id) = v_dept
          AND e2.status = 'completed'
          AND e2.winner_declared_at >= NEW.candidacy_opened_at
          AND ec2.user_id = v_cand.user_id
    ) THEN
        RAISE EXCEPTION 'هذا العضو فائزٌ بمقعدٍ آخر في هذا القسم؛ أعلِن الوصيفَ لهذا المقعد.';
    END IF;

    -- أعلى وزنٍ بين المرشّحين غير المُقصَين (فبهذا يصحّ إعلانُ الوصيف حين يأخذ الأعلى المقعد الآخر).
    -- والتأييدُ وحده يُحسب : الاعتراضُ لا يكون إلّا في تزكيةٍ حُسمت أعلاه.
    SELECT COALESCE(SUM(ev.vote_weight), 0) INTO v_top_weight
    FROM election_votes ev
    WHERE ev.election_id = NEW.id
      AND ev.vote_choice = 'approve'
      AND NOT EXISTS (
            SELECT 1 FROM elections e2
            JOIN election_candidates ec2 ON ec2.id = e2.winner_candidate_id
            JOIN election_candidates ecx ON ecx.id = ev.candidate_id
            WHERE e2.id <> NEW.id
              AND election_department(e2.id) = v_dept
              AND e2.status = 'completed'
              AND e2.winner_declared_at >= NEW.candidacy_opened_at
              AND ec2.user_id = ecx.user_id
      )
    GROUP BY ev.candidate_id
    ORDER BY COALESCE(SUM(ev.vote_weight), 0) DESC
    LIMIT 1;

    SELECT COALESCE(SUM(vote_weight), 0) INTO v_this_weight
    FROM election_votes
    WHERE election_id = NEW.id
      AND candidate_id = NEW.winner_candidate_id
      AND vote_choice = 'approve';

    IF COALESCE(v_top_weight, 0) > COALESCE(v_this_weight, 0) THEN
        RAISE EXCEPTION 'الفائز المعلن ليس صاحب أعلى الأصوات';
    END IF;

    NEW.winner_declared_at := COALESCE(NEW.winner_declared_at, now());
    NEW.winner_declared_by := COALESCE(NEW.winner_declared_by, auth.uid());

    RETURN NEW;
END;
$$;

/* ═══ ١٢ : النتائجُ تعدّ التأييد وحده ═════════════════════════════════ */

CREATE OR REPLACE FUNCTION public.get_election_results(p_election UUID)
RETURNS TABLE(candidate_id uuid, candidate_number integer, user_id uuid, full_name text,
              avatar_url text, total_weight numeric, total_votes bigint, is_winner boolean)
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
    LEFT JOIN election_votes v ON v.candidate_id = ec.id AND v.vote_choice = 'approve'
    WHERE ec.election_id = p_election
      AND ec.status = 'approved'
    GROUP BY ec.id, ec.candidate_number, ec.user_id, p.full_name, p.avatar_url
    ORDER BY total_weight DESC, ec.candidate_number;
END;
$$;

/* ═══ ١٣ : تفصيلُ الأصوات يقول الرأي (يُكشف بعد الأرشفة كما كان) ══════ */

DROP FUNCTION IF EXISTS public.get_election_vote_detail(UUID);

CREATE OR REPLACE FUNCTION public.get_election_vote_detail(p_election UUID)
RETURNS TABLE(voter_id uuid, voter_name text, voter_role text, candidate_id uuid,
              candidate_number integer, candidate_name text, vote_weight numeric,
              vote_choice text, voted_at timestamptz)
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
        v.vote_choice,
        v.created_at
    FROM election_votes v
    JOIN election_candidates ec ON ec.id = v.candidate_id
    LEFT JOIN profiles vp ON vp.id = v.voter_id
    LEFT JOIN profiles cp ON cp.id = ec.user_id
    WHERE v.election_id = p_election
    ORDER BY v.created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_election_vote_detail(UUID) TO authenticated, service_role;

/* ═══ ١٤ : بابُ التكليف — إسنادٌ بالبوّابة المحروسة ثمّ إيقافُ المقعد ══ */

CREATE OR REPLACE FUNCTION public.appoint_to_seat(
    p_election UUID,
    p_user     UUID,
    p_reason   TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_e    elections%ROWTYPE;
    v_res  JSONB;
    v_name TEXT;
BEGIN
    IF NOT has_election_admin_permission(auth.uid()) THEN
        RAISE EXCEPTION 'غير مصرح بالتكليف على هذا المقعد';
    END IF;

    IF p_reason IS NULL OR length(trim(p_reason)) < 10 THEN
        RAISE EXCEPTION 'سببُ التكليف مطلوب (١٠ أحرف على الأقلّ)';
    END IF;

    SELECT * INTO v_e FROM elections WHERE id = p_election FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'الانتخاب غير موجود';
    END IF;
    IF v_e.status = 'completed' THEN
        RAISE EXCEPTION 'هذا الانتخاب اكتمل بفائزٍ معلَن';
    END IF;
    IF v_e.status = 'voting_open' THEN
        RAISE EXCEPTION 'لا تُكلِّف والتصويتُ جارٍ؛ أغلِق التصويت أوّلًا';
    END IF;

    SELECT full_name INTO v_name FROM profiles WHERE id = p_user;
    IF v_name IS NULL THEN
        RAISE EXCEPTION 'العضو غير موجود';
    END IF;

    -- الإسنادُ من البوّابة المحروسة نفسها (كإسناد الفائز)، والفاعلُ من auth.uid().
    v_res := assign_position(
        p_actor      => auth.uid(),
        p_user       => p_user,
        p_role_name  => v_e.target_role_name,
        p_committee  => v_e.target_committee_id,
        p_department => v_e.target_department_id,
        p_replace    => true,
        p_notes      => 'تكليف على مقعدٍ تعثّر انتخابُه (' || p_election::text || ') : ' || trim(p_reason)
    );

    IF NOT COALESCE((v_res->>'ok')::boolean, false) THEN
        RAISE EXCEPTION 'تعذّر التكليف: %', COALESCE(v_res->>'message', 'خطأ غير معروف');
    END IF;

    INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
    VALUES (p_election, auth.uid(), 'seat_appointed',
            jsonb_build_object('user_id', p_user, 'reason', trim(p_reason), 'assignment', v_res));

    -- المقعدُ امتلأ فلا معنى لانتخابٍ قائم : يُوقَف بسببٍ مسجّل (والمرشّحون والأصوات تبقى).
    IF v_e.status <> 'cancelled' THEN
        PERFORM public._cancel_election_apply(
            p_election, 'كُلّف شاغلٌ للمقعد : ' || trim(p_reason), 'cancelled');
    END IF;

    PERFORM public._send_election_notification(
        p_election, 'election_voters', 'كُلّف شاغلٌ للمقعد',
        'كُلّف ' || v_name || ' بـ' || public._election_target_label(p_election)
            || ' بعد تعثّر الانتخاب.',
        'info', 'normal', NULL,
        jsonb_build_object('event', 'seat_appointed', 'user_id', p_user));
END;
$$;

GRANT EXECUTE ON FUNCTION public.appoint_to_seat(UUID, UUID, TEXT) TO authenticated, service_role;
