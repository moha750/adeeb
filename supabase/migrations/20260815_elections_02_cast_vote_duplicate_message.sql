-- الصوتُ الثاني كان يُردّ برسالة القيد الإنجليزيّة (duplicate key…) فتُعرَض للناخب كما هي.
-- والقيدُ يبقى حارسًا للسباق، لكنّ الكلمةَ تُقال بلسانٍ يفهمه صاحبُها.
create or replace function public.cast_vote(p_election uuid, p_candidate uuid, p_choice text default 'approve')
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
    v_id     UUID;
    v_choice TEXT := COALESCE(NULLIF(TRIM(p_choice), ''), 'approve');
BEGIN
    IF v_choice NOT IN ('approve', 'reject', 'abstain') THEN
        RAISE EXCEPTION 'رأيٌ غير معروف في بطاقة الاقتراع';
    END IF;

    IF v_choice = 'reject' AND NOT public.is_confidence_election(p_election) THEN
        RAISE EXCEPTION 'الاعتراض لا يكون إلّا في تزكية مرشّحٍ وحيد';
    END IF;

    -- الامتناعُ بطاقةٌ تُختم بلا مرشّح؛ فإن جاء معه مرشّحٌ فالنداءُ متناقض.
    IF v_choice = 'abstain' AND p_candidate IS NOT NULL THEN
        RAISE EXCEPTION 'الامتناع لا يكون على مرشّح';
    END IF;
    IF v_choice <> 'abstain' AND p_candidate IS NULL THEN
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
