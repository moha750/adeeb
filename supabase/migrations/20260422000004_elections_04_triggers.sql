-- =============================================
-- نظام الانتخابات — 04: Triggers (آلات الحالة + قواعد الأمان)
-- =============================================

-- =========================================================
-- (أ) آلة حالة الانتخاب + قفل الأهداف
-- الانتخاب يُنشأ مباشرة في candidacy_open — لا توجد مرحلة draft.
-- =========================================================
CREATE OR REPLACE FUNCTION enforce_election_status_transition()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ok BOOLEAN := false;
BEGIN
    -- السماح بتمرير إن لم تتغير الحالة (تحديث حقول أخرى)
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- cancelled: مسموح من أي حالة إلا completed
    IF NEW.status = 'cancelled' THEN
        IF OLD.status = 'completed' THEN
            RAISE EXCEPTION 'لا يمكن إلغاء انتخاب مكتمل';
        END IF;
        RETURN NEW;
    END IF;

    -- الانتقالات المشروعة
    IF OLD.status = 'candidacy_open' AND NEW.status = 'candidacy_closed' THEN
        v_ok := true;
    ELSIF OLD.status = 'candidacy_closed' AND NEW.status = 'candidacy_open' THEN
        -- إعادة فتح الترشح (إن كان المرشحون أقل من العدد المطلوب)
        v_ok := true;
    ELSIF OLD.status = 'candidacy_closed' AND NEW.status = 'voting_open' THEN
        v_ok := true;
        NEW.voting_opened_at := COALESCE(NEW.voting_opened_at, now());
    ELSIF OLD.status = 'voting_open' AND NEW.status = 'voting_closed' THEN
        v_ok := true;
    ELSIF OLD.status = 'voting_closed' AND NEW.status = 'completed' THEN
        v_ok := true;
        IF NEW.winner_candidate_id IS NULL THEN
            RAISE EXCEPTION 'لا يمكن إنهاء الانتخاب دون إعلان فائز';
        END IF;
        NEW.winner_declared_at := COALESCE(NEW.winner_declared_at, now());
    END IF;

    IF NOT v_ok THEN
        RAISE EXCEPTION 'انتقال غير مسموح للحالة: % → %', OLD.status, NEW.status;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS elections_status_transition ON elections;
CREATE TRIGGER elections_status_transition
    BEFORE UPDATE OF status ON elections
    FOR EACH ROW EXECUTE FUNCTION enforce_election_status_transition();

-- قفل أهداف الانتخاب — دائماً بعد الإنشاء (لا استثناء)
CREATE OR REPLACE FUNCTION lock_election_targets()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.target_role_name <> OLD.target_role_name
       OR NEW.target_committee_id IS DISTINCT FROM OLD.target_committee_id
       OR NEW.target_department_id IS DISTINCT FROM OLD.target_department_id THEN
        RAISE EXCEPTION 'لا يمكن تعديل منصب/نطاق الانتخاب بعد الإنشاء';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS elections_lock_targets ON elections;
CREATE TRIGGER elections_lock_targets
    BEFORE UPDATE ON elections
    FOR EACH ROW EXECUTE FUNCTION lock_election_targets();

-- =========================================================
-- (ب) شرط الانتقال إلى voting_open: 0 pending/needs_edit + ≥2 approved
-- =========================================================
CREATE OR REPLACE FUNCTION promote_to_voting_check()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_unreviewed INT;
    v_approved   INT;
BEGIN
    IF NEW.status <> 'voting_open' OR OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    SELECT
        COUNT(*) FILTER (WHERE status IN ('pending','needs_edit')),
        COUNT(*) FILTER (WHERE status = 'approved')
    INTO v_unreviewed, v_approved
    FROM election_candidates
    WHERE election_id = NEW.id;

    IF v_unreviewed > 0 THEN
        RAISE EXCEPTION 'لا يمكن فتح التصويت: يوجد % مرشحاً قيد المراجعة', v_unreviewed;
    END IF;

    IF v_approved < 2 THEN
        RAISE EXCEPTION 'لا يمكن فتح التصويت: عدد المرشحين المقبولين % (الحد الأدنى 2)', v_approved;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS elections_promote_check ON elections;
CREATE TRIGGER elections_promote_check
    BEFORE UPDATE OF status ON elections
    FOR EACH ROW EXECUTE FUNCTION promote_to_voting_check();

-- =========================================================
-- (ج) حارس إعلان الفائز
-- =========================================================
CREATE OR REPLACE FUNCTION enforce_winner_declaration()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cand        election_candidates%ROWTYPE;
    v_top_weight  NUMERIC;
    v_this_weight NUMERIC;
