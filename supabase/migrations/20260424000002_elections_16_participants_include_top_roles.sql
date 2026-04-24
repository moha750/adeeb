-- =============================================
-- نظام الانتخابات — 16: توسيع جمهور election_participants ليشمل أدوار الإدارة العليا
-- =============================================
-- الخلفية:
--   بعد توسيع election_voters (الهجرة 15)، ينطبق نفس المبرّر على
--   election_participants: بما أن الإدارة العليا ناخبون في كل الانتخابات،
--   فهم مشاركون (بمعنى participant) بالبديهة، ويجب أن تصلهم إشعارات:
--   فُتح التصويت، إعلان الفائز، وما شابه.
--
--   يُعاد تعريف الأماكن الثلاثة (سياسة RLS + الدالتان) بإضافة
--   is_top_admin_role كبديل قبول إضافي.
-- =============================================


-- ════════════════════════════════════════════════════════════════
-- (1) RLS policy: توسيع election_participants
-- ════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;

CREATE POLICY "Users can view their notifications"
    ON notifications FOR SELECT
    USING (
        target_audience = 'all'
        OR (target_audience = 'specific_users' AND auth.uid() = ANY(target_user_ids))
        OR (target_audience = 'members' AND EXISTS (
            SELECT 1 FROM member_details WHERE user_id = auth.uid()
        ))
        OR (target_audience = 'committee_leaders' AND EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = auth.uid() AND r.role_level >= 7
        ))
        OR (target_audience = 'admins' AND EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = auth.uid() AND r.role_level >= 9
        ))
        OR (target_audience = 'specific_committee' AND EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
              AND user_roles.committee_id = notifications.target_committee_id
        ))
        OR (target_audience = 'election_voters' AND target_election_id IS NOT NULL AND (
            public.is_top_admin_role(auth.uid())
            OR EXISTS (
                SELECT 1
                FROM elections e
                WHERE e.id = notifications.target_election_id
                  AND (
                    (e.target_committee_id IS NOT NULL AND EXISTS (
                        SELECT 1 FROM user_roles ur
                        WHERE ur.user_id = auth.uid()
                          AND ur.committee_id = e.target_committee_id
                          AND ur.is_active
                    ))
                    OR
                    (e.target_department_id IS NOT NULL AND EXISTS (
                        SELECT 1 FROM user_roles ur
                        JOIN committees c2 ON c2.id = ur.committee_id
                        WHERE ur.user_id = auth.uid()
                          AND c2.department_id = e.target_department_id
                          AND ur.is_active
                    ))
                  )
            )
        ))
        OR (target_audience = 'election_candidates' AND target_election_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM election_candidates ec
            WHERE ec.election_id = notifications.target_election_id
              AND ec.user_id = auth.uid()
              AND ec.status IN ('pending','approved','needs_edit')
        ))
        OR (target_audience = 'election_participants' AND target_election_id IS NOT NULL AND (
            public.is_top_admin_role(auth.uid())
            OR EXISTS (
                SELECT 1 FROM election_candidates ec
                WHERE ec.election_id = notifications.target_election_id
                  AND ec.user_id = auth.uid()
                  AND ec.status IN ('pending','approved','needs_edit','withdrawn','rejected')
            )
            OR EXISTS (
                SELECT 1
                FROM elections e
                WHERE e.id = notifications.target_election_id
                  AND (
                    (e.target_committee_id IS NOT NULL AND EXISTS (
                        SELECT 1 FROM user_roles ur
                        WHERE ur.user_id = auth.uid()
                          AND ur.committee_id = e.target_committee_id
                          AND ur.is_active
                    ))
                    OR
                    (e.target_department_id IS NOT NULL AND EXISTS (
                        SELECT 1 FROM user_roles ur
                        JOIN committees c2 ON c2.id = ur.committee_id
                        WHERE ur.user_id = auth.uid()
                          AND c2.department_id = e.target_department_id
                          AND ur.is_active
                    ))
                  )
            )
        ))
    );


