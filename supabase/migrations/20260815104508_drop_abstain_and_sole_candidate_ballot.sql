-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260815104508   الاسم: drop_abstain_and_sole_candidate_ballot

-- ══ نزعُ الامتناع، وإسقاطُ البطاقة عن المرشّح الوحيد ══════════════════════════════
-- قرار المالك (٢٠٢٦-٠٨-١٥): الامتناعُ لا فائدةَ فيه فيُنزع، ويبقى المرشّحُ في التنافس
-- ناخبًا (يختار منافسًا أو لا يدخل). وأمّا المرشّحُ الوحيد فلا بطاقةَ له في مقعده أصلًا:
-- لا يُسأل أن يزكّي نفسَه ولا أن يعترض عليها، ولم يبقَ امتناعٌ يُغلق به ورقتَه.
--
-- والمفرداتُ في `election_votes` تبقى ثلاثيّةً ما بقي صفٌّ ممتنعٌ واحدٌ من قبل؛ فإذا مُحي
-- بإذن المالك ضاقت القيودُ إلى تأييدٍ واعتراض.

/* ── الأهليّة: المرشّحُ الوحيد ليس ناخبًا في مقعده ───────────────────────────────── */
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

    -- **المرشّحُ الوحيد لا صوتَ له في مقعده**: صفةُ المرشّح أخصُّ من صفة الناخب، فيسبق هذا
    -- البندُ حتّى الإداريَّ الأعلى. وهو التزكيةُ بعينها (`_count_approved_candidates = 1`)،
    -- ومن كان أحدَ متنافسين فأكثرَ يبقى ناخبًا كما كان (له أن يختار سواه).
    if public._count_approved_candidates(p_election) = 1
       and exists (
           select 1 from election_candidates ec
           where ec.election_id = p_election
             and ec.status = 'approved'
             and ec.user_id = p_user
       )
    then
        return false;
    end if;

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

/* ── الفعل: بطاقةٌ بلا مرشّحٍ لا تُقبَل ───────────────────────────────────────── */
CREATE OR REPLACE FUNCTION public.cast_vote(p_election uuid, p_candidate uuid, p_choice text DEFAULT 'approve'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_id     UUID;
    v_choice TEXT := COALESCE(NULLIF(TRIM(p_choice), ''), 'approve');
BEGIN
    -- رأيان لا ثالثَ لهما: تأييدُ مرشّحٍ، واعتراضٌ على تزكية. والامتناعُ نُزع.
    IF v_choice NOT IN ('approve', 'reject') THEN
        RAISE EXCEPTION 'رأيٌ غير معروف في بطاقة الاقتراع';
    END IF;

    IF v_choice = 'reject' AND NOT public.is_confidence_election(p_election) THEN
        RAISE EXCEPTION 'الاعتراض لا يكون إلّا في تزكية مرشّحٍ وحيد';
    END IF;

    IF p_candidate IS NULL THEN
        RAISE EXCEPTION 'لا مرشّحَ في بطاقتك';
    END IF;

    IF EXISTS (SELECT 1 FROM election_votes v
               WHERE v.election_id = p_election AND v.voter_id = auth.uid()) THEN
        RAISE EXCEPTION 'بطاقتُك في هذا المقعد مختومةٌ، ولا يُعاد الصوت';
    END IF;

    INSERT INTO election_votes
        (election_id, voter_id, candidate_id, vote_weight, voter_role_snapshot, vote_choice)
    VALUES
        (p_election, auth.uid(), p_candidate, 1.0, 'placeholder', v_choice)
    RETURNING id INTO v_id;

    -- السجلُّ يقول «صوّت» ولا يقول «بماذا»: الحدثُ باسم صاحبه، فلو حمل الرأيَ لكشفه.
    INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
    VALUES (p_election, auth.uid(), 'vote_cast',
            jsonb_build_object('vote_id', v_id));

    RETURN v_id;
END;
$function$;

/* ── الحارس: لا بطاقةَ بلا مرشّح، والأهليّةُ تُسأل كما كانت ──────────────────────── */
CREATE OR REPLACE FUNCTION public.enforce_vote_eligibility()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_election   elections%ROWTYPE;
    v_cand       election_candidates%ROWTYPE;
    v_eligible   BOOLEAN;
BEGIN
    SELECT * INTO v_election FROM elections WHERE id = NEW.election_id;

    IF NOT FOUND OR v_election.archived_at IS NOT NULL THEN
        RAISE EXCEPTION 'انتخاب غير موجود أو مؤرشف';
    END IF;

    IF v_election.status <> 'voting_open' THEN
        RAISE EXCEPTION 'التصويت غير مفتوح';
    END IF;

    IF NEW.voter_id <> auth.uid() THEN
        RAISE EXCEPTION 'لا يمكن التصويت نيابة عن مستخدم آخر';
    END IF;

    -- كلُّ بطاقةٍ تقع على مرشّح؛ لا ورقةَ فارغةً تُختم بعد نزع الامتناع.
    IF NEW.candidate_id IS NULL THEN
        RAISE EXCEPTION 'لا مرشّحَ في بطاقتك';
    END IF;

    SELECT * INTO v_cand FROM election_candidates WHERE id = NEW.candidate_id;
    IF NOT FOUND OR v_cand.election_id <> NEW.election_id OR v_cand.status <> 'approved' THEN
        RAISE EXCEPTION 'المرشح غير صالح في هذا الانتخاب';
    END IF;

    IF v_cand.user_id = NEW.voter_id THEN
        RAISE EXCEPTION 'لا يمكنك التصويت لنفسك';
    END IF;

    -- والأهليّةُ تحمل الآن بندَ المرشّح الوحيد، فهي مَن يردّ بطاقتَه.
    SELECT is_user_eligible_to_vote(NEW.voter_id, NEW.election_id) INTO v_eligible;
    IF NOT v_eligible THEN
        RAISE EXCEPTION 'غير مؤهل للتصويت في هذا الانتخاب';
    END IF;

    NEW.vote_weight := get_vote_weight(NEW.voter_id);
    NEW.voter_role_snapshot := COALESCE(get_user_primary_role(NEW.voter_id), 'unknown');

    RETURN NEW;
END;
$function$;
