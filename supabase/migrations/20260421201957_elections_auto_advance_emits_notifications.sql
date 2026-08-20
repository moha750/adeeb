-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260421201957   الاسم: elections_auto_advance_emits_notifications

CREATE OR REPLACE FUNCTION public.auto_advance_elections_by_deadline()
RETURNS TABLE(candidacy_closed_count INT, voting_closed_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_candidacy_closed INT := 0;
    v_voting_closed    INT := 0;
    r RECORD;
    v_role_label   TEXT;
    v_unit_label   TEXT;
    v_name         TEXT;
    v_audience     TEXT;
    v_committee_id INT;
BEGIN
    FOR r IN
        WITH updated AS (
            UPDATE elections e
            SET status = 'candidacy_closed',
                updated_at = now()
            WHERE e.status = 'candidacy_open'
              AND e.candidacy_end IS NOT NULL
              AND e.candidacy_end <= now()
            RETURNING id, target_role_id, target_committee_id, target_department_id
        )
        SELECT u.id,
               u.target_committee_id,
               r0.role_name_ar,
               r0.role_name,
               c0.committee_name_ar,
               d0.name_ar AS department_name_ar
        FROM updated u
        LEFT JOIN roles r0       ON r0.id = u.target_role_id
        LEFT JOIN committees c0  ON c0.id = u.target_committee_id
        LEFT JOIN departments d0 ON d0.id = u.target_department_id
    LOOP
        v_candidacy_closed := v_candidacy_closed + 1;

        v_role_label := COALESCE(r.role_name_ar, r.role_name, 'منصب');
        v_unit_label := COALESCE(r.committee_name_ar, r.department_name_ar, '');
        v_name := CASE WHEN v_unit_label <> '' THEN v_role_label || ' — ' || v_unit_label ELSE v_role_label END;

        IF r.target_committee_id IS NOT NULL THEN
            v_audience     := 'specific_committee';
            v_committee_id := r.target_committee_id;
        ELSE
            v_audience     := 'all';
            v_committee_id := NULL;
        END IF;

        INSERT INTO notifications (
            title, message, type, priority, icon,
            action_url, action_label,
            target_audience, target_committee_id,
            is_push_enabled, metadata
        ) VALUES (
            'أُغلق باب الترشّح: ' || v_name,
            'تم إغلاق باب الترشّح لمنصب ' || v_name || ' تلقائياً عند انتهاء الموعد. سيُعلن بدء التصويت قريباً بعد مراجعة المرشحين.',
            'info',
            'normal',
            'fa-door-closed',
            '/admin/dashboard.html#elections-section',
            NULL,
            v_audience,
            v_committee_id,
            TRUE,
            jsonb_build_object(
                'event', 'candidacy_closed',
                'election_id', r.id,
                'source', 'auto_advance'
            )
        );
    END LOOP;

    FOR r IN
        WITH updated AS (
            UPDATE elections e
            SET status = 'voting_closed',
                updated_at = now()
            WHERE e.status = 'voting_open'
              AND e.voting_end IS NOT NULL
              AND e.voting_end <= now()
            RETURNING id, target_role_id, target_committee_id, target_department_id
        )
        SELECT u.id,
               u.target_committee_id,
               r0.role_name_ar,
               r0.role_name,
               c0.committee_name_ar,
               d0.name_ar AS department_name_ar
        FROM updated u
        LEFT JOIN roles r0       ON r0.id = u.target_role_id
        LEFT JOIN committees c0  ON c0.id = u.target_committee_id
        LEFT JOIN departments d0 ON d0.id = u.target_department_id
    LOOP
        v_voting_closed := v_voting_closed + 1;

        v_role_label := COALESCE(r.role_name_ar, r.role_name, 'منصب');
        v_unit_label := COALESCE(r.committee_name_ar, r.department_name_ar, '');
        v_name := CASE WHEN v_unit_label <> '' THEN v_role_label || ' — ' || v_unit_label ELSE v_role_label END;

        IF r.target_committee_id IS NOT NULL THEN
            v_audience     := 'specific_committee';
            v_committee_id := r.target_committee_id;
        ELSE
            v_audience     := 'all';
            v_committee_id := NULL;
        END IF;

        INSERT INTO notifications (
            title, message, type, priority, icon,
            action_url, action_label,
            target_audience, target_committee_id,
            is_push_enabled, metadata
        ) VALUES (
            'أُغلق التصويت: ' || v_name,
            'تم إغلاق التصويت لمنصب ' || v_name || ' تلقائياً عند انتهاء الموعد. ستُعلن النتائج قريباً.',
            'info',
            'normal',
            'fa-square-check',
            '/admin/dashboard.html#elections-section',
            NULL,
            v_audience,
            v_committee_id,
            TRUE,
            jsonb_build_object(
                'event', 'voting_closed',
                'election_id', r.id,
                'source', 'auto_advance'
            )
        );
    END LOOP;

    candidacy_closed_count := v_candidacy_closed;
    voting_closed_count    := v_voting_closed;
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_advance_elections_by_deadline() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auto_advance_elections_by_deadline() TO authenticated;
