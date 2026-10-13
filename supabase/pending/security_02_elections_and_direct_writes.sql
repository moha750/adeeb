-- ══════════════════════════════════════════════════════════════════════════════
-- أمنٌ ٠٢ (٢٠٢٦-١٠-١٠): نزاهةُ الانتخاب، وسلطةُ الحوكمة تمرّ بأبوابها وحدها
--
-- الانتخابات (أُثبتت بقراءة التعريفات الحيّة):
--   أ) المرشّحُ يعتمد ترشّحَه بنفسه ويعدّل بيانَه بعد اعتماده: `candidates_update_self` تأذن
--      بتحديث صفّه، وحارسُ الانتقال يجيز «قيد المراجعة ← معتمَد» بلا فحصٍ للمراجِع.
--   ب) صوتُ «اعتراض» يُدسّ في انتخابٍ تنافسيّ (`votes_insert_self`، والحارسُ لا يفحص نوعَ الصوت)،
--      ثمّ يجمعه `resolve_department_election_winners` تأييدًا. ولا يُقيَّد في سجلّ الانتخاب.
--   ج) كلُّ مرشّحٍ يرى هويّاتِ منافسيه (`get_candidates_with_identity`)، والنتائجُ كاملةً لكلّ أحدٍ
--      بعد الاكتمال (`get_election_results`)، والمقرَّر: يُعلن الفائزُ وحده (المادة ٤٧).
--   د) دوالُّ «انتخاباتي» تجيب عن أيّ عضوٍ يُسمّى لها، ومنه «هل صوّت فلان؟».
--   هـ) حسابُ النادي يفقد إدارةَ الانتخابات (قرار المالك ٢٠٢٦-١٠-١٠، المادة ٤٩).
--
-- الحوكمة والتخزين:
--   و) سياساتٌ قديمة تأذن بالكتابة المباشرة على جداول السلطة لصاحب `manage_positions`
--      (`user_roles`، `roles`، `committees`، `councils`، `committee_supervision`)، فيتخطّى الكاتبُ
--      `assign_position` و`position_authority`: يُسند لنفسه منصبًا أو يرفع قيدَ «بيد رئيس أدِيب».
--   ز) كلُّ صاحب حسابٍ يرفع ويستبدل ويحذف أيَّ صورةٍ في `images` و`avatars`.
--   ح) `stats` يعدّله أيُّ زائر، و`activity_log` يُدرج فيه أيُّ زائر، وبياناتُ العضو تُكتب مباشرة.
--
-- **العلاج**: لا كتابةَ مباشرة من العميل على الانتخاب ولا على جداول السلطة؛ فكلُّ موضعِ كتابةٍ
-- في الموقع فُحص فإذا هو بمفتاح الخدمة أو بدالّةٍ SECURITY DEFINER أو برابط رفعٍ موقَّع. والحرّاسُ
-- تفرض القاعدةَ على كلّ صفٍّ أيًّا كان بابُه. ثمّ قاعدةٌ عامّة: لا امتيازَ كتابةٍ حيث لا سياسةَ كتابة.
-- ══════════════════════════════════════════════════════════════════════════════

-- ١) الانتخاب: لا كتابةَ مباشرة، الأبوابُ وحدها
drop policy if exists candidates_insert_self  on public.election_candidates;
drop policy if exists candidates_update_self  on public.election_candidates;
drop policy if exists candidates_update_admin on public.election_candidates;
drop policy if exists candidates_delete_admin on public.election_candidates;
drop policy if exists votes_insert_self       on public.election_votes;
drop policy if exists elections_insert_admin  on public.elections;
drop policy if exists elections_update_admin  on public.elections;
drop policy if exists elections_delete_admin  on public.elections;
revoke insert, update, delete, truncate on public.election_candidates, public.election_votes,
  public.elections, public.election_audit_log from anon, authenticated;

