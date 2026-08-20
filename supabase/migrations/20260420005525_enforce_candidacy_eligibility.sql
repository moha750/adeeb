-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260420005525   الاسم: enforce_candidacy_eligibility

-- =============================================
-- منع التضارب في الترشح
-- لا يحق للقائد الحالي للجنة أن يترشح لمنصب نائب نفس اللجنة
-- =============================================

CREATE OR REPLACE FUNCTION enforce_candidacy_eligibility()
RETURNS TRIGGER AS $$
DECLARE
    v_target_role_name    TEXT;
    v_target_committee_id INTEGER;
    v_conflict_count      INTEGER;
BEGIN
    SELECT r.role_name, e.target_committee_id
      INTO v_target_role_name, v_target_committee_id
      FROM elections e
      JOIN roles r ON e.target_role_id = r.id
     WHERE e.id = NEW.election_id;

    -- قاعدة 1: قائد اللجنة لا يحق له الترشح لنائب نفس اللجنة
    IF v_target_role_name = 'deputy_committee_leader'
       AND v_target_committee_id IS NOT NULL THEN

        SELECT COUNT(*)
          INTO v_conflict_count
          FROM user_roles ur
          JOIN roles r ON ur.role_id = r.id
         WHERE ur.user_id      = NEW.user_id
           AND ur.is_active    = true
           AND r.role_name     = 'committee_leader'
           AND ur.committee_id = v_target_committee_id;

        IF v_conflict_count > 0 THEN
            RAISE EXCEPTION 'لا يحق لك الترشح لمنصب نائب القائد لأنك تشغل منصب القائد في نفس اللجنة'
                USING ERRCODE = 'P0001';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_candidacy_eligibility ON election_candidates;
CREATE TRIGGER trg_enforce_candidacy_eligibility
    BEFORE INSERT OR UPDATE OF election_id, user_id ON election_candidates
    FOR EACH ROW
    EXECUTE FUNCTION enforce_candidacy_eligibility();
