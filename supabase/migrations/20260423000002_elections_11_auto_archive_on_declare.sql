-- =============================================
-- نظام الانتخابات — 11: أرشفة تلقائية عند إعلان الفائز
-- عند إعلان الفائز: ينتقل إلى completed ويُؤرشف فوراً
-- في معاملة واحدة، دون الحاجة لضغط زر الأرشفة.
-- =============================================

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

    UPDATE elections
       SET winner_candidate_id = p_candidate,
           winner_declared_by  = auth.uid(),
           winner_declared_at  = now(),
           status              = 'completed',
           archived_at         = now()
     WHERE id = p_election;

    INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
    VALUES (p_election, auth.uid(), 'declare_winner',
            jsonb_build_object('candidate_id', p_candidate, 'auto_archived', true));

    INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
    VALUES (p_election, auth.uid(), 'archived',
            jsonb_build_object('auto', true, 'trigger', 'declare_winner'));
END;
$$;

-- أرشفة خلفية للانتخابات المكتملة سابقاً (بدون archived_at)
UPDATE elections
   SET archived_at = COALESCE(winner_declared_at, now())
 WHERE status = 'completed'
   AND archived_at IS NULL;
