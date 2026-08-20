-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260814180445   الاسم: election_log_records_what_changed

-- **السجلُّ يقول ما الذي جرى، لا أنّ شيئًا جرى** (طلب المالك ٢٠٢٦-٠٨-١٤):
-- كان التعديلُ يُكتب حدثًا أصمّ (`candidate_updated` بمعرّف المرشّح وحده)، فتقول الشاشةُ
-- «عُدّل الترشّح» ولا تعرف أبيانًا عدّل أم رفع ملفًّا أم حذفه. والواجهةُ لا تخترع ما لا
-- تعرفه، فالمعرفةُ تُسجَّل عند وقوعها: هنا، في الدالّة التي تُجري التعديل وتملك القديم والجديد.
--
-- ولا عمودَ جديد ولا جدول: الحمولةُ jsonb تتّسع لِما يُوصَف. والصفوفُ القديمة تبقى بلا هذه
-- المفاتيح، والواجهةُ تردّ فيها إلى الجملة العامّة — تاريخٌ لا يُزوَّر بأثرٍ رجعيّ.

/* ── التقديم: أمعه ملفٌّ أم بيانٌ وحده؟ ─────────────────────────────────── */
CREATE OR REPLACE FUNCTION public.submit_candidacy(p_election uuid, p_statement_ar text, p_file_url text DEFAULT NULL::text, p_file_name text DEFAULT NULL::text, p_file_size_bytes integer DEFAULT NULL::integer, p_file_mime text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO election_candidates
        (election_id, user_id, candidate_number,
         statement_ar, file_url, file_name, file_size_bytes, file_mime)
    VALUES
        (p_election, auth.uid(), 0,
         p_statement_ar, p_file_url, p_file_name, p_file_size_bytes, p_file_mime)
    RETURNING id INTO v_id;

    INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
    VALUES (p_election, auth.uid(), 'candidacy_submitted',
            jsonb_build_object(
                'candidate_id', v_id,
                'has_file',     (p_file_url IS NOT NULL)
            ));

    RETURN v_id;
END;
$function$;

/* ── التعديل: أبيانٌ أم ملفّ؟ ورفعًا أم حذفًا أم استبدالًا؟ ─────────────── */
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
    v_old_stmt    TEXT;
    v_old_file    TEXT;
    v_file_change TEXT;
BEGIN
    SELECT ec.user_id, ec.election_id, ec.status, ec.statement_ar, ec.file_url, e.status
      INTO v_user, v_election, v_status, v_old_stmt, v_old_file, v_elec_status
      FROM election_candidates ec
      JOIN elections e ON e.id = ec.election_id
     WHERE ec.id = p_candidate;

    IF v_user IS NULL THEN
        RAISE EXCEPTION 'الترشح غير موجود';
    END IF;

    IF v_user <> auth.uid() THEN
        RAISE EXCEPTION 'لا يمكن تعديل ترشح مستخدم آخر';
    END IF;

    -- المعتمَد لا يُعدَّل؛ يُعدَّل ما كان قيد المراجعة أو يحتاج تعديلًا فقط
    IF v_status NOT IN ('pending', 'needs_edit') THEN
        RAISE EXCEPTION 'لا يمكن تعديل الترشح في حالته الحالية';
    END IF;

    IF v_elec_status <> 'candidacy_open' THEN
        RAISE EXCEPTION 'لا يمكن التعديل بعد إغلاق باب الترشّح';
    END IF;

    -- ما جرى على الملفّ: رفعٌ لأوّل مرّة · حذفٌ · استبدالٌ · لا شيء
    v_file_change := CASE
        WHEN v_old_file IS NULL     AND p_file_url IS NOT NULL THEN 'added'
        WHEN v_old_file IS NOT NULL AND p_file_url IS NULL     THEN 'removed'
        WHEN v_old_file IS DISTINCT FROM p_file_url            THEN 'replaced'
        ELSE 'none'
    END;

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
            jsonb_build_object(
                'candidate_id',      p_candidate,
                'statement_changed', (v_old_stmt IS DISTINCT FROM p_statement_ar),
                'file_change',       v_file_change
            ));
END;
$function$;
