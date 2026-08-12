-- ═══════════════════════════════════════════════════════════════════════════
-- سلّةُ المقاعد صارت **القسم** لا اللجنة
-- ═══════════════════════════════════════════════════════════════════════════
--
-- العلّة: الحصر كان يقارن `target_committee_id` بين انتخابين، وانتخابُ التنسيق
-- لا لجنةَ له (NULL يفرضه elections_scope_check). فخرج كلُّ ترشّح لجنةٍ «نطاقًا
-- مغايرًا» للتنسيق، فمُنع عضو لجنة الفعاليات من تنسيق قسم التواصل المجتمعي،
-- وهو قسمُ لجنته. المقصود كان استثناءَ المقعد الثاني في اللجنة نفسها، فوقع
-- القسمُ الحاوي ضحيّةً جانبيّة.
--
-- والوحدة الصحيحة هي القسم: مقاعدُ لجنته وتنسيقُ قسمها سلّةٌ واحدة، يجمع منها
-- ما شاء ويسمّي مفضَّله، وما خرج عن قسمه فنطاقٌ آخر. والجمعُ بين لجنتين يبقى
-- مقفولًا بشرط النطاق نفسه (لا يترشّح في لجنةٍ إلّا من له دورٌ نشطٌ فيها).
--
-- وما دام الجمعُ يتّسع، فذيلُه الإعلان: حارسُ الفوز المزدوج يمتدّ إلى القسم،
-- والحسمُ التوأم يصير حسمًا للقسم كلِّه بمقاعده، والإعلانُ المنفرد يُمنع ما دام
-- في القسم مقعدٌ حيٌّ يشارك هذا المقعدَ مرشّحًا.

-- ── قسمُ الانتخاب: مصدرٌ واحدٌ يحلّ NULL اللجنة إلى قسمها ──────────────────
create or replace function public.election_department(p_election uuid)
returns integer
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(e.target_department_id, c.department_id)
  from elections e
  left join committees c on c.id = e.target_committee_id
  where e.id = p_election;
$$;

comment on function public.election_department(uuid) is
  'قسمُ الانتخاب: قسمُه صراحةً (التنسيق) أو قسمُ لجنته (القيادة والنيابة). وحدةُ الحصر والحسم.';


-- ── الأهليّة: الحصر بالقسم لا بمعرّف اللجنة ────────────────────────────────
create or replace function public.is_user_eligible_to_run(p_user uuid, p_election uuid)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
    v_election   elections%ROWTYPE;
    v_dept       integer;
    v_blocks     boolean;
    v_in_scope   boolean;
    v_has_active boolean;
    v_has_prior  boolean;
