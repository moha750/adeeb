-- =============================================
-- نظام الانتخابات — 10: إصلاح cancel_election
-- إزالة DELETE المباشر من storage.objects (يرفضه Supabase).
-- العميل يحذف الملفات عبر Storage API الذي يحذف الصفوف تلقائياً.
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
    v_paths               TEXT[] := '{}';
    v_status              TEXT;
    v_votes_deleted       INT := 0;
    v_candidates_deleted  INT := 0;
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

    SELECT COALESCE(array_agg(name), '{}')
      INTO v_paths
      FROM storage.objects
     WHERE bucket_id = 'election-files'
       AND name LIKE '%/' || p_election::text || '/%';

    WITH d AS (
        DELETE FROM election_votes
         WHERE election_id = p_election
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_votes_deleted FROM d;

    UPDATE elections
       SET status              = 'cancelled',
           winner_candidate_id = NULL,
           winner_declared_at  = NULL,
           winner_declared_by  = NULL,
           archived_at         = COALESCE(archived_at, now())
     WHERE id = p_election;

    WITH d AS (
        DELETE FROM election_candidates
         WHERE election_id = p_election
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_candidates_deleted FROM d;

    INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
    VALUES (p_election, auth.uid(), 'cancelled',
            jsonb_build_object(
                'reason',             p_reason,
                'votes_deleted',      v_votes_deleted,
                'candidates_deleted', v_candidates_deleted,
                'files_to_delete',    COALESCE(array_length(v_paths, 1), 0)
            ));

    RETURN v_paths;
END;
$$;

GRANT EXECUTE ON FUNCTION cancel_election(UUID, TEXT) TO authenticated;