-- ════════════════════════════════════════════════════════════════
-- (2) get_user_notifications
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_user_notifications(p_user_id uuid, p_limit integer DEFAULT 50)
RETURNS TABLE(id integer, title text, message text, type text, priority text, icon text,
              action_url text, action_label text, created_at timestamptz, is_read boolean)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.id, n.title, n.message, n.type, n.priority, n.icon,
        n.action_url, n.action_label, n.created_at,
        (nr.id IS NOT NULL) AS is_read
    FROM notifications n
    LEFT JOIN notification_reads nr
           ON nr.notification_id = n.id AND nr.user_id = p_user_id
    WHERE
        (n.expires_at IS NULL OR n.expires_at > NOW())
        AND (
            n.target_audience = 'all'
            OR (n.target_audience = 'specific_users' AND p_user_id = ANY(n.target_user_ids))
            OR (n.target_audience = 'members' AND EXISTS (
                SELECT 1 FROM member_details WHERE user_id = p_user_id
            ))
            OR (n.target_audience = 'committee_leaders' AND EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = p_user_id AND r.role_name = 'committee_leader'
            ))
            OR (n.target_audience = 'admins' AND EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = p_user_id AND r.role_name IN ('admin','super_admin')
            ))
            OR (n.target_audience = 'specific_committee' AND EXISTS (
                SELECT 1 FROM user_roles
                WHERE user_id = p_user_id AND committee_id = n.target_committee_id
            ))
            OR (n.target_audience = 'election_voters' AND n.target_election_id IS NOT NULL AND (
                public.is_top_admin_role(p_user_id)
                OR EXISTS (
                    SELECT 1
                    FROM elections e
                    WHERE e.id = n.target_election_id
                      AND (
                        (e.target_committee_id IS NOT NULL AND EXISTS (
                            SELECT 1 FROM user_roles ur
                            WHERE ur.user_id = p_user_id
                              AND ur.committee_id = e.target_committee_id
                              AND ur.is_active
                        ))
                        OR
                        (e.target_department_id IS NOT NULL AND EXISTS (
                            SELECT 1 FROM user_roles ur
                            JOIN committees c2 ON c2.id = ur.committee_id
                            WHERE ur.user_id = p_user_id
                              AND c2.department_id = e.target_department_id
                              AND ur.is_active
                        ))
                      )
                )
            ))
            OR (n.target_audience = 'election_candidates' AND n.target_election_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM election_candidates ec
                WHERE ec.election_id = n.target_election_id
                  AND ec.user_id = p_user_id
                  AND ec.status IN ('pending','approved','needs_edit')
            ))
            OR (n.target_audience = 'election_participants' AND n.target_election_id IS NOT NULL AND (
                public.is_top_admin_role(p_user_id)
                OR EXISTS (
                    SELECT 1 FROM election_candidates ec
                    WHERE ec.election_id = n.target_election_id
                      AND ec.user_id = p_user_id
                      AND ec.status IN ('pending','approved','needs_edit','withdrawn','rejected')
                )
                OR EXISTS (
                    SELECT 1 FROM elections e
                    WHERE e.id = n.target_election_id
                      AND (
                        (e.target_committee_id IS NOT NULL AND EXISTS (
                            SELECT 1 FROM user_roles ur
                            WHERE ur.user_id = p_user_id
                              AND ur.committee_id = e.target_committee_id
                              AND ur.is_active
                        ))
                        OR
                        (e.target_department_id IS NOT NULL AND EXISTS (
                            SELECT 1 FROM user_roles ur
                            JOIN committees c2 ON c2.id = ur.committee_id
                            WHERE ur.user_id = p_user_id
                              AND c2.department_id = e.target_department_id
                              AND ur.is_active
                        ))
                      )
                )
            ))
        )
    ORDER BY n.created_at DESC
    LIMIT p_limit;
END;
$$;


-- ════════════════════════════════════════════════════════════════
-- (3) get_unread_notifications_count
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_unread_notifications_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    unread_count INT;
BEGIN
    SELECT COUNT(*)::INT INTO unread_count
    FROM notifications n
    LEFT JOIN notification_reads nr
           ON nr.notification_id = n.id AND nr.user_id = p_user_id
    WHERE
        nr.id IS NULL
        AND (n.expires_at IS NULL OR n.expires_at > NOW())
        AND (
            n.target_audience = 'all'
            OR (n.target_audience = 'specific_users' AND p_user_id = ANY(n.target_user_ids))
            OR (n.target_audience = 'members' AND EXISTS (
                SELECT 1 FROM member_details WHERE user_id = p_user_id
            ))
            OR (n.target_audience = 'committee_leaders' AND EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = p_user_id AND r.role_name = 'committee_leader'
            ))
            OR (n.target_audience = 'admins' AND EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = p_user_id AND r.role_name IN ('admin','super_admin')
            ))
            OR (n.target_audience = 'specific_committee' AND EXISTS (
                SELECT 1 FROM user_roles
                WHERE user_id = p_user_id AND committee_id = n.target_committee_id
            ))
            OR (n.target_audience = 'election_voters' AND n.target_election_id IS NOT NULL AND (
                public.is_top_admin_role(p_user_id)
                OR EXISTS (
                    SELECT 1 FROM elections e
                    WHERE e.id = n.target_election_id
                      AND (
                        (e.target_committee_id IS NOT NULL AND EXISTS (
                            SELECT 1 FROM user_roles ur
                            WHERE ur.user_id = p_user_id
                              AND ur.committee_id = e.target_committee_id
                              AND ur.is_active
                        ))
                        OR
                        (e.target_department_id IS NOT NULL AND EXISTS (
                            SELECT 1 FROM user_roles ur
                            JOIN committees c2 ON c2.id = ur.committee_id
                            WHERE ur.user_id = p_user_id
                              AND c2.department_id = e.target_department_id
                              AND ur.is_active
                        ))
                      )
                )
            ))
            OR (n.target_audience = 'election_candidates' AND n.target_election_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM election_candidates ec
                WHERE ec.election_id = n.target_election_id
                  AND ec.user_id = p_user_id
                  AND ec.status IN ('pending','approved','needs_edit')
            ))
            OR (n.target_audience = 'election_participants' AND n.target_election_id IS NOT NULL AND (
                public.is_top_admin_role(p_user_id)
                OR EXISTS (
                    SELECT 1 FROM election_candidates ec
                    WHERE ec.election_id = n.target_election_id
                      AND ec.user_id = p_user_id
                      AND ec.status IN ('pending','approved','needs_edit','withdrawn','rejected')
                )
                OR EXISTS (
                    SELECT 1 FROM elections e
                    WHERE e.id = n.target_election_id
                      AND (
                        (e.target_committee_id IS NOT NULL AND EXISTS (
                            SELECT 1 FROM user_roles ur
                            WHERE ur.user_id = p_user_id
                              AND ur.committee_id = e.target_committee_id
                              AND ur.is_active
                        ))
                        OR
                        (e.target_department_id IS NOT NULL AND EXISTS (
                            SELECT 1 FROM user_roles ur
                            JOIN committees c2 ON c2.id = ur.committee_id
                            WHERE ur.user_id = p_user_id
                              AND c2.department_id = e.target_department_id
                              AND ur.is_active
                        ))
                      )
                )
            ))
        );

    RETURN unread_count;
END;
$$;