begin
    select * into v_election from elections where id = p_election;
    if not found or v_election.status <> 'candidacy_open' or v_election.archived_at is not null then
        return false;
    end if;

    -- (أ) لا يترشّح عضو المجلس الإداريّ (رقابةٌ لا تنافس) — يعيد الحظر السباعيّ من
    --     الميتاداتا ويسدّ ثغرة مزدوج الدور. ثمّ لا بدّ من قدرة run_for_election.
    if exists (
        select 1 from user_roles ur join roles r on r.role_name = ur.role_name
        where ur.user_id = p_user and ur.is_active and r.council_type = 'administrative'
    ) then return false; end if;
    if not coalesce(check_user_permission(p_user, 'run_for_election'), false) then return false; end if;

    -- (ب) قيود التعارض البنيويّة + النطاق
    if v_election.target_role_name = 'department_head' then
        select exists (
            select 1 from user_roles ur join roles r on r.role_name = ur.role_name
            where ur.user_id = p_user and ur.is_active and r.role_name = 'department_head'
        ) into v_blocks;
        if v_blocks then return false; end if;

        select exists (
            select 1 from user_roles ur join committees c on c.id = ur.committee_id
            where ur.user_id = p_user and ur.is_active
              and c.department_id = v_election.target_department_id
        ) into v_in_scope;

    elsif v_election.target_role_name = 'committee_leader' then
        select exists (
            select 1 from user_roles ur join roles r on r.role_name = ur.role_name
            join committees c on c.id = v_election.target_committee_id
            where ur.user_id = p_user and ur.is_active
              and r.role_name = 'department_head' and ur.department_id = c.department_id
        ) into v_blocks;
        if v_blocks then return false; end if;

        select exists (
            select 1 from user_roles ur join roles r on r.role_name = ur.role_name
            where ur.user_id = p_user and ur.is_active
              and r.role_name = 'committee_leader' and ur.committee_id = v_election.target_committee_id
        ) into v_blocks;
        if v_blocks then return false; end if;

        select exists (
            select 1 from user_roles ur
            where ur.user_id = p_user and ur.is_active and ur.committee_id = v_election.target_committee_id
        ) into v_in_scope;

    else -- deputy_committee_leader
        select exists (
            select 1 from user_roles ur join roles r on r.role_name = ur.role_name
            join committees c on c.id = v_election.target_committee_id
            where ur.user_id = p_user and ur.is_active
              and r.role_name = 'department_head' and ur.department_id = c.department_id
        ) into v_blocks;
        if v_blocks then return false; end if;

        select exists (
            select 1 from user_roles ur join roles r on r.role_name = ur.role_name
            where ur.user_id = p_user and ur.is_active
              and r.role_name = 'committee_leader' and ur.committee_id = v_election.target_committee_id
        ) into v_blocks;
        if v_blocks then return false; end if;

        select exists (
            select 1 from user_roles ur join roles r on r.role_name = ur.role_name
            where ur.user_id = p_user and ur.is_active
              and r.role_name = 'deputy_committee_leader' and ur.committee_id = v_election.target_committee_id
        ) into v_blocks;
        if v_blocks then return false; end if;

        select exists (
            select 1 from user_roles ur
            where ur.user_id = p_user and ur.is_active and ur.committee_id = v_election.target_committee_id
        ) into v_in_scope;
    end if;

    if not coalesce(v_in_scope, false) then return false; end if;

    -- (ج) لا ترشّح سابق على هذا الانتخاب بعينه.
    select exists (
        select 1 from election_candidates ec
        where ec.election_id = p_election and ec.user_id = p_user
    ) into v_has_prior;
    if v_has_prior then return false; end if;

    -- ولا ترشّح نشطٌ في **قسمٍ آخر**. أمّا داخل القسم الواحد فيُجمع: مقعدا لجنته
    -- وتنسيقُ قسمها، ويسمّي مفضّله فيُحسم به عند الإعلان.
    v_dept := election_department(p_election);
    select exists (
        select 1 from election_candidates ec join elections e on e.id = ec.election_id
        where ec.user_id = p_user and ec.status in ('pending','approved','needs_edit')
          and e.archived_at is null
          and e.status in ('candidacy_open','candidacy_closed','voting_open','voting_closed')
          and e.id <> p_election
          and election_department(e.id) is distinct from v_dept
    ) into v_has_active;

    return not v_has_active;
end;
$function$;


-- ── الأفضليّة: تُسمّى على مستوى القسم ──────────────────────────────────────
-- التوقيع تغيّر من (لجنة، مقعد) إلى (قسم، مقعد)، فيُسقَط القديم ولا يُترك مزدوجًا.
drop function if exists public.set_seat_preference(integer, uuid);

