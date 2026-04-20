-- =============================================
-- منح دور الفائز تلقائياً عند اكتمال الانتخاب
-- عند الانتقال إلى status = 'completed' ووجود winner_user_id:
--   (1) تعطيل أدوار الفائز الحالية (is_active = false) — دور واحد لكل عضو
--   (2) إدخال الدور الجديد مع target_role_id و target_committee_id / target_department_id
-- =============================================

CREATE OR REPLACE FUNCTION auto_grant_winner_role()
RETURNS TRIGGER AS $$
BEGIN
    -- يعمل فقط عند الانتقال إلى completed ولأول مرة
    IF NEW.status = 'completed'
       AND OLD.status <> 'completed'
       AND NEW.winner_user_id IS NOT NULL THEN

        -- (1) تعطيل كل الأدوار النشطة الحالية للفائز
        UPDATE user_roles
           SET is_active = false
         WHERE user_id   = NEW.winner_user_id
           AND is_active = true;

        -- (2) إدخال الدور الجديد
        INSERT INTO user_roles (
            user_id, role_id, committee_id, department_id,
            is_active, assigned_at, assigned_by, notes
        )
        VALUES (
            NEW.winner_user_id,
            NEW.target_role_id,
            NEW.target_committee_id,
            NEW.target_department_id,
            true,
            now(),
            NEW.created_by,
            'تعيين تلقائي بعد الفوز في الانتخاب ' || NEW.id::text
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_grant_winner_role ON elections;
CREATE TRIGGER trg_auto_grant_winner_role
    AFTER UPDATE OF status ON elections
    FOR EACH ROW
    EXECUTE FUNCTION auto_grant_winner_role();
