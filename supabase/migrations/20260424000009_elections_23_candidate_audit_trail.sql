-- =============================================
-- نظام الانتخابات — 23: RPC سجل أحداث ترشح المستخدم
-- =============================================
-- الغرض:
--   عرض "مسار طلبك" في تبويب "ملفي الانتخابي" — تاريخ كرونولوجي
--   لأحداث ترشح المستخدم (تقديم، طلب تعديل، قبول، رفض، انسحاب).
--
-- RLS على election_audit_log تسمح فقط للأدمن/viewer بالقراءة المباشرة.
-- هذا الـ RPC يعمل SECURITY DEFINER ويُرجع فقط أحداث المرشح المحدد
-- إن كان المتصل هو صاحب الترشح أو أدمن.
-- =============================================

CREATE OR REPLACE FUNCTION public.get_candidate_audit_trail(p_candidate UUID)
RETURNS TABLE (
    event_type  TEXT,
    payload     JSONB,
    actor_name  TEXT,
    created_at  TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user      UUID;
    v_election  UUID;
BEGIN
    SELECT user_id, election_id INTO v_user, v_election
    FROM election_candidates
    WHERE id = p_candidate;

    IF v_user IS NULL THEN
        RETURN;
    END IF;

    -- الصلاحية: المرشّح نفسه أو أدمن
    IF auth.uid() <> v_user AND NOT has_election_admin_permission(auth.uid()) THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        l.event_type,
        l.payload,
        p.full_name AS actor_name,
        l.created_at
    FROM election_audit_log l
    LEFT JOIN profiles p ON p.id = l.actor_id
    WHERE l.election_id = v_election
      AND l.event_type IN ('candidacy_submitted', 'candidate_reviewed', 'candidate_withdrawn')
      AND (l.payload ->> 'candidate_id')::UUID = p_candidate
    ORDER BY l.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_candidate_audit_trail(UUID) TO authenticated;
