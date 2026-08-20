-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260420012640   الاسم: auto_grant_winner_role

CREATE OR REPLACE FUNCTION auto_grant_winner_role()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed'
       AND OLD.status <> 'completed'
       AND NEW.winner_user_id IS NOT NULL THEN

        UPDATE user_roles
           SET is_active = false
         WHERE user_id   = NEW.winner_user_id
           AND is_active = true;

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
