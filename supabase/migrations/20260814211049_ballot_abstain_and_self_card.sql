-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260814211049   الاسم: ballot_abstain_and_self_card

-- ══════════════════════════════════════════════════════════════════════
-- الامتناعُ قرارٌ لا غياب، وورقةُ الناخب تُعرَف قبل أن يمدّ يدَه إليها.
--
-- اللائحةُ تمنع التصويتَ للنفس، والحارسُ يمنعه (`enforce_vote_eligibility`).
-- لكنّ المنعَ كان يُقال بعد الضغط لا قبله، ولم يكن للممنوع بابٌ يخرج منه:
--   • بطاقتُه تُعرَض عليه بلا علامةٍ تقول «هذه ورقتُك».
--   • ومن لم يجد في الباقين أهلًا فإمّا أن يزكّي خصمًا وإمّا أن يُقرأ غائبًا.
--   • والمرشّحُ الوحيدُ في تزكيته يُردّ في التأييد والاعتراض جميعًا، فيبقى بلا صوت.
-- فههنا ثلاثةٌ: صوتٌ بلا مرشّح (امتناع)، وعلامةٌ تدلّ الناخبَ على ورقته،
-- وتفصيلٌ للأدمن بعد الأرشفة لا يُسقط الممتنعين من الصفحة.
-- ══════════════════════════════════════════════════════════════════════

/* ── ١) الصوتُ قد يُختم بلا مرشّح ───────────────────────────────────── */
alter table election_votes alter column candidate_id drop not null;

alter table election_votes drop constraint election_votes_choice_check;
alter table election_votes add constraint election_votes_choice_check
  check (vote_choice in ('approve', 'reject', 'abstain'));

-- الامتناعُ والمرشّحُ لا يجتمعان ولا يفترقان: بطاقةٌ بلا مرشّحٍ هي الامتناعُ نفسُه،
-- ولا يُسجَّل امتناعٌ «على فلان». (والأصواتُ نهائيّةٌ فلا يخشى نقضُ القيد بتحديث.)
alter table election_votes add constraint election_votes_abstain_has_no_candidate
  check ((vote_choice = 'abstain') = (candidate_id is null));


/* ── ٢) الإدلاء: مرشّحٌ أو امتناع ───────────────────────────────────── */
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


/* ── ٣) الحارس: يعرف البطاقةَ الخالية من المرشّح ────────────────────── */
create or replace function public.enforce_vote_eligibility()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
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

    IF NEW.candidate_id IS NULL THEN
        -- امتناع: بطاقةٌ مختومةٌ بلا مرشّح. لا مرشّحَ يُفحَص، ولا نفسَ تُزكّى.
        IF NEW.vote_choice <> 'abstain' THEN
            RAISE EXCEPTION 'بطاقةٌ بلا مرشّحٍ لا تكون إلّا امتناعًا';
        END IF;
    ELSE
        SELECT * INTO v_cand FROM election_candidates WHERE id = NEW.candidate_id;
        IF NOT FOUND OR v_cand.election_id <> NEW.election_id OR v_cand.status <> 'approved' THEN
            RAISE EXCEPTION 'المرشح غير صالح في هذا الانتخاب';
        END IF;

        IF v_cand.user_id = NEW.voter_id THEN
            RAISE EXCEPTION 'لا يمكنك التصويت لنفسك';
        END IF;
    END IF;

    SELECT is_user_eligible_to_vote(NEW.voter_id, NEW.election_id) INTO v_eligible;
    IF NOT v_eligible THEN
        RAISE EXCEPTION 'غير مؤهل للتصويت في هذا الانتخاب';
    END IF;

    NEW.vote_weight := get_vote_weight(NEW.voter_id);
    NEW.voter_role_snapshot := COALESCE(get_user_primary_role(NEW.voter_id), 'unknown');

    RETURN NEW;
END;
$function$;


