-- =============================================
-- نظام الانتخابات — 12: نظام الإشعارات
-- ============================================
-- يضيف:
--   • عمود target_election_id على notifications
--   • أنواع جمهور جديدة: election_voters, election_candidates, election_participants
--   • تحديث RLS + get_user_notifications RPC لاستيعاب الأنواع الجديدة
--   • SQL helper: _send_election_notification(...) لاستدعاء من Triggers
--   • Triggers للأحداث 7/8/9 (submit/review/withdraw)
--   • تعديل sweep_election_deadlines لإرسال إشعار الإغلاق التلقائي (الحدث 10)
-- =============================================

-- ════════════════════════════════════════════════════════════════
-- (1) إضافة العمود
-- ════════════════════════════════════════════════════════════════
ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS target_election_id UUID REFERENCES elections(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notifications_target_election
    ON notifications (target_election_id)
    WHERE target_election_id IS NOT NULL;


-- ════════════════════════════════════════════════════════════════
-- (2) RLS: تحديث سياسة القراءة لإضافة الأنواع الجديدة
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
        -- ─── الأنواع الجديدة الخاصة بالانتخابات ───
        OR (target_audience = 'election_voters' AND target_election_id IS NOT NULL AND EXISTS (
            SELECT 1
            FROM elections e
            LEFT JOIN committees c ON c.id = e.target_committee_id
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
        ))
        OR (target_audience = 'election_candidates' AND target_election_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM election_candidates ec
            WHERE ec.election_id = notifications.target_election_id
              AND ec.user_id = auth.uid()
              AND ec.status IN ('pending','approved','needs_edit')
        ))
        OR (target_audience = 'election_participants' AND target_election_id IS NOT NULL AND (
            EXISTS (
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
-- (3) get_user_notifications: نفس منطق RLS
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
            -- ─── الأنواع الجديدة ───
            OR (n.target_audience = 'election_voters' AND n.target_election_id IS NOT NULL AND EXISTS (
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


-- ════════════════════════════════════════════════════════════════
-- (4) SQL helper: _send_election_notification
--     تدرج إشعاراً بصلاحيات SECURITY DEFINER (لتجاوز RLS على INSERT)
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public._send_election_notification(
    p_election_id UUID,
    p_audience    TEXT,
    p_title       TEXT,
    p_message     TEXT,
    p_type        TEXT DEFAULT 'info',
    p_priority    TEXT DEFAULT 'normal',
    p_user_ids    UUID[] DEFAULT NULL,
    p_metadata    JSONB DEFAULT '{}'::jsonb
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id INTEGER;
BEGIN
    INSERT INTO notifications (
        title, message, type, priority, icon,
        target_audience, target_election_id, target_user_ids,
        sender_id, is_push_enabled, metadata
    )
    VALUES (
        p_title, p_message, p_type, p_priority, 'fa-poll-h',
        p_audience, p_election_id, p_user_ids,
        auth.uid(), false, p_metadata
    )
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public._send_election_notification(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID[], JSONB) TO authenticated;


-- ════════════════════════════════════════════════════════════════
-- (5) Helper: نصّ وصف الهدف (role_ar — committee/department_ar)
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public._election_target_label(p_election_id UUID)
RETURNS TEXT
LANGUAGE plpgsql STABLE
SET search_path = public
AS $$
DECLARE
    v_role_ar TEXT;
    v_scope   TEXT;
BEGIN
    SELECT
        CASE e.target_role_name
            WHEN 'department_head'          THEN 'رئيس قسم'
            WHEN 'committee_leader'         THEN 'قائد لجنة'
            WHEN 'deputy_committee_leader'  THEN 'نائب قائد لجنة'
            ELSE e.target_role_name
        END,
        COALESCE(c.committee_name_ar, d.name_ar, '—')
      INTO v_role_ar, v_scope
      FROM elections e
      LEFT JOIN committees  c ON c.id = e.target_committee_id
      LEFT JOIN departments d ON d.id = e.target_department_id
     WHERE e.id = p_election_id;

    RETURN COALESCE(v_role_ar || ' — ' || v_scope, '—');
END;
$$;


-- ════════════════════════════════════════════════════════════════
-- (6) Triggers للأحداث 7/8/9
-- ════════════════════════════════════════════════════════════════

-- (7) ترشّح جديد: INSERT على election_candidates
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
        'admins',
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

DROP TRIGGER IF EXISTS trg_notify_candidate_submitted ON election_candidates;
CREATE TRIGGER trg_notify_candidate_submitted
    AFTER INSERT ON election_candidates
    FOR EACH ROW EXECUTE FUNCTION notify_candidate_submitted();


-- (8) مراجعة مرشح: UPDATE على election_candidates (status → approved/rejected/needs_edit)
-- (9) انسحاب مرشح: UPDATE على election_candidates (status → withdrawn)
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

    -- (9) انسحاب — نخبر الأدمن
    IF NEW.status = 'withdrawn' AND OLD.status <> 'withdrawn' THEN
        PERFORM _send_election_notification(
            NEW.election_id,
            'admins',
            'انسحاب مرشح',
            'انسحب مرشح من ترشحه لـ ' || v_target || '.',
            'warning',
            'normal',
            NULL,
            jsonb_build_object('candidate_id', NEW.id, 'event', 'candidate_withdrew')
        );
        RETURN NEW;
    END IF;

    -- (8) مراجعة — نخبر المرشح نفسه
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

DROP TRIGGER IF EXISTS trg_notify_candidate_status_change ON election_candidates;
CREATE TRIGGER trg_notify_candidate_status_change
    AFTER UPDATE OF status ON election_candidates
    FOR EACH ROW EXECUTE FUNCTION notify_candidate_status_change();


-- ════════════════════════════════════════════════════════════════
-- (7) تعديل sweep_election_deadlines لإرسال إشعار (الحدث 10)
-- ════════════════════════════════════════════════════════════════
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
    -- إغلاق تلقائي لباب الترشح + إشعار لكل انتخاب مُغلق
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
            'info',
            'normal',
            NULL,
            jsonb_build_object('event', 'candidacy_auto_closed')
        );
    END LOOP;

    -- إغلاق تلقائي للتصويت
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
