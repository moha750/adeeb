-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260810200641   الاسم: elections_department_resolver

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

        v_order := v_order || v_keep;
        v_user := NULL;
    END LOOP;

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
    IF NOT has_election_admin_permission(auth.uid()) THEN
        RAISE EXCEPTION 'غير مصرح';
    END IF;

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