/* ── ٤) البطاقةُ تدلّ الناخبَ على ورقته ─────────────────────────────── */
-- `is_self` علامةٌ لصاحبها وحدَه: مبنيّةٌ على `auth.uid()` فلا يرى بها أحدٌ غيرَ ورقته،
-- ولا تُفشي اسمًا. وبها تُعطَّل ورقتُه في الواجهة قبل الضغط، بدل سطرٍ أحمرَ بعده.
drop function if exists public.get_anonymized_candidates(uuid);

create function public.get_anonymized_candidates(p_election uuid)
returns table(candidate_id uuid, candidate_number integer, statement_ar text, file_url text,
              file_name text, file_size_bytes integer, file_mime text, is_self boolean)
language plpgsql
stable security definer
set search_path to 'public'
as $function$
DECLARE
    v_election elections%ROWTYPE;
    v_eligible BOOLEAN;
    v_is_admin BOOLEAN;
    v_is_view  BOOLEAN;
BEGIN
    SELECT * INTO v_election FROM elections WHERE id = p_election;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'الانتخاب غير موجود';
    END IF;

    v_is_admin := has_election_admin_permission(auth.uid());
    v_is_view  := has_election_view_permission(auth.uid(), p_election);

    IF NOT v_is_admin AND NOT v_is_view THEN
        IF v_election.status NOT IN ('voting_open','voting_closed','completed') THEN
            RAISE EXCEPTION 'لا يمكن عرض المرشحين قبل فتح التصويت';
        END IF;

        SELECT is_user_eligible_to_vote(auth.uid(), p_election) INTO v_eligible;
        IF NOT v_eligible THEN
            RAISE EXCEPTION 'غير مؤهل لعرض مرشحي هذا الانتخاب';
        END IF;
    END IF;

    RETURN QUERY
    SELECT
        ec.id,
        ec.candidate_number,
        ec.statement_ar,
        ec.file_url,
        ec.file_name,
        ec.file_size_bytes,
        ec.file_mime,
        (ec.user_id = auth.uid()) AS is_self
    FROM election_candidates ec
    WHERE ec.election_id = p_election
      AND ec.status = 'approved'
    ORDER BY ec.candidate_number;
END;
$function$;


/* ── ٥) تفصيلُ الأصوات بعد الأرشفة لا يُسقط الممتنعين ───────────────── */
-- كان الوصلُ داخليًّا بالمرشّح، فبطاقةُ الممتنع (بلا مرشّح) تسقط من الصفحة كأنّها لم تكن.
-- الممتنعُ صوّت، فيُعرَض ومرشّحُه فارغ.
create or replace function public.get_election_vote_detail(p_election uuid)
returns table(voter_id uuid, voter_name text, voter_role text, candidate_id uuid,
              candidate_number integer, candidate_name text, vote_weight numeric,
              vote_choice text, voted_at timestamp with time zone)
language plpgsql
stable security definer
set search_path to 'public'
as $function$
DECLARE
    v_election elections%ROWTYPE;
BEGIN
    SELECT * INTO v_election FROM elections WHERE id = p_election;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'الانتخاب غير موجود';
    END IF;

    IF NOT has_election_admin_permission(auth.uid()) THEN
        RAISE EXCEPTION 'تفصيل الأصوات متاح للأدمن فقط';
    END IF;

    IF v_election.archived_at IS NULL
       OR v_election.status NOT IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'تفصيل الأصوات يُكشف فقط بعد أرشفة الانتخاب';
    END IF;

    RETURN QUERY
    SELECT
        v.voter_id,
        vp.full_name,
        v.voter_role_snapshot,
        v.candidate_id,
        ec.candidate_number,
        cp.full_name,
        v.vote_weight,
        v.vote_choice,
        v.created_at
    FROM election_votes v
    LEFT JOIN election_candidates ec ON ec.id = v.candidate_id
    LEFT JOIN profiles vp ON vp.id = v.voter_id
    LEFT JOIN profiles cp ON cp.id = ec.user_id
    WHERE v.election_id = p_election
    ORDER BY v.created_at;
END;
$function$;

