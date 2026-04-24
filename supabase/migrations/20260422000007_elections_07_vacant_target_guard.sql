-- =============================================
-- نظام الانتخابات — 07: حارس شغور المنصب المستهدف
-- يمنع إنشاء/تعديل انتخاب لمنصب مشغول حالياً بعضو نشط
-- =============================================

-- =========================================================
-- (أ) دالة: هل المنصب المستهدف شاغر؟
-- =========================================================
CREATE OR REPLACE FUNCTION is_target_position_vacant(
    p_role_name     TEXT,
    p_committee_id  INTEGER,
    p_department_id INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_occupied BOOLEAN := false;
BEGIN
    IF p_role_name = 'committee_leader' THEN
        IF p_committee_id IS NULL THEN RETURN true; END IF;
        SELECT EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.is_active
              AND r.role_name = 'committee_leader'
              AND ur.committee_id = p_committee_id
        ) INTO v_occupied;

    ELSIF p_role_name = 'deputy_committee_leader' THEN
        IF p_committee_id IS NULL THEN RETURN true; END IF;
        SELECT EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.is_active
              AND r.role_name = 'deputy_committee_leader'
              AND ur.committee_id = p_committee_id
        ) INTO v_occupied;

    ELSIF p_role_name = 'department_head' THEN
        IF p_department_id IS NULL THEN RETURN true; END IF;
        SELECT EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.is_active
              AND r.role_name = 'department_head'
              AND ur.department_id = p_department_id
        ) INTO v_occupied;

    ELSE
        RETURN true;
    END IF;

    RETURN NOT v_occupied;
END;
$$;

GRANT EXECUTE ON FUNCTION is_target_position_vacant(TEXT, INTEGER, INTEGER) TO authenticated;

-- =========================================================
-- (ب) Trigger: منع إنشاء/تعديل انتخاب لمنصب مشغول
-- =========================================================
CREATE OR REPLACE FUNCTION enforce_vacant_target()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- على UPDATE: تحقق فقط إذا تغيّر الهدف (التريغر elections_lock_targets
    -- يمنع تغيير الأهداف بعد الإنشاء عادةً — هذا الفحص دفاعي)
    IF TG_OP = 'UPDATE' THEN
        IF NEW.target_role_name = OLD.target_role_name
           AND NEW.target_committee_id IS NOT DISTINCT FROM OLD.target_committee_id
           AND NEW.target_department_id IS NOT DISTINCT FROM OLD.target_department_id THEN
            RETURN NEW;
        END IF;
    END IF;

    IF NOT is_target_position_vacant(
        NEW.target_role_name,
        NEW.target_committee_id,
        NEW.target_department_id
    ) THEN
        RAISE EXCEPTION 'لا يمكن إنشاء انتخاب لمنصب مشغول حالياً — المنصب له شاغل نشط بالفعل';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS elections_vacant_target ON elections;
CREATE TRIGGER elections_vacant_target
    BEFORE INSERT OR UPDATE ON elections
    FOR EACH ROW EXECUTE FUNCTION enforce_vacant_target();

-- =========================================================
-- (ج) RPC مساعد للواجهة: قائمة المناصب المشغولة
-- تُستخدم لتعطيل الخيارات في نموذج إنشاء الانتخاب
-- =========================================================
CREATE OR REPLACE FUNCTION get_occupied_positions()
RETURNS TABLE (
    role_name      TEXT,
    committee_id   INTEGER,
    department_id  INTEGER
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT r.role_name::TEXT, ur.committee_id, ur.department_id
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.is_active
      AND r.role_name IN ('committee_leader','deputy_committee_leader','department_head');
$$;

GRANT EXECUTE ON FUNCTION get_occupied_positions() TO authenticated;