-- ٢) المراجعةُ بيد المديرين، والمعتمَدُ لا يُعدَّل (أ)
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
        -- المراجعةُ بيد مديري الانتخابات وحدهم (المادة ٤٩)، تُفرض هنا لا في الباب وحده:
        -- فلا يعتمد مرشّحٌ ترشّحَه بنداءٍ مباشر (ثغرة ٢٠٢٦-١٠-١٠).
        IF NOT (has_election_admin_permission(auth.uid()) OR coalesce(auth.role(), '') = 'service_role') THEN
            RAISE EXCEPTION 'مراجعةُ الترشّح بيد مديري الانتخابات وحدهم' USING ERRCODE = '42501';
        END IF;
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

-- والمعتمَدُ لا يُعدَّل، والترشّحُ يولد «قيد المراجعة» — حارسٌ على كلّ صفّ لا على عمود الحالة وحده
create or replace function public.guard_candidacy_writes()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  if tg_op = 'INSERT' then
    if new.status is distinct from 'pending'
       and not (has_election_admin_permission(auth.uid()) or coalesce(auth.role(), '') = 'service_role') then
      raise exception 'الترشّحُ يبدأ قيدَ المراجعة' using errcode = '42501';
    end if;
    return new;
  end if;

  if old.status = 'approved' and new.status = 'approved'
     and (new.statement_ar is distinct from old.statement_ar
       or new.file_url     is distinct from old.file_url
       or new.file_name    is distinct from old.file_name
       or new.user_id      is distinct from old.user_id
       or new.election_id  is distinct from old.election_id) then
    raise exception 'المعتمَدُ لا يُعدَّل' using errcode = '42501';
  end if;
  return new;
end;
$function$;

drop trigger if exists candidates_guard_writes on public.election_candidates;
create trigger candidates_guard_writes
  before insert or update on public.election_candidates
  for each row execute function public.guard_candidacy_writes();


-- ٣) الاعتراضُ في التزكية وحدها، والتأييدُ وحده يُجمع (ب)
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

    IF NEW.voter_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'لا يمكن التصويت نيابة عن مستخدم آخر';
    END IF;

    -- رأيان لا ثالثَ لهما، والاعتراضُ لا يكون إلّا في تزكية مرشّحٍ وحيد. يُفرض هنا على كلّ
    -- بطاقة لا في `cast_vote` وحدها، فلا يُدسّ اعتراضٌ في انتخابٍ تنافسيّ (ثغرة ٢٠٢٦-١٠-١٠).
    IF NEW.vote_choice IS NULL OR NEW.vote_choice NOT IN ('approve', 'reject') THEN
        RAISE EXCEPTION 'رأيٌ غير معروف في بطاقة الاقتراع';
    END IF;
    IF NEW.vote_choice = 'reject' AND NOT is_confidence_election(NEW.election_id) THEN
        RAISE EXCEPTION 'الاعتراض لا يكون إلّا في تزكية مرشّحٍ وحيد';
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

