-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260507225919   الاسم: transition_election_optional_voting_end

CREATE OR REPLACE FUNCTION public.transition_election(p_election uuid, p_new_status text, p_voting_end timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_current_status TEXT;
    v_approved       INTEGER;
BEGIN
    IF NOT has_election_admin_permission(auth.uid()) THEN
        RAISE EXCEPTION 'غير مصرح بتغيير حالة الانتخاب';
    END IF;

    SELECT status INTO v_current_status FROM elections WHERE id = p_election;
    IF v_current_status IS NULL THEN
        RAISE EXCEPTION 'الانتخاب غير موجود';
    END IF;

    IF p_new_status = 'candidacy_closed' AND v_current_status = 'candidacy_open' THEN
        v_approved := public._count_approved_candidates(p_election);
        IF v_approved < 2 THEN
            RAISE EXCEPTION
                'لا يمكن إغلاق الترشح بأقل من مرشحَين مقبولَين (الحالي: %). استخدم الإغلاق الاستثنائي إن كان لابدّ من ذلك.',
                v_approved
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    IF p_new_status = 'voting_open' THEN
        IF p_voting_end IS NOT NULL AND p_voting_end <= now() THEN
            RAISE EXCEPTION 'نهاية التصويت يجب أن تكون في المستقبل';
        END IF;
        UPDATE elections
           SET status = p_new_status,
               voting_end = p_voting_end
         WHERE id = p_election;
    ELSE
        UPDATE elections SET status = p_new_status WHERE id = p_election;
    END IF;

    INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
    VALUES (p_election, auth.uid(), 'status_transition',
            jsonb_build_object('new_status', p_new_status,
                               'voting_end', p_voting_end));
END;
$function$;
