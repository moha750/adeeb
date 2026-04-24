-- =============================================
-- نظام الانتخابات — 28: جمهور election_admins + سدّ فجوة إشعار التعديل
-- =============================================
-- المشكلتان:
--  (1) الإشعارات الموجَّهة إلى 'admins' لا تصل لأدمن الانتخابات
--      (club_president / executive_council_president / hr_committee_leader)،
--      لأن فلتر 'admins' في RLS و RPCs يطلب role_name IN ('admin','super_admin').
--  (2) لا إشعار للأدمن عند إعادة تقديم الترشح بعد طلب تعديل.
--
-- الحل:
--  • إضافة جمهور جديد 'election_admins' يستخدم has_election_admin_permission.
--  • تحديث RLS + get_user_notifications + get_unread_notifications_count.
--  • تحويل تريغرات الترشح/الانسحاب لاستخدامه.
--  • إضافة استدعاء إشعار داخل resubmit_candidacy لتغطية حالتَي
--    needs_edit→pending (إعادة تقديم) و pending→pending (تعديل ذاتي).
-- =============================================


-- ════════════════════════════════════════════════════════════════
-- (1) توسيع check constraint
-- ════════════════════════════════════════════════════════════════
ALTER TABLE notifications
    DROP CONSTRAINT IF EXISTS notifications_target_audience_check;

ALTER TABLE notifications
    ADD CONSTRAINT notifications_target_audience_check
    CHECK (target_audience = ANY (ARRAY[
        'all',
        'specific_users',
        'members',
        'committee_leaders',
        'admins',
        'specific_committee',
        'election_voters',
        'election_candidates',
        'election_participants',
        'election_admins'
    ]));


-- ════════════════════════════════════════════════════════════════
-- (2) RLS policy: إضافة فرع election_admins
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
        OR (target_audience = 'election_admins' AND has_election_admin_permission(auth.uid()))
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
-- (3) get_user_notifications: إضافة فرع election_admins
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
            OR (n.target_audience = 'election_admins' AND has_election_admin_permission(p_user_id))
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
-- (4) get_unread_notifications_count: إضافة فرع election_admins
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
            OR (n.target_audience = 'election_admins' AND has_election_admin_permission(p_user_id))
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


-- ════════════════════════════════════════════════════════════════
-- (5) تحديث triggers الترشح: استخدام election_admins
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION notify_candidate_submitted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target TEXT;
BEGIN
    v_target := _election_target_label(NEW.election_id);
    PERFORM _send_election_notification(
        NEW.election_id,
        'election_admins',
        'ترشّح جديد بحاجة للمراجعة',
        'تقدّم مرشح جديد لـ ' || v_target || '. يرجى مراجعة الترشيح من لوحة التحكم.',
        'info',
        'high',
        NULL,
        jsonb_build_object('candidate_id', NEW.id, 'event', 'candidate_submitted')
    );
    RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION notify_candidate_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target TEXT;
    v_title  TEXT;
    v_msg    TEXT;
    v_type   TEXT := 'info';
    v_prio   TEXT := 'normal';
BEGIN
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    v_target := _election_target_label(NEW.election_id);

    -- (9) انسحاب — إشعار لأدمن الانتخابات
    IF NEW.status = 'withdrawn' AND OLD.status <> 'withdrawn' THEN
        PERFORM _send_election_notification(
            NEW.election_id,
            'election_admins',
            'انسحاب مرشح',
            'انسحب مرشح من ترشحه لـ ' || v_target || '.',
            'warning',
            'normal',
            NULL,
            jsonb_build_object('candidate_id', NEW.id, 'event', 'candidate_withdrew')
        );
        RETURN NEW;
    END IF;

    -- (8) مراجعة — إشعار للمرشح نفسه
    IF NEW.status IN ('approved','rejected','needs_edit') AND OLD.status = 'pending' THEN
        IF NEW.status = 'approved' THEN
            v_title := 'تم قبول ترشيحك';
            v_msg   := 'تمت الموافقة على ترشيحك لـ ' || v_target || '. بالتوفيق!';
            v_type  := 'success';
        ELSIF NEW.status = 'rejected' THEN
            v_title := 'تم رفض ترشيحك';
            v_msg   := 'اعتذر عن قبول ترشيحك لـ ' || v_target || '.' ||
                       CASE WHEN NEW.review_note_ar IS NOT NULL
                            THEN ' السبب: ' || NEW.review_note_ar
                            ELSE ''
                       END;
            v_type  := 'error';
        ELSE
            v_title := 'ترشيحك بحاجة للتعديل';
            v_msg   := 'يرجى تعديل ترشيحك لـ ' || v_target || '.' ||
                       CASE WHEN NEW.review_note_ar IS NOT NULL
                            THEN ' ملاحظة المراجع: ' || NEW.review_note_ar
                            ELSE ''
                       END;
            v_type  := 'warning';
            v_prio  := 'high';
        END IF;

        PERFORM _send_election_notification(
            NEW.election_id,
            'specific_users',
            v_title,
            v_msg,
            v_type,
            v_prio,
            ARRAY[NEW.user_id]::UUID[],
            jsonb_build_object('candidate_id', NEW.id, 'event', 'candidate_reviewed',
                               'new_status', NEW.status)
        );
    END IF;

    RETURN NEW;
