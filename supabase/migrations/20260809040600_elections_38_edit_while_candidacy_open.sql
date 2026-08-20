-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260809040600   الاسم: elections_38_edit_while_candidacy_open

-- توسيع حقّ التعديل: يعدّل المرشّح ترشّحه (بيانًا وملفًّا) ما دام باب الترشّح مفتوحًا
-- (candidacy_open) أيًّا كانت حالته (قيد المراجعة/معتمَد/يحتاج تعديلًا)، لا عند «طُلب تعديل»
-- وحده. ويسقط الحقّ فور إغلاق الترشّح. وتعديلُ المعتمَد يُعيده «قيد المراجعة» (سلوكٌ قائم).

CREATE OR REPLACE FUNCTION public.get_user_candidacies(p_user uuid DEFAULT NULL::uuid)
 RETURNS TABLE(candidate_id uuid, election_id uuid, election_status text, election_archived_at timestamp with time zone, target_role_name text, target_committee_ar text, target_department_ar text, candidate_number integer, candidate_status text, statement_ar text, file_url text, file_name text, review_note_ar text, reviewed_at timestamp with time zone, submitted_at timestamp with time zone, candidacy_end timestamp with time zone, can_withdraw boolean, can_edit boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user UUID := COALESCE(p_user, auth.uid());
BEGIN
    RETURN QUERY
    SELECT
        ec.id,
        e.id,
        e.status,
        e.archived_at,
        e.target_role_name,
        c.committee_name_ar,
        d.name_ar,
        ec.candidate_number,
        ec.status,
        ec.statement_ar,
        ec.file_url,
        ec.file_name,
        ec.review_note_ar,
        ec.reviewed_at,
        ec.submitted_at,
        e.candidacy_end,
        (ec.status IN ('pending','approved','needs_edit')
          AND e.status IN ('candidacy_open','candidacy_closed')
          AND e.archived_at IS NULL) AS can_withdraw,
        -- التعديل متاحٌ ما دام باب الترشّح مفتوحًا، أيًّا كانت حالة المرشّح غيرَ المنتهية
        (ec.status IN ('pending','approved','needs_edit')
          AND e.status = 'candidacy_open'
          AND e.archived_at IS NULL) AS can_edit
    FROM election_candidates ec
    JOIN elections e ON e.id = ec.election_id
    LEFT JOIN committees  c ON c.id = e.target_committee_id
    LEFT JOIN departments d ON d.id = e.target_department_id
    WHERE ec.user_id = v_user
    ORDER BY ec.submitted_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.resubmit_candidacy(p_candidate uuid, p_statement_ar text, p_file_url text DEFAULT NULL::text, p_file_name text DEFAULT NULL::text, p_file_size_bytes integer DEFAULT NULL::integer, p_file_mime text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user        UUID;
    v_election    UUID;
    v_status      TEXT;
    v_elec_status TEXT;
    v_event       TEXT;
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

    -- يُعدَّل ما لم ينتهِ (قيد المراجعة/معتمَد/يحتاج تعديلًا)؛ المرفوض والمنسحب لا يُعدَّلان
    IF v_status NOT IN ('pending', 'approved', 'needs_edit') THEN
        RAISE EXCEPTION 'لا يمكن تعديل الترشح في حالته الحالية';
    END IF;

    -- التعديل ما دام باب الترشّح مفتوحًا فقط؛ يسقط فور إغلاقه أو بدء التصويت
    IF v_elec_status <> 'candidacy_open' THEN
        RAISE EXCEPTION 'لا يمكن التعديل بعد إغلاق باب الترشّح';
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
END;
$function$;