BEGIN
    -- التحقق فقط عند إعلان فائز جديد
    IF NEW.winner_candidate_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF OLD.winner_candidate_id IS NOT DISTINCT FROM NEW.winner_candidate_id THEN
        RETURN NEW;  -- لم يتغير
    END IF;

    IF OLD.winner_candidate_id IS NOT NULL AND NEW.status <> 'cancelled' THEN
        RAISE EXCEPTION 'لا يمكن تغيير الفائز بعد إعلانه';
    END IF;

    -- يجب أن يكون مرشحاً معتمداً في هذا الانتخاب
    SELECT * INTO v_cand FROM election_candidates WHERE id = NEW.winner_candidate_id;
    IF NOT FOUND OR v_cand.election_id <> NEW.id OR v_cand.status <> 'approved' THEN
        RAISE EXCEPTION 'الفائز المقترح ليس مرشحاً معتمداً في هذا الانتخاب';
    END IF;

    -- يجب أن نكون في voting_closed عند الإعلان
    IF NEW.status NOT IN ('voting_closed','completed') THEN
        RAISE EXCEPTION 'لا يمكن إعلان الفائز إلا بعد إغلاق التصويت';
    END IF;

    -- يجب أن يكون الفائز الأعلى أصواتاً (إن تعادل، الأدمن يختار أحد المتعادلين)
    SELECT COALESCE(SUM(vote_weight), 0) INTO v_top_weight
    FROM election_votes
    WHERE election_id = NEW.id
    GROUP BY candidate_id
    ORDER BY COALESCE(SUM(vote_weight), 0) DESC
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
$$;

DROP TRIGGER IF EXISTS elections_winner_guard ON elections;
CREATE TRIGGER elections_winner_guard
    BEFORE UPDATE OF winner_candidate_id ON elections
    FOR EACH ROW EXECUTE FUNCTION enforce_winner_declaration();

-- =========================================================
-- (د) منح دور الفائز تلقائياً + تعطيل الأدوار القديمة
-- =========================================================
CREATE OR REPLACE FUNCTION auto_grant_winner_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_winner_user UUID;
    v_role_id     INT;
BEGIN
    IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN
        RETURN NEW;
    END IF;

    SELECT user_id INTO v_winner_user
    FROM election_candidates
    WHERE id = NEW.winner_candidate_id;

    SELECT id INTO v_role_id FROM roles WHERE role_name = NEW.target_role_name LIMIT 1;

    IF v_winner_user IS NULL OR v_role_id IS NULL THEN
        RAISE WARNING 'auto_grant_winner_role: missing winner or role mapping';
        RETURN NEW;
    END IF;

    -- ذاكرة: "دور واحد فقط لكل عضو — احذف الدور القديم أولاً"
    UPDATE user_roles
    SET is_active = false
    WHERE user_id = v_winner_user AND is_active = true;

    INSERT INTO user_roles (user_id, role_id, committee_id, department_id, is_active, assigned_by, notes)
    VALUES (
        v_winner_user,
        v_role_id,
        NEW.target_committee_id,
        NEW.target_department_id,
        true,
        NEW.winner_declared_by,
        'تعيين تلقائي بعد الفوز في الانتخاب ' || NEW.id::text
    );

    -- سجل التدقيق
    INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
    VALUES (NEW.id, NEW.winner_declared_by, 'winner_declared',
            jsonb_build_object('winner_user_id', v_winner_user, 'role_id', v_role_id));

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS elections_auto_grant_winner ON elections;
CREATE TRIGGER elections_auto_grant_winner
    AFTER UPDATE OF status ON elections
    FOR EACH ROW EXECUTE FUNCTION auto_grant_winner_role();

-- =========================================================
-- (هـ) أهلية الترشح + تعيين candidate_number تلقائياً
-- =========================================================
CREATE OR REPLACE FUNCTION enforce_candidacy_eligibility()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_next_num INT;
    v_eligible BOOLEAN;
BEGIN
    -- تعيين candidate_number تلقائياً
    SELECT COALESCE(MAX(candidate_number), 0) + 1 INTO v_next_num
    FROM election_candidates
    WHERE election_id = NEW.election_id;
    NEW.candidate_number := v_next_num;

    -- استخدم is_user_eligible_to_run للتحقق (يحتوي كل القواعد)
    SELECT is_user_eligible_to_run(NEW.user_id, NEW.election_id) INTO v_eligible;
    IF NOT v_eligible THEN
        RAISE EXCEPTION 'غير مؤهل للترشح في هذا الانتخاب';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS candidates_eligibility ON election_candidates;
CREATE TRIGGER candidates_eligibility
    BEFORE INSERT ON election_candidates
    FOR EACH ROW EXECUTE FUNCTION enforce_candidacy_eligibility();

-- =========================================================
-- (و) آلة حالة المرشح
-- =========================================================
CREATE OR REPLACE FUNCTION enforce_candidate_status_transition()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_election_status TEXT;
    v_ok              BOOLEAN := false;
