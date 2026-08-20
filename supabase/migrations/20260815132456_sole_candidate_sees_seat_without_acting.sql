-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260815132456   الاسم: sole_candidate_sees_seat_without_acting

-- ══ المرشّحُ الوحيد يرى مقعدَه ولا يفعل فيه (قرار المالك ٢٠٢٦-٠٨-١٥) ══════════════
-- كان قد أُسقط من الأهليّة رأسًا فاختفى المقعدُ من بابه. والآن: يبقى في بابه ويُفتح له
-- **اطّلاعًا** (بيانُه وملفُّه وموعدُ الإغلاق)، ويسقط عنه الفعلُ وحدَه. والمنعُ محروسٌ في
-- القاعدة بحارسِ «لا تصوّت لنفسك» (وهو وحدُه المرشّحُ في المقعد)، فلا سطرَ جديدَ يُخترع له.

/* ── مصدرٌ واحدٌ للحال: أهو مرشّحُ هذا المقعد الوحيد؟ ───────────────────────── */
CREATE OR REPLACE FUNCTION public.is_sole_candidate(p_user uuid, p_election uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT public._count_approved_candidates(p_election) = 1
       AND EXISTS (
           SELECT 1 FROM election_candidates ec
           WHERE ec.election_id = p_election
             AND ec.status = 'approved'
             AND ec.user_id = p_user
       );
$function$;

GRANT EXECUTE ON FUNCTION public.is_sole_candidate(uuid, uuid) TO anon, authenticated, service_role;

/* ── الأهليّة تعود كما كانت: النطاقُ وحدَه يحكمها ─────────────────────────── */
CREATE OR REPLACE FUNCTION public.is_user_eligible_to_vote(p_user uuid, p_election uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_election elections%ROWTYPE;
    v_in_scope boolean;
begin
    select * into v_election from elections where id = p_election;
    if not found then return false; end if;

    -- **والأهليّةُ رؤيةٌ قبل أن تكون فعلًا**: المرشّحُ الوحيد يبقى مؤهَّلًا فيرى مقعدَه
    -- وبيانَه وملفَّه، ويردّه عن الصندوق حارسُ «لا تصوّت لنفسك» لا حجبُ الباب.
    if is_top_admin_role(p_user) then return true; end if;

    if v_election.target_role_name = 'department_head' then
        select exists (
            select 1 from user_roles ur
            join committees c on c.id = ur.committee_id
            where ur.user_id = p_user and ur.is_active
              and c.department_id = v_election.target_department_id
        ) into v_in_scope;
    else
        select exists (
            select 1 from user_roles ur
            where ur.user_id = p_user and ur.is_active
              and ur.committee_id = v_election.target_committee_id
        ) into v_in_scope;
    end if;

    return coalesce(v_in_scope, false);
end;
$function$;

/* ── قائمةُ باب التصويت تقول لمن لا فعلَ له: اطّلاعٌ فقط ──────────────────── */
DROP FUNCTION IF EXISTS public.get_votable_elections_for_user(uuid);

CREATE FUNCTION public.get_votable_elections_for_user(p_user uuid DEFAULT NULL::uuid)
 RETURNS TABLE(election_id uuid, target_role_name text, target_committee_id integer, target_committee_ar text, target_department_id integer, target_department_ar text, voting_end timestamp with time zone, has_voted boolean, view_only boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user UUID := COALESCE(p_user, auth.uid());
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.target_role_name,
        e.target_committee_id,
        c.committee_name_ar,
        e.target_department_id,
        d.name_ar,
        e.voting_end,
        EXISTS (
            SELECT 1 FROM election_votes v
            WHERE v.election_id = e.id AND v.voter_id = v_user
        ) AS has_voted,
        -- مرشّحُ المقعد الوحيد: يُفتح له اطّلاعًا ولا صندوقَ له
        is_sole_candidate(v_user, e.id) AS view_only
    FROM elections e
    LEFT JOIN committees  c ON c.id = e.target_committee_id
    LEFT JOIN departments d ON d.id = e.target_department_id
    WHERE e.status = 'voting_open'
      AND e.archived_at IS NULL
      AND is_user_eligible_to_vote(v_user, e.id) = true
    ORDER BY e.voting_end NULLS LAST, e.created_at DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_votable_elections_for_user(uuid) TO anon, authenticated, service_role;

/* ── وعدّادُ الشارة يعدّ الأفعالَ لا المشاهد ──────────────────────────────── */
CREATE OR REPLACE FUNCTION public.count_user_election_tabs(p_user uuid DEFAULT NULL::uuid)
 RETURNS TABLE(can_run integer, has_submission integer, can_vote integer, can_view integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user UUID := COALESCE(p_user, auth.uid());
    v_can_run   INTEGER := 0;
    v_has_sub   INTEGER := 0;
    v_can_vote  INTEGER := 0;
    v_can_view  INTEGER := 0;
BEGIN
    SELECT COUNT(*) INTO v_can_run
    FROM elections e
    WHERE e.status = 'candidacy_open'
      AND e.archived_at IS NULL
      AND is_user_eligible_to_run(v_user, e.id);

    SELECT COUNT(*) INTO v_has_sub
    FROM election_candidates ec
    JOIN elections e ON e.id = ec.election_id
    WHERE ec.user_id = v_user
      AND ec.status IN ('pending','approved','needs_edit','withdrawn','rejected')
      AND e.archived_at IS NULL
      AND e.status IN ('candidacy_open','candidacy_closed','voting_open','voting_closed','completed');

    SELECT COUNT(*) INTO v_can_vote
    FROM elections e
    WHERE e.status = 'voting_open'
      AND e.archived_at IS NULL
      AND is_user_eligible_to_vote(v_user, e.id)
      -- الشارةُ عددُ ما ينتظر فعلَك، ومقعدُ ترشُّحك الوحيدِ اطّلاعٌ لا فعل
      AND NOT is_sole_candidate(v_user, e.id)
      AND NOT EXISTS (
          SELECT 1 FROM election_votes v
          WHERE v.election_id = e.id AND v.voter_id = v_user
      );

    SELECT COUNT(*) INTO v_can_view
    FROM elections e
    WHERE e.archived_at IS NULL
      AND e.status IN ('candidacy_open','candidacy_closed','voting_open','voting_closed','completed')
      AND has_election_view_permission(v_user, e.id);

    RETURN QUERY SELECT v_can_run, v_has_sub, v_can_vote, v_can_view;
END;
$function$;
