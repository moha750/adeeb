-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260423204620   الاسم: elections_18_fix_admins_audience

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
                WHERE ur.user_id = p_user_id AND r.role_level >= 7
            ))
            OR (n.target_audience = 'admins' AND EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = p_user_id AND r.role_level >= 9 AND ur.is_active
            ))
            OR (n.target_audience = 'specific_committee' AND EXISTS (
                SELECT 1 FROM user_roles
                WHERE user_id = p_user_id AND committee_id = n.target_committee_id
            ))
            OR (n.target_audience = 'election_voters' AND n.target_election_id IS NOT NULL AND EXISTS (
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
            ))
            OR (n.target_audience = 'election_candidates' AND n.target_election_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM election_candidates ec
                WHERE ec.election_id = n.target_election_id
                  AND ec.user_id = p_user_id
                  AND ec.status IN ('pending','approved','needs_edit')
            ))
            OR (n.target_audience = 'election_participants' AND n.target_election_id IS NOT NULL AND (
                EXISTS (
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
                WHERE ur.user_id = p_user_id AND r.role_level >= 7
            ))
            OR (n.target_audience = 'admins' AND EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = p_user_id AND r.role_level >= 9 AND ur.is_active
            ))
            OR (n.target_audience = 'specific_committee' AND EXISTS (
                SELECT 1 FROM user_roles
                WHERE user_id = p_user_id AND committee_id = n.target_committee_id
            ))
            OR (n.target_audience = 'election_voters' AND n.target_election_id IS NOT NULL AND EXISTS (
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
            ))
            OR (n.target_audience = 'election_candidates' AND n.target_election_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM election_candidates ec
                WHERE ec.election_id = n.target_election_id
                  AND ec.user_id = p_user_id
                  AND ec.status IN ('pending','approved','needs_edit')
            ))
            OR (n.target_audience = 'election_participants' AND n.target_election_id IS NOT NULL AND (
                EXISTS (
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