BEGIN
    -- لا تغيير في الحالة → مرر
    IF OLD.status = NEW.status THEN
        -- لكن منع تعديل review/withdraw بعد voting_open
        RETURN NEW;
    END IF;

    SELECT status INTO v_election_status FROM elections WHERE id = NEW.election_id;

    -- انتقالات مسموحة
    IF OLD.status = 'pending' AND NEW.status IN ('approved','rejected','needs_edit','withdrawn') THEN
        v_ok := true;
    ELSIF OLD.status = 'needs_edit' AND NEW.status IN ('pending','withdrawn') THEN
        v_ok := true;
    ELSIF OLD.status = 'approved' AND NEW.status = 'withdrawn' THEN
        -- الانسحاب بعد القبول: فقط قبل فتح التصويت
        IF v_election_status IN ('candidacy_open','candidacy_closed') THEN
            v_ok := true;
        ELSE
            RAISE EXCEPTION 'لا يمكن الانسحاب بعد فتح التصويت';
        END IF;
    ELSIF OLD.status = 'rejected' OR OLD.status = 'withdrawn' THEN
        RAISE EXCEPTION 'هذه الحالة نهائية: %', OLD.status;
    END IF;

    IF NOT v_ok THEN
        RAISE EXCEPTION 'انتقال مرشح غير مسموح: % → %', OLD.status, NEW.status;
    END IF;

    -- إلزام review_note عند rejected/needs_edit
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
$$;

DROP TRIGGER IF EXISTS candidates_status_transition ON election_candidates;
CREATE TRIGGER candidates_status_transition
    BEFORE UPDATE OF status ON election_candidates
    FOR EACH ROW EXECUTE FUNCTION enforce_candidate_status_transition();

-- =========================================================
-- (ز) أهلية التصويت + حقن الوزن من الخادم
-- =========================================================
CREATE OR REPLACE FUNCTION enforce_vote_eligibility()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
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

    -- self-vote check
    IF NEW.voter_id <> auth.uid() THEN
        RAISE EXCEPTION 'لا يمكن التصويت نيابة عن مستخدم آخر';
    END IF;

    -- المرشح ينتمي لهذا الانتخاب ومعتمد
    SELECT * INTO v_cand FROM election_candidates WHERE id = NEW.candidate_id;
    IF NOT FOUND OR v_cand.election_id <> NEW.election_id OR v_cand.status <> 'approved' THEN
        RAISE EXCEPTION 'المرشح غير صالح في هذا الانتخاب';
    END IF;

    -- لا تصويت للنفس
    IF v_cand.user_id = NEW.voter_id THEN
        RAISE EXCEPTION 'لا يمكنك التصويت لنفسك';
    END IF;

    -- أهلية المصوت
    SELECT is_user_eligible_to_vote(NEW.voter_id, NEW.election_id) INTO v_eligible;
    IF NOT v_eligible THEN
        RAISE EXCEPTION 'غير مؤهل للتصويت في هذا الانتخاب';
    END IF;

    -- حقن الوزن والدور من الخادم (لا يُثق بالعميل)
    NEW.vote_weight := get_vote_weight(NEW.voter_id);
    NEW.voter_role_snapshot := COALESCE(get_user_primary_role(NEW.voter_id), 'unknown');

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS votes_eligibility ON election_votes;
CREATE TRIGGER votes_eligibility
    BEFORE INSERT ON election_votes
    FOR EACH ROW EXECUTE FUNCTION enforce_vote_eligibility();

-- =========================================================
-- (ح) الأصوات نهائية
-- =========================================================
CREATE OR REPLACE FUNCTION prevent_vote_update()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    RAISE EXCEPTION 'الأصوات نهائية ولا يمكن تعديلها أو حذفها';
END;
$$;

DROP TRIGGER IF EXISTS votes_immutable_upd ON election_votes;
CREATE TRIGGER votes_immutable_upd
    BEFORE UPDATE ON election_votes
    FOR EACH ROW EXECUTE FUNCTION prevent_vote_update();

DROP TRIGGER IF EXISTS votes_immutable_del ON election_votes;
CREATE TRIGGER votes_immutable_del
    BEFORE DELETE ON election_votes
    FOR EACH ROW EXECUTE FUNCTION prevent_vote_update();

-- =========================================================
-- (ط) انسحاب تلقائي عند فقدان عضوية الوحدة
-- =========================================================
CREATE OR REPLACE FUNCTION cascade_membership_loss_to_candidacy()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.is_active = true AND NEW.is_active = false THEN
        -- انسحاب من الترشحات النشطة في الوحدة (committee/department) التي فُقدت
        UPDATE election_candidates ec
        SET status = 'withdrawn',
            withdrawn_at = now(),
            review_note_ar = COALESCE(ec.review_note_ar, 'انسحاب تلقائي بسبب فقدان العضوية')
        FROM elections e
        WHERE ec.election_id = e.id
          AND ec.user_id = NEW.user_id
          AND ec.status IN ('pending','approved','needs_edit')
          AND e.archived_at IS NULL
          AND e.status IN ('candidacy_open','candidacy_closed')
          AND (
              (OLD.committee_id  IS NOT NULL AND e.target_committee_id  = OLD.committee_id)
           OR (OLD.department_id IS NOT NULL AND e.target_department_id = OLD.department_id)
          );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_roles_cascade_candidacy ON user_roles;
CREATE TRIGGER user_roles_cascade_candidacy
    AFTER UPDATE OF is_active ON user_roles
    FOR EACH ROW EXECUTE FUNCTION cascade_membership_loss_to_candidacy();