CREATE OR REPLACE FUNCTION public.resolve_department_election_winners(p_department integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
           COALESCE((SELECT SUM(ev.vote_weight) FROM election_votes ev WHERE ev.candidate_id = ec.id AND ev.vote_choice = 'approve'), 0) AS w,  -- التأييدُ وحده يُجمع (المادة ٤٨)
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

-- ٤) الحجبُ والإعلان (ج)
CREATE OR REPLACE FUNCTION public.get_candidates_with_identity(p_election uuid)
 RETURNS TABLE(candidate_id uuid, candidate_number integer, user_id uuid, full_name text, username text, avatar_url text, statement_ar text, file_url text, file_name text, file_size_bytes integer, file_mime text, status text, review_note_ar text, reviewed_by uuid, reviewed_at timestamp with time zone, withdrawn_at timestamp with time zone, submitted_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_uid  uuid := auth.uid();
    v_full boolean;
BEGIN
    -- الهويّاتُ كلُّها لمديري الانتخابات ولمن له الاطّلاع؛ والمرشّحُ يرى صفَّه وحده (المادة ٤٧).
    v_full := has_election_admin_permission(v_uid)
           OR has_election_view_permission(v_uid, p_election)
           OR coalesce(auth.role(), '') = 'service_role';

    IF NOT v_full AND NOT EXISTS (
           SELECT 1 FROM election_candidates ec
           WHERE ec.election_id = p_election AND ec.user_id = v_uid
       ) THEN
        RAISE EXCEPTION 'غير مصرح برؤية بيانات المرشحين';
    END IF;

    RETURN QUERY
    SELECT
        ec.id, ec.candidate_number, ec.user_id, p.full_name, p.username, p.avatar_url,
        ec.statement_ar, ec.file_url, ec.file_name, ec.file_size_bytes, ec.file_mime,
        ec.status, ec.review_note_ar, ec.reviewed_by, ec.reviewed_at, ec.withdrawn_at,
        ec.submitted_at, ec.updated_at
    FROM election_candidates ec
    JOIN profiles p ON p.id = ec.user_id
    WHERE ec.election_id = p_election
      AND (v_full OR ec.user_id = v_uid)
    ORDER BY ec.candidate_number;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_election_results(p_election uuid)
 RETURNS TABLE(candidate_id uuid, candidate_number integer, user_id uuid, full_name text, avatar_url text, total_weight numeric, total_votes bigint, is_winner boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_election elections%ROWTYPE;
    v_uid      uuid := auth.uid();
    v_admin    boolean;
    v_viewer   boolean;
BEGIN
    SELECT * INTO v_election FROM elections WHERE id = p_election;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'الانتخاب غير موجود';
    END IF;

    v_admin  := has_election_admin_permission(v_uid) OR coalesce(auth.role(), '') = 'service_role';
    v_viewer := has_election_view_permission(v_uid, p_election);

    -- من يرى ماذا (قرار المالك ٢٠٢٦-١٠-١٠):
    --   مديرو الانتخابات: النتائجُ كاملةً في كلّ حين.
    --   من له الاطّلاع (أعضاءُ الموارد البشرية): كاملةً بعد إغلاق التصويت.
    --   من سواهم: بعد الاكتمال يُعلَن الفائزُ وحده، بلا أرقام.
    IF v_admin OR (v_viewer AND v_election.status IN ('voting_closed', 'completed')) THEN
        RETURN QUERY
        SELECT ec.id, ec.candidate_number, ec.user_id, p.full_name, p.avatar_url,
               COALESCE(SUM(v.vote_weight), 0)::NUMERIC,
               COUNT(v.id)::BIGINT,
               (v_election.winner_candidate_id = ec.id)
        FROM election_candidates ec
        JOIN profiles p ON p.id = ec.user_id
        LEFT JOIN election_votes v ON v.candidate_id = ec.id AND v.vote_choice = 'approve'
        WHERE ec.election_id = p_election
          AND ec.status = 'approved'
        GROUP BY ec.id, ec.candidate_number, ec.user_id, p.full_name, p.avatar_url
        ORDER BY 6 DESC, 2;
        RETURN;
    END IF;

    IF v_uid IS NULL OR v_election.status <> 'completed' OR v_election.winner_candidate_id IS NULL THEN
        RAISE EXCEPTION 'النتائج غير متاحة حتى إعلان الفائز';
    END IF;

    RETURN QUERY
    SELECT ec.id, ec.candidate_number, ec.user_id, p.full_name, p.avatar_url,
           NULL::numeric, NULL::bigint, true
    FROM election_candidates ec
    JOIN profiles p ON p.id = ec.user_id
    WHERE ec.id = v_election.winner_candidate_id;
END;
$function$;

-- ٥) لا يُسأل عن غيرك (د)
CREATE OR REPLACE FUNCTION public.get_eligible_elections_for_user(p_user uuid DEFAULT NULL::uuid)
 RETURNS TABLE(election_id uuid, target_role_name text, target_committee_id integer, target_committee_ar text, target_department_id integer, target_department_ar text, candidacy_end timestamp with time zone, has_submission boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    -- صاحبُ الجلسة هو الحقيقة، والمُدخَلُ دعوى (نسقُ `get_user_candidacies`).
    v_self uuid := auth.uid();
    v_user uuid;
BEGIN
    IF v_self IS NULL THEN
        -- لا جلسة: لا يُقبل إلّا الخادمُ نفسُه، وهو يسمّي موضوعَه.
        IF coalesce(auth.role(), '') = 'service_role' THEN
            v_user := p_user;
        ELSE
            RAISE EXCEPTION 'لا جلسةَ لك.' USING ERRCODE = '42501';
        END IF;
    ELSE
        v_user := coalesce(p_user, v_self);
        -- السؤالُ عن غيرك لا يكون إلّا بقدرة المعاينة كعضو (`manage_permissions`).
        IF v_user <> v_self AND NOT check_user_permission(v_self, 'manage_permissions') THEN
            RAISE EXCEPTION 'ليس لك أن تسأل عن غيرك.' USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN QUERY
    SELECT
        e.id,
        e.target_role_name,
        e.target_committee_id,
        c.committee_name_ar,
        e.target_department_id,
        d.name_ar,
        e.candidacy_end,
        EXISTS (
            SELECT 1 FROM election_candidates ec
            WHERE ec.election_id = e.id AND ec.user_id = v_user
              AND ec.status IN ('pending','approved','needs_edit')
        ) AS has_submission
    FROM elections e
    LEFT JOIN committees  c ON c.id = e.target_committee_id
    LEFT JOIN departments d ON d.id = e.target_department_id
    WHERE e.status = 'candidacy_open'
      AND e.archived_at IS NULL
      AND is_user_eligible_to_run(v_user, e.id) = true
    ORDER BY e.candidacy_end NULLS LAST, e.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_votable_elections_for_user(p_user uuid DEFAULT NULL::uuid)
 RETURNS TABLE(election_id uuid, target_role_name text, target_committee_id integer, target_committee_ar text, target_department_id integer, target_department_ar text, voting_end timestamp with time zone, has_voted boolean, view_only boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    -- صاحبُ الجلسة هو الحقيقة، والمُدخَلُ دعوى (نسقُ `get_user_candidacies`).
    v_self uuid := auth.uid();
    v_user uuid;
BEGIN
    IF v_self IS NULL THEN
        -- لا جلسة: لا يُقبل إلّا الخادمُ نفسُه، وهو يسمّي موضوعَه.
        IF coalesce(auth.role(), '') = 'service_role' THEN
            v_user := p_user;
        ELSE
            RAISE EXCEPTION 'لا جلسةَ لك.' USING ERRCODE = '42501';
        END IF;
    ELSE
        v_user := coalesce(p_user, v_self);
        -- السؤالُ عن غيرك لا يكون إلّا بقدرة المعاينة كعضو (`manage_permissions`).
        IF v_user <> v_self AND NOT check_user_permission(v_self, 'manage_permissions') THEN
            RAISE EXCEPTION 'ليس لك أن تسأل عن غيرك.' USING ERRCODE = '42501';
        END IF;
    END IF;
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

CREATE OR REPLACE FUNCTION public.count_user_election_tabs(p_user uuid DEFAULT NULL::uuid)
 RETURNS TABLE(can_run integer, has_submission integer, can_vote integer, can_view integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    -- صاحبُ الجلسة هو الحقيقة، والمُدخَلُ دعوى (نسقُ `get_user_candidacies`).
    v_self uuid := auth.uid();
    v_user uuid;
    v_can_run   INTEGER := 0;
    v_has_sub   INTEGER := 0;
    v_can_vote  INTEGER := 0;
    v_can_view  INTEGER := 0;
BEGIN
    IF v_self IS NULL THEN
        -- لا جلسة: لا يُقبل إلّا الخادمُ نفسُه، وهو يسمّي موضوعَه.
        IF coalesce(auth.role(), '') = 'service_role' THEN
            v_user := p_user;
        ELSE
            RAISE EXCEPTION 'لا جلسةَ لك.' USING ERRCODE = '42501';
        END IF;
    ELSE
        v_user := coalesce(p_user, v_self);
        -- السؤالُ عن غيرك لا يكون إلّا بقدرة المعاينة كعضو (`manage_permissions`).
        IF v_user <> v_self AND NOT check_user_permission(v_self, 'manage_permissions') THEN
            RAISE EXCEPTION 'ليس لك أن تسأل عن غيرك.' USING ERRCODE = '42501';
        END IF;
    END IF;

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

-- ٦) حسابُ النادي يفقد إدارةَ الانتخابات (هـ)
delete from public.role_permissions rp
using public.permissions p
where p.id = rp.permission_id and p.permission_key = 'manage_elections' and rp.role_name = 'adeeb_admin';

-- ═══ الحوكمة والتخزين (و، ز، ح) ═══
-- ٧) جداولُ السلطة: لا كتابةَ إلّا من أبوابها
drop policy if exists user_roles_insert           on public.user_roles;
drop policy if exists user_roles_update           on public.user_roles;
drop policy if exists user_roles_delete           on public.user_roles;
drop policy if exists roles_modify                on public.roles;
drop policy if exists committees_modify           on public.committees;
drop policy if exists councils_admin_write        on public.councils;
drop policy if exists committee_supervision_modify on public.committee_supervision;
drop policy if exists departments_modify_president on public.departments;
drop policy if exists permissions_admin_all       on public.permissions;
drop policy if exists role_permissions_admin_all  on public.role_permissions;
drop policy if exists usp_manage_president        on public.user_specific_permissions;
drop policy if exists profiles_insert_policy      on public.profiles;
drop policy if exists profiles_delete             on public.profiles;
drop policy if exists activity_log_insert_system  on public.activity_log;
drop policy if exists "Allow public increment"    on public.stats;

-- بياناتُ العضو وتقييماتُه: تُكتب بالخادم بعد `can_edit_member_data` (أسماءُ السياسات عربيّةٌ مبتورة)
do $$
declare p record;
begin
  for p in
    select tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in ('member_details', 'member_evaluations')
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- ٨) التخزين: الرفعُ بالخادم أو برابطٍ موقَّعٍ يصكّه، فلا كتابةَ مباشرة على الدلوين العامّين
drop policy if exists "Authenticated users can upload images" on storage.objects;
drop policy if exists "Authenticated users can update images" on storage.objects;
drop policy if exists "Authenticated users can delete images" on storage.objects;
drop policy if exists "Users can upload their own avatar"     on storage.objects;
drop policy if exists "Users can update their own avatar"     on storage.objects;

-- ٩) القاعدةُ العامّة: لا امتيازَ كتابةٍ حيث لا سياسةَ كتابة، ولا TRUNCATE لأحدٍ من الخارج
do $$
declare
  t record; r text; c text; has_pol boolean;
begin
  for t in
    select cl.relname from pg_class cl join pg_namespace n on n.oid = cl.relnamespace
    where n.nspname = 'public' and cl.relkind in ('r', 'p') and cl.relrowsecurity
  loop
    execute format('revoke truncate, references, trigger on public.%I from anon, authenticated', t.relname);
    foreach r in array array['anon', 'authenticated'] loop
      foreach c in array array['INSERT', 'UPDATE', 'DELETE'] loop
        select exists (
          select 1 from pg_policies p
          where p.schemaname = 'public' and p.tablename = t.relname
            and (p.cmd = c or p.cmd = 'ALL')
            and (r::name = any (p.roles) or 'public'::name = any (p.roles))
        ) into has_pol;
        if not has_pol then
          execute format('revoke %s on public.%I from %I', c, t.relname, r);
        end if;
      end loop;
    end loop;
  end loop;
end $$;