create or replace function public.set_seat_preference(p_department integer, p_preferred_election uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
    update election_candidates ec
    set preference_rank = case when e.id = p_preferred_election then 1 else 2 end
    from elections e
    where e.id = ec.election_id
      and ec.user_id = auth.uid()
      and election_department(e.id) = p_department
      and e.archived_at is null
      and e.status in ('candidacy_open','candidacy_closed','voting_open','voting_closed')
      and ec.status in ('pending','approved','needs_edit');
end;
$function$;

comment on function public.set_seat_preference(integer, uuid) is
  'مفضَّلُ العضو بين مقاعد القسم الواحد: يأخذه إن فاز بأكثر من مقعد، ويذهب الباقي للتالي في الأصوات.';


-- ── حارس الفوز المزدوج: بالقسم لا باللجنة ──────────────────────────────────
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

    -- أ٣: لا يفوز العضو بمقعدين في **القسم نفسه** في الدورة نفسها (تنسيقًا أو قيادةً أو نيابةً).
    --     من فاز بمقعدٍ آخر في هذا القسم (أُعلن بعد فتح ترشّح هذا الانتخاب، أي في الدورة
    --     الحاليّة) يُقصى هنا، ويُعلَن الوصيفُ بدله.
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


-- ── الإعلان: نواةٌ داخليّة + بابٌ محروس ────────────────────────────────────
-- النواة تكتب الفائز وتؤرشف وتُسجّل، ولا حارسَ فيها. يستعملها البابُ المنفرد
-- (بحارسه) وحاسمُ القسم (بترتيبه)، فلا يُكرَّر الجسد في اثنين.
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

-- نواةٌ بلا حارس صلاحيّة: لا تُنادى إلّا من دوالّنا المُصرِّحة.
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


-- ── الحسمُ للقسم: مقاعدُه معًا بترتيبٍ يُنصف الوصيف ────────────────────────
-- خلَفُ resolve_committee_election_winners (مقعدَي لجنةٍ) — والقسمُ يسع التنسيق
-- ومقاعد لجانه، والعددُ مفتوح، فالخوارزميّة صارت حلقةً لا حالتين.
drop function if exists public.resolve_committee_election_winners(integer);

create or replace function public.resolve_department_election_winners(p_department integer)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
DECLARE
    v_seats  uuid[];
    v_order  uuid[] := '{}';
    v_user   uuid;
    v_keep   uuid;
    v_e      uuid;
    v_win    uuid;
    v_shared boolean := false;
    v_out    jsonb := '[]'::jsonb;
BEGIN
    IF NOT has_election_admin_permission(auth.uid()) THEN
        RAISE EXCEPTION 'غير مصرح بإعلان الفائز';
    END IF;

    DROP TABLE IF EXISTS pg_temp._seat_cands;
    CREATE TEMP TABLE _seat_cands ON COMMIT DROP AS
    SELECT ec.election_id,
           ec.id                                   AS cand_id,
           ec.user_id,
           COALESCE(ec.preference_rank, 2)         AS pref,
           ec.candidate_number                     AS num,
           COALESCE((SELECT SUM(ev.vote_weight) FROM election_votes ev WHERE ev.candidate_id = ec.id), 0) AS w,
           CASE e.target_role_name WHEN 'department_head' THEN 1 WHEN 'committee_leader' THEN 2 ELSE 3 END AS seat_rank,
           false                                   AS dropped
    FROM elections e
    JOIN election_candidates ec ON ec.election_id = e.id AND ec.status = 'approved'
    WHERE e.status = 'voting_closed' AND e.archived_at IS NULL AND e.winner_candidate_id IS NULL
      AND election_department(e.id) = p_department;

    SELECT array_agg(DISTINCT election_id) INTO v_seats FROM pg_temp._seat_cands;
    IF v_seats IS NULL THEN
        RAISE EXCEPTION 'لا مقاعدَ جاهزةً للإعلان في هذا القسم (أغلِق التصويت أوّلًا).';
    END IF;

    -- لا يُحسم القسم ومقعدٌ فيه ما زال يخوض ترشّحًا أو تصويتًا لأحد هؤلاء المرشّحين.
    IF EXISTS (
        SELECT 1 FROM elections e
        WHERE e.archived_at IS NULL
          AND e.status IN ('candidacy_open','candidacy_closed','voting_open')
          AND election_department(e.id) = p_department
          AND EXISTS (
              SELECT 1 FROM election_candidates ec
              JOIN pg_temp._seat_cands sc ON sc.user_id = ec.user_id
              WHERE ec.election_id = e.id AND ec.status IN ('pending','approved','needs_edit')
          )
    ) THEN
        RAISE EXCEPTION 'مقعدٌ آخر في القسم لم يُغلق تصويتُه بعد، وفيه أحدُ هؤلاء المرشّحين؛ أغلِقه أوّلًا.';
    END IF;

    -- مَن تصدّر أكثر من مقعد أخذ مفضَّله، وأُقصي من الباقي، فيرتقي التالي.
    -- وقد يتصدّر التالي مقعدًا آخر، فالحلقةُ تعيد الكرّة حتّى لا يبقى مشترك.
    LOOP
        SELECT t.user_id INTO v_user
        FROM (
            SELECT DISTINCT ON (election_id) election_id, user_id
            FROM pg_temp._seat_cands WHERE NOT dropped
            ORDER BY election_id, w DESC, num ASC
        ) t
        GROUP BY t.user_id
        HAVING count(*) > 1
        LIMIT 1;
        EXIT WHEN v_user IS NULL;
        v_shared := true;

        -- مقعدُه المفضّل بين ما تصدّره: أدنى رتبةِ أفضليّة، ثمّ التنسيق فالقيادة فالنيابة.
        SELECT t.election_id INTO v_keep
        FROM (
            SELECT DISTINCT ON (election_id) election_id, user_id, pref, seat_rank
            FROM pg_temp._seat_cands WHERE NOT dropped
            ORDER BY election_id, w DESC, num ASC
        ) t
        WHERE t.user_id = v_user
        ORDER BY t.pref ASC, t.seat_rank ASC
        LIMIT 1;

        UPDATE pg_temp._seat_cands
           SET dropped = true
         WHERE user_id = v_user AND election_id <> v_keep;

        v_order := v_order || v_keep;   -- يُعلن قبل المقاعد التي أُقصي منها
        v_user := NULL;
    END LOOP;

    -- ترتيب الإعلان: المقاعد المحتفَظ بها بترتيب حسمها، ثمّ ما بقي.
    SELECT v_order || COALESCE(array_agg(s), '{}') INTO v_order
    FROM unnest(v_seats) s WHERE NOT (s = ANY(v_order));

    FOREACH v_e IN ARRAY v_order LOOP
        SELECT cand_id INTO v_win FROM pg_temp._seat_cands
        WHERE election_id = v_e AND NOT dropped
        ORDER BY w DESC, num ASC LIMIT 1;
        IF v_win IS NOT NULL THEN
            PERFORM declare_winner_apply(v_e, v_win);
            v_out := v_out || jsonb_build_array(jsonb_build_object('election', v_e, 'winner', v_win));
        END IF;
        v_win := NULL;
    END LOOP;

    RETURN jsonb_build_object('ok', true, 'shared_top', v_shared, 'seats', v_out);
END;
$function$;

comment on function public.resolve_department_election_winners(integer) is
  'حسمُ مقاعد القسم معًا: من تصدّر أكثر من مقعد أخذ مفضَّله وذهب الباقي للتالي في الأصوات.';


-- ── حالُ الحسم لمقعدٍ بعينه: تقولها الواجهة للمشرف ─────────────────────────
-- تُقرأ بمفتاح الخدمة من صفحةٍ محروسةٍ سلفًا بـmanage_elections، فحارسُ auth.uid()
-- فيها يمنع صاحبَ الحقّ نفسه (الخدمةُ بلا هويّة). وما تُرجعه عدادان لا أسماء.
create or replace function public.department_resolution_state(p_election uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
DECLARE
    v_dept     integer;
    v_blocking integer;
    v_pending  integer;
BEGIN
    v_dept := election_department(p_election);

    SELECT count(*) FILTER (WHERE e.status IN ('candidacy_open','candidacy_closed','voting_open')),
           count(*) FILTER (WHERE e.status = 'voting_closed' AND e.winner_candidate_id IS NULL)
      INTO v_blocking, v_pending
    FROM elections e
    WHERE e.id <> p_election
      AND e.archived_at IS NULL
      AND election_department(e.id) = v_dept
      AND EXISTS (
          SELECT 1 FROM election_candidates a
          JOIN election_candidates b ON b.user_id = a.user_id AND b.election_id = e.id
          WHERE a.election_id = p_election AND a.status = 'approved'
            AND b.status IN ('pending','approved','needs_edit')
      );

    RETURN jsonb_build_object('department', v_dept,
                              'blocking', COALESCE(v_blocking, 0),
                              'pending',  COALESCE(v_pending, 0));
END;
$function$;
