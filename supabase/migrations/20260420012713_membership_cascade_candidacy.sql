-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260420012713   الاسم: membership_cascade_candidacy

CREATE OR REPLACE FUNCTION cascade_membership_loss_to_candidacy()
RETURNS TRIGGER AS $$
DECLARE
    v_old_committee_id  INTEGER;
    v_old_department_id INTEGER;
    v_user_id           UUID;
    v_became_inactive   BOOLEAN := false;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_user_id           := OLD.user_id;
        v_old_committee_id  := OLD.committee_id;
        v_old_department_id := OLD.department_id;
        v_became_inactive   := true;
    ELSIF TG_OP = 'UPDATE' THEN
        v_user_id           := NEW.user_id;
        v_old_committee_id  := OLD.committee_id;
        v_old_department_id := OLD.department_id;
        IF OLD.is_active = true AND NEW.is_active = false THEN
            v_became_inactive := true;
        END IF;
    END IF;

    IF NOT v_became_inactive THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    UPDATE election_candidates ec
       SET status            = 'withdrawn',
           withdrawal_reason = 'lost_membership',
           withdrawn_at      = now(),
           updated_at        = now()
      FROM elections e
     WHERE ec.election_id = e.id
       AND ec.user_id     = v_user_id
       AND ec.status IN ('pending','needs_edit','approved')
       AND e.status NOT IN ('completed','cancelled')
       AND (
            (v_old_committee_id IS NOT NULL AND e.target_committee_id = v_old_committee_id)
         OR (v_old_department_id IS NOT NULL AND e.target_department_id = v_old_department_id)
       );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_cascade_membership_loss ON user_roles;
CREATE TRIGGER trg_cascade_membership_loss
    AFTER UPDATE OR DELETE ON user_roles
    FOR EACH ROW
    EXECUTE FUNCTION cascade_membership_loss_to_candidacy();
