-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260814135927   الاسم: restore_candidacy_message_accuracy

-- الرسالةُ تصف الحدَّ كما هو: الرجعةُ في طور الترشّح، فالملغى والمكتمل لا «بعد فتح التصويت» وحدَه.
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

    IF NEW.status = 'withdrawn' AND OLD.status IN ('pending','approved','needs_edit') THEN
        IF v_election_status IN ('candidacy_open','candidacy_closed') THEN
            v_ok := true;
        ELSE
            RAISE EXCEPTION 'لا يمكن الانسحاب بعد فتح التصويت';
        END IF;

    ELSIF OLD.status = 'withdrawn' AND NEW.status = 'pending' THEN
        IF NOT has_election_admin_permission(auth.uid()) THEN
            RAISE EXCEPTION 'إرجاع مرشح منسحب بيد مشرف الانتخابات وحده';
        END IF;
        IF v_election_status NOT IN ('candidacy_open','candidacy_closed') THEN
            RAISE EXCEPTION 'لا يُرجع مرشح إلا وباب الترشح قائم';
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
