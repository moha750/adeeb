-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260810200610   الاسم: elections_department_winner_guard

create or replace function public.enforce_winner_declaration()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
    v_cand        election_candidates%ROWTYPE;
    v_dept        integer;
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

    v_dept := COALESCE(NEW.target_department_id,
                       (SELECT c.department_id FROM committees c WHERE c.id = NEW.target_committee_id));

    -- أ٣: لا يفوز العضو بمقعدين في القسم نفسه في الدورة نفسها (تنسيقًا أو قيادةً أو نيابةً).
    IF EXISTS (
        SELECT 1 FROM elections e2
        JOIN election_candidates ec2 ON ec2.id = e2.winner_candidate_id
        WHERE e2.id <> NEW.id
          AND election_department(e2.id) = v_dept
          AND e2.status = 'completed'
          AND e2.winner_declared_at >= NEW.candidacy_opened_at
          AND ec2.user_id = v_cand.user_id
    ) THEN
        RAISE EXCEPTION 'هذا العضو فائزٌ بمقعدٍ آخر في هذا القسم؛ أعلِن الوصيفَ لهذا المقعد.';
    END IF;

    -- أعلى وزنٍ بين المرشّحين غير المُقصَين (فبهذا يصحّ إعلانُ الوصيف حين يأخذ الأعلى المقعد الآخر).
    SELECT COALESCE(SUM(ev.vote_weight), 0) INTO v_top_weight
    FROM election_votes ev
    WHERE ev.election_id = NEW.id
      AND NOT EXISTS (
            SELECT 1 FROM elections e2
            JOIN election_candidates ec2 ON ec2.id = e2.winner_candidate_id
            JOIN election_candidates ecx ON ecx.id = ev.candidate_id
            WHERE e2.id <> NEW.id
              AND election_department(e2.id) = v_dept
              AND e2.status = 'completed'
              AND e2.winner_declared_at >= NEW.candidacy_opened_at
              AND ec2.user_id = ecx.user_id
      )
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
$function$;

create or replace function public.declare_winner_apply(p_election uuid, p_candidate uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
    v_election elections%ROWTYPE;
BEGIN
    SELECT * INTO v_election FROM elections WHERE id = p_election FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'الانتخاب غير موجود';
    END IF;

    IF v_election.archived_at IS NOT NULL THEN
        RAISE EXCEPTION 'الانتخاب مؤرشف';
    END IF;

    IF v_election.status NOT IN ('voting_closed') THEN
        RAISE EXCEPTION 'يجب أن يكون التصويت مغلقاً قبل إعلان الفائز';
    END IF;

    IF v_election.winner_candidate_id IS NOT NULL THEN
        RAISE EXCEPTION 'الفائز معلن مسبقاً';
    END IF;

    UPDATE elections
       SET winner_candidate_id = p_candidate,
           winner_declared_by  = auth.uid(),
           winner_declared_at  = now(),
           status              = 'completed',
           archived_at         = now()
     WHERE id = p_election;

    INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
    VALUES (p_election, auth.uid(), 'declare_winner',
            jsonb_build_object('candidate_id', p_candidate, 'auto_archived', true));

    INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
    VALUES (p_election, auth.uid(), 'archived',
            jsonb_build_object('auto', true, 'trigger', 'declare_winner'));
END;
$function$;

revoke all on function public.declare_winner_apply(uuid, uuid) from public;
revoke all on function public.declare_winner_apply(uuid, uuid) from anon, authenticated;

create or replace function public.declare_winner(p_election uuid, p_candidate uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
    v_dept integer;
BEGIN
    IF NOT has_election_admin_permission(auth.uid()) THEN
        RAISE EXCEPTION 'غير مصرح بإعلان الفائز';
    END IF;

    -- لا يُعلن مقعدٌ منفردًا ما دام في قسمه مقعدٌ حيٌّ يشاركه مرشّحًا: فقد يفوز
    -- بالاثنين، والمفضَّلُ لا يُعرف إلّا بحسم القسم معًا.
    v_dept := election_department(p_election);
    IF EXISTS (
        SELECT 1
        FROM election_candidates a
        JOIN election_candidates b ON b.user_id = a.user_id AND b.election_id <> a.election_id
                                  AND b.status IN ('pending','approved','needs_edit')
        JOIN elections e2 ON e2.id = b.election_id
        WHERE a.election_id = p_election AND a.status = 'approved'
          AND e2.archived_at IS NULL
          AND e2.status IN ('candidacy_open','candidacy_closed','voting_open','voting_closed')
          AND election_department(e2.id) = v_dept
    ) THEN
        RAISE EXCEPTION 'في هذا القسم مقعدٌ آخر يخوضه أحدُ مرشّحيك؛ أعلِن مقاعد القسم معًا.';
    END IF;

    PERFORM declare_winner_apply(p_election, p_candidate);
END;
$function$;
