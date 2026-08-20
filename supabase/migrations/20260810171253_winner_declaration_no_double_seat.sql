-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260810171253   الاسم: winner_declaration_no_double_seat


-- أ٣: يمنع فوزَ العضو بمقعدين في اللجنة نفسها في الدورة نفسها، ويجعل «الأعلى صوتًا» يُحسب
--     بين غير المُقصَين (المُقصى: من أخذ المقعد الآخر)، فيصحّ إعلانُ الوصيف لهذا المقعد.
CREATE OR REPLACE FUNCTION public.enforce_winner_declaration()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_cand        election_candidates%ROWTYPE;
    v_top_weight  NUMERIC;
    v_this_weight NUMERIC;
BEGIN
    IF NEW.winner_candidate_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF OLD.winner_candidate_id IS NOT DISTINCT FROM NEW.winner_candidate_id THEN
        RETURN NEW;
    END IF;

    IF OLD.winner_candidate_id IS NOT NULL AND NEW.status <> 'cancelled' THEN
        RAISE EXCEPTION 'لا يمكن تغيير الفائز بعد إعلانه';
    END IF;

    SELECT * INTO v_cand FROM election_candidates WHERE id = NEW.winner_candidate_id;
    IF NOT FOUND OR v_cand.election_id <> NEW.id OR v_cand.status <> 'approved' THEN
        RAISE EXCEPTION 'الفائز المقترح ليس مرشحاً معتمداً في هذا الانتخاب';
    END IF;

    IF NEW.status NOT IN ('voting_closed','completed') THEN
        RAISE EXCEPTION 'لا يمكن إعلان الفائز إلا بعد إغلاق التصويت';
    END IF;

    -- أ٣: لا يفوز العضو بمقعدين في اللجنة نفسها في الدورة نفسها. من فاز بمقعدٍ آخر في هذه اللجنة
    --     (أُعلن بعد فتح ترشّح هذا الانتخاب، أي في الدورة الحاليّة) يُقصى هنا، ويُعلَن الوصيفُ بدله.
    IF NEW.target_committee_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM elections e2
        JOIN election_candidates ec2 ON ec2.id = e2.winner_candidate_id
        WHERE e2.id <> NEW.id
          AND e2.target_committee_id = NEW.target_committee_id
          AND e2.status = 'completed'
          AND e2.winner_declared_at >= NEW.candidacy_opened_at
          AND ec2.user_id = v_cand.user_id
    ) THEN
        RAISE EXCEPTION 'هذا العضو فائزٌ بمقعدٍ آخر في هذه اللجنة؛ أعلِن الوصيفَ لهذا المقعد.';
    END IF;

    -- أعلى وزنٍ بين المرشّحين غير المُقصَين (فبهذا يصحّ إعلانُ الوصيف حين يأخذ الأعلى المقعد الآخر).
    SELECT COALESCE(SUM(ev.vote_weight), 0) INTO v_top_weight
    FROM election_votes ev
    WHERE ev.election_id = NEW.id
      AND (NEW.target_committee_id IS NULL OR NOT EXISTS (
            SELECT 1 FROM elections e2
            JOIN election_candidates ec2 ON ec2.id = e2.winner_candidate_id
            JOIN election_candidates ecx ON ecx.id = ev.candidate_id
            WHERE e2.id <> NEW.id
              AND e2.target_committee_id = NEW.target_committee_id
              AND e2.status = 'completed'
              AND e2.winner_declared_at >= NEW.candidacy_opened_at
              AND ec2.user_id = ecx.user_id
      ))
    GROUP BY ev.candidate_id
    ORDER BY COALESCE(SUM(ev.vote_weight), 0) DESC
    LIMIT 1;

    SELECT COALESCE(SUM(vote_weight), 0) INTO v_this_weight
    FROM election_votes
    WHERE election_id = NEW.id AND candidate_id = NEW.winner_candidate_id;

    IF COALESCE(v_top_weight, 0) > COALESCE(v_this_weight, 0) THEN
        RAISE EXCEPTION 'الفائز المعلن ليس صاحب أعلى الأصوات';
    END IF;

    NEW.winner_declared_at := COALESCE(NEW.winner_declared_at, now());
    NEW.winner_declared_by := COALESCE(NEW.winner_declared_by, auth.uid());

    RETURN NEW;
END;
$function$