END;
$$;


-- ════════════════════════════════════════════════════════════════
-- (6) سدّ الفجوة الثالثة: إشعار في resubmit_candidacy
--     (داخل الـ RPC مباشرة لأن الـ trigger يصعب أن يميّز
--      pending→pending عن غيره دون عبور)
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.resubmit_candidacy(
    p_candidate         UUID,
    p_statement_ar      TEXT,
    p_file_url          TEXT DEFAULT NULL,
    p_file_name         TEXT DEFAULT NULL,
    p_file_size_bytes   INTEGER DEFAULT NULL,
    p_file_mime         TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user        UUID;
    v_election    UUID;
    v_status      TEXT;
    v_elec_status TEXT;
    v_event       TEXT;
    v_target      TEXT;
    v_notif_title TEXT;
    v_notif_msg   TEXT;
BEGIN
    SELECT ec.user_id, ec.election_id, ec.status, e.status
      INTO v_user, v_election, v_status, v_elec_status
      FROM election_candidates ec
      JOIN elections e ON e.id = ec.election_id
     WHERE ec.id = p_candidate;

    IF v_user IS NULL THEN
        RAISE EXCEPTION 'الترشح غير موجود';
    END IF;

    IF v_user <> auth.uid() THEN
        RAISE EXCEPTION 'لا يمكن تعديل ترشح مستخدم آخر';
    END IF;

    IF v_status NOT IN ('pending', 'needs_edit') THEN
        RAISE EXCEPTION 'لا يمكن تعديل الترشح في حالته الحالية';
    END IF;

    IF v_elec_status <> 'candidacy_open' THEN
        RAISE EXCEPTION 'لا يمكن التعديل بعد إغلاق باب الترشح';
    END IF;

    UPDATE election_candidates
       SET statement_ar     = p_statement_ar,
           file_url         = p_file_url,
           file_name        = p_file_name,
           file_size_bytes  = p_file_size_bytes,
           file_mime        = p_file_mime,
           status           = 'pending',
           review_note_ar   = NULL,
           reviewed_at      = NULL,
           reviewed_by      = NULL
     WHERE id = p_candidate;

    v_event := CASE
        WHEN v_status = 'needs_edit' THEN 'candidate_resubmitted'
        ELSE 'candidate_updated'
    END;

    INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
    VALUES (v_election, auth.uid(), v_event,
            jsonb_build_object('candidate_id', p_candidate));

    -- إشعار لأدمن الانتخابات بالحدث
    v_target := _election_target_label(v_election);
    IF v_status = 'needs_edit' THEN
        v_notif_title := 'أعاد المرشح تقديم طلبه بعد التعديل';
        v_notif_msg   := 'أعاد المرشح تقديم ترشحه لـ ' || v_target || ' بعد طلب التعديل. الترشح بانتظار المراجعة الثانية.';
    ELSE
        v_notif_title := 'عدّل المرشح طلبه';
        v_notif_msg   := 'قام المرشح بتعديل بيانات ترشحه لـ ' || v_target || '. الترشح بحاجة لمراجعة جديدة.';
    END IF;

    PERFORM _send_election_notification(
        v_election,
        'election_admins',
        v_notif_title,
        v_notif_msg,
        'info',
        'high',
        NULL,
        jsonb_build_object('candidate_id', p_candidate, 'event', v_event)
    );
END;
$$;
