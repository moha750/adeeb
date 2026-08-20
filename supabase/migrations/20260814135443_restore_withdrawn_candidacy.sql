-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260814135443   الاسم: restore_withdrawn_candidacy

-- ══════════════════════════════════════════════════════════════════
-- تراجعُ المشرف عن انسحاب المرشّح (قرار المالك ٢٠٢٦-٠٨-١٤)
--
-- كان «منسحب» حالةً نهائيّةً في قانون الانتقال، فمن سحب ترشّحه خطأً أُغلق بابُه إلى
-- الدورة القادمة. والرجعةُ تُشرَّع في القانون نفسِه لا في دالّةٍ تلتفّ حوله: منسحبٌ ← قيد
-- المراجعة، بيد مشرف الانتخابات وحده، وفي طور الترشّح وحدَه. ويعود إلى الصفّ لا إلى
-- الصندوق: الاعتمادُ قرارٌ يُتّخذ من جديد ويُوقَّع.
--
-- وفي الطريق سُدّت ثغرةٌ: كان السحبُ من «قيد المراجعة» أو «يحتاج تعديلًا» مسموحًا في
-- أيّ طور (الفحصُ كان على المعتمَد وحده)، فالزرُّ يخفيه والنداءُ المباشر ينجح أثناء
-- التصويت. صار شرطُ الطور على كلّ انسحاب.
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.enforce_candidate_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_election_status TEXT;
    v_ok              BOOLEAN := false;
BEGIN
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    SELECT status INTO v_election_status FROM elections WHERE id = NEW.election_id;

    -- الانسحاب: من حالةٍ حيّةٍ وفي طور الترشّح وحده (الصندوقُ إذا فُتح لا يُنقص أهله)
    IF NEW.status = 'withdrawn' AND OLD.status IN ('pending','approved','needs_edit') THEN
        IF v_election_status IN ('candidacy_open','candidacy_closed') THEN
            v_ok := true;
        ELSE
            RAISE EXCEPTION 'لا يمكن الانسحاب بعد فتح التصويت';
        END IF;

    -- الرجعة: منسحبٌ يعود إلى الصفّ، بيد مشرفٍ وفي طور الترشّح
    ELSIF OLD.status = 'withdrawn' AND NEW.status = 'pending' THEN
        IF NOT has_election_admin_permission(auth.uid()) THEN
            RAISE EXCEPTION 'إرجاع مرشح منسحب بيد مشرف الانتخابات وحده';
        END IF;
        IF v_election_status NOT IN ('candidacy_open','candidacy_closed') THEN
            RAISE EXCEPTION 'لا يُرجع مرشح بعد فتح التصويت';
        END IF;
        v_ok := true;
        NEW.withdrawn_at := NULL;

    ELSIF OLD.status = 'pending' AND NEW.status IN ('approved','rejected','needs_edit') THEN
        v_ok := true;

    ELSIF OLD.status = 'needs_edit' AND NEW.status = 'pending' THEN
        v_ok := true;

    ELSIF OLD.status = 'rejected' OR OLD.status = 'withdrawn' THEN
        RAISE EXCEPTION 'هذه الحالة نهائية: %', OLD.status;
    END IF;

    IF NOT v_ok THEN
        RAISE EXCEPTION 'انتقال مرشح غير مسموح: % → %', OLD.status, NEW.status;
    END IF;

    IF NEW.status IN ('rejected','needs_edit') THEN
        IF NEW.review_note_ar IS NULL OR btrim(NEW.review_note_ar) = '' THEN
            RAISE EXCEPTION 'يجب كتابة سبب الرفض أو التعديل';
        END IF;
        NEW.reviewed_by := COALESCE(NEW.reviewed_by, auth.uid());
        NEW.reviewed_at := COALESCE(NEW.reviewed_at, now());
    END IF;

    IF NEW.status = 'approved' THEN
        NEW.reviewed_by := COALESCE(NEW.reviewed_by, auth.uid());
        NEW.reviewed_at := COALESCE(NEW.reviewed_at, now());
    END IF;

    IF NEW.status = 'withdrawn' THEN
        NEW.withdrawn_at := COALESCE(NEW.withdrawn_at, now());
    END IF;

    RETURN NEW;
END;
$function$;


-- إرجاعُ المرشّح المنسحب — بابٌ واحدٌ للفعل، والقانونُ فوقه يحرسه في كلّ حال.
CREATE OR REPLACE FUNCTION public.restore_candidacy(p_candidate uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_election UUID;
    v_status   TEXT;
BEGIN
    IF NOT has_election_admin_permission(auth.uid()) THEN
        RAISE EXCEPTION 'غير مصرح بإرجاع المرشحين';
    END IF;

    SELECT election_id, status INTO v_election, v_status
    FROM election_candidates WHERE id = p_candidate;

    IF v_election IS NULL THEN
        RAISE EXCEPTION 'الترشح غير موجود';
    END IF;

    IF v_status <> 'withdrawn' THEN
        RAISE EXCEPTION 'هذا الترشح ليس منسحبا';
    END IF;

    -- إلى «قيد المراجعة» لا إلى ما كان عليه (اختيار المالك): يعود إلى الصفّ لا إلى الصندوق.
    -- وملاحظةُ المراجعة السابقة تبقى كما هي — تاريخٌ يُقرأ لا يُمحى.
    UPDATE election_candidates
    SET status = 'pending'
    WHERE id = p_candidate;

    INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
    VALUES (v_election, auth.uid(), 'candidate_restored',
            jsonb_build_object('candidate_id', p_candidate, 'new_status', 'pending'));
END;
$function$;

GRANT EXECUTE ON FUNCTION public.restore_candidacy(uuid) TO authenticated;


-- ولا يُعاد ترشُّحُ أحدٍ من ورائه: الرجعةُ تُبلَّغ لصاحبها كما يُبلَّغ القبولُ والرفض.
CREATE OR REPLACE FUNCTION public.notify_candidate_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

    IF OLD.status = 'withdrawn' AND NEW.status = 'pending' THEN
        PERFORM _send_election_notification(
            NEW.election_id,
            'specific_users',
            'أعيد ترشيحك',
            'أعاد مشرف الانتخابات ترشيحك لـ ' || v_target || ' بعد انسحابك، وهو الآن قيد المراجعة.',
            'info',
            'high',
            ARRAY[NEW.user_id]::UUID[],
            jsonb_build_object('candidate_id', NEW.id, 'event', 'candidate_restored')
        );
        RETURN NEW;
    END IF;

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
$function$;
