-- =============================================
-- تسلسل فقدان العضوية → انسحاب الترشحات النشطة
-- عند تعطيل دور المستخدم (is_active=false) أو حذفه:
-- كل ترشح نشط (pending/needs_edit/approved) في انتخاب غير نهائي
-- وفي وحدة كانت مرتبطة بذلك الدور يُحوَّل إلى withdrawn
-- بسبب 'lost_membership'.
--
-- يتجاوز آلة حالة المرشّح (SECURITY DEFINER) لأنه انسحاب قسري نظامي.
-- =============================================

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
        -- تفعيل → تعطيل
        IF OLD.is_active = true AND NEW.is_active = false THEN
            v_became_inactive := true;
        END IF;
    END IF;

    IF NOT v_became_inactive THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- سحب الترشحات المرتبطة بهذه الوحدة
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
