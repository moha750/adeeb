-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260810171941   الاسم: resolve_committee_election_winners


-- ب٢: الحسمُ التلقائيّ لمقعدَي اللجنة معًا. إن فاز شخصٌ بالمقعدين أخذ مفضّله (preference_rank
-- الأدنى، وعند التعادل القيادةُ أوثَر) وذهب الآخرُ للوصيف. يُعلَن المقعدُ المُبقي للفائز المشترك
-- أوّلًا كي يُقصى في الآخر فيصحّ إعلانُ الوصيف. آمنٌ للمقعد الواحد وللحالة العاديّة (لا تعارض).
CREATE OR REPLACE FUNCTION public.resolve_committee_election_winners(p_committee integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_lead_id  uuid;
    v_dep_id   uuid;
    candL uuid[]; userL uuid[]; prefL smallint[];
    candD uuid[]; userD uuid[]; prefD smallint[];
    winL uuid; winD uuid;
    same_top boolean := false;
    lead_first boolean := true;
BEGIN
    IF NOT has_election_admin_permission(auth.uid()) THEN
        RAISE EXCEPTION 'غير مصرح بإعلان الفائز';
    END IF;

    SELECT id INTO v_lead_id FROM elections
     WHERE target_committee_id = p_committee AND target_role_name = 'committee_leader'
       AND status = 'voting_closed' AND archived_at IS NULL AND winner_candidate_id IS NULL
     LIMIT 1;
    SELECT id INTO v_dep_id FROM elections
     WHERE target_committee_id = p_committee AND target_role_name = 'deputy_committee_leader'
       AND status = 'voting_closed' AND archived_at IS NULL AND winner_candidate_id IS NULL
     LIMIT 1;

    IF v_lead_id IS NULL AND v_dep_id IS NULL THEN
        RAISE EXCEPTION 'لا مقاعدَ جاهزةً للإعلان في هذه اللجنة (أغلِق التصويت أوّلًا).';
    END IF;

    -- المرشّحون المعتمَدون مرتّبون بالوزن تنازليًّا ثمّ برقم المرشّح (حسمُ التعادل)
    IF v_lead_id IS NOT NULL THEN
        SELECT array_agg(id ORDER BY w DESC, num ASC),
               array_agg(uid ORDER BY w DESC, num ASC),
               array_agg(pr ORDER BY w DESC, num ASC)
        INTO candL, userL, prefL
        FROM (
            SELECT ec.id, ec.user_id uid, ec.preference_rank pr, ec.candidate_number num,
                   COALESCE(SUM(ev.vote_weight), 0) w
            FROM election_candidates ec
            LEFT JOIN election_votes ev ON ev.candidate_id = ec.id
            WHERE ec.election_id = v_lead_id AND ec.status = 'approved'
            GROUP BY ec.id, ec.user_id, ec.preference_rank, ec.candidate_number
        ) s;
    END IF;
    IF v_dep_id IS NOT NULL THEN
        SELECT array_agg(id ORDER BY w DESC, num ASC),
               array_agg(uid ORDER BY w DESC, num ASC),
               array_agg(pr ORDER BY w DESC, num ASC)
        INTO candD, userD, prefD
        FROM (
            SELECT ec.id, ec.user_id uid, ec.preference_rank pr, ec.candidate_number num,
                   COALESCE(SUM(ev.vote_weight), 0) w
            FROM election_candidates ec
            LEFT JOIN election_votes ev ON ev.candidate_id = ec.id
            WHERE ec.election_id = v_dep_id AND ec.status = 'approved'
            GROUP BY ec.id, ec.user_id, ec.preference_rank, ec.candidate_number
        ) s;
    END IF;

    -- الفائزُ الافتراضيّ لكلّ مقعد: أعلى مرشّحيه
    winL := CASE WHEN array_length(candL, 1) >= 1 THEN candL[1] ELSE NULL END;
    winD := CASE WHEN array_length(candD, 1) >= 1 THEN candD[1] ELSE NULL END;

    -- تعارُض: الأعلى نفسه في المقعدين
    IF array_length(candL, 1) >= 1 AND array_length(candD, 1) >= 1 AND userL[1] = userD[1] THEN
        same_top := true;
        -- يأخذ مفضّله (الأدنى رتبةً؛ التعادل للقيادة)، والآخرُ للوصيف
        lead_first := (COALESCE(prefL[1], 1) <= COALESCE(prefD[1], 1));
        IF lead_first THEN
            winL := candL[1];
            winD := CASE WHEN array_length(candD, 1) >= 2 THEN candD[2] ELSE NULL END;
        ELSE
            winD := candD[1];
            winL := CASE WHEN array_length(candL, 1) >= 2 THEN candL[2] ELSE NULL END;
        END IF;
    END IF;

    -- الإعلان: مقعدُ الفائز المشترك أوّلًا (كي يُقصى في الآخر فيصحّ الوصيف)
    IF same_top AND NOT lead_first THEN
        IF winD IS NOT NULL THEN PERFORM declare_winner(v_dep_id, winD); END IF;
        IF winL IS NOT NULL THEN PERFORM declare_winner(v_lead_id, winL); END IF;
    ELSE
        IF winL IS NOT NULL THEN PERFORM declare_winner(v_lead_id, winL); END IF;
        IF winD IS NOT NULL THEN PERFORM declare_winner(v_dep_id, winD); END IF;
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'shared_top', same_top,
        'leader', jsonb_build_object('election', v_lead_id, 'winner', winL),
        'deputy', jsonb_build_object('election', v_dep_id, 'winner', winD)
    );
END;
$function$

