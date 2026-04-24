-- =============================================
-- نظام الانتخابات — 22: احتساب الترشحات المنسحبة/المرفوضة في has_submission
-- =============================================
-- المشكلة:
--   count_user_election_tabs.has_submission كان يحسب فقط الحالات النشطة
--   (pending/approved/needs_edit)، فيختفي تبويب "ملفي الانتخابي" فور
--   الانسحاب — يفقد العضو كل وصول لسجل ترشحه.
--
-- الحلّ:
--   نُضيف 'withdrawn' و 'rejected' إلى المجموعة، بشرط أن الانتخاب
--   لا يزال غير مؤرشف. بعد أرشفة الانتخاب يختفي التبويب طبيعياً.
-- =============================================

CREATE OR REPLACE FUNCTION public.count_user_election_tabs(p_user UUID DEFAULT NULL)
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
    SELECT COUNT(*) INTO v_can_run
    FROM elections e
    WHERE e.status = 'candidacy_open'
      AND e.archived_at IS NULL
      AND is_user_eligible_to_run(v_user, e.id);

    -- الترشحات التي تخصّ المستخدم في انتخابات غير مؤرشفة،
    -- شاملةً الانسحاب والرفض ليبقى "ملفي الانتخابي" ظاهراً للمتابعة.
    SELECT COUNT(*) INTO v_has_sub
    FROM election_candidates ec
    JOIN elections e ON e.id = ec.election_id
    WHERE ec.user_id = v_user
      AND ec.status IN ('pending','approved','needs_edit','withdrawn','rejected')
      AND e.archived_at IS NULL
      AND e.status IN ('candidacy_open','candidacy_closed','voting_open','voting_closed','completed');

    SELECT COUNT(*) INTO v_can_vote
    FROM elections e
    WHERE e.status = 'voting_open'
      AND e.archived_at IS NULL
      AND is_user_eligible_to_vote(v_user, e.id)
      AND NOT EXISTS (
          SELECT 1 FROM election_votes v
          WHERE v.election_id = e.id AND v.voter_id = v_user
      );

    SELECT COUNT(*) INTO v_can_view
    FROM elections e
    WHERE e.archived_at IS NULL
      AND e.status IN ('candidacy_open','candidacy_closed','voting_open','voting_closed','completed')
      AND has_election_view_permission(v_user, e.id);

    RETURN QUERY SELECT v_can_run, v_has_sub, v_can_vote, v_can_view;
END;
$$;
