-- =====================================================
-- إعادة إنشاء الـ Triggers بشكل محدث
-- =====================================================
-- هذا السكريبت يعيد إنشاء الـ Triggers لكن بشكل محدث
-- يعمل مع الجداول الجديدة (admin_users بدلاً من admins)
-- =====================================================

-- ═══════════════════════════════════════════════════
-- 1. دالة مزامنة بيانات العضو مع admin_users
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION sync_member_admin_data()
RETURNS TRIGGER AS $$
BEGIN
    -- تحديث admin_users عند تحديث user_id في members
    IF NEW.user_id IS NOT NULL AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
        UPDATE public.admin_users
        SET user_id = NEW.user_id,
            updated_at = NOW()
        WHERE member_id = NEW.id
        AND user_id != NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_member_admin_data_trigger
    AFTER UPDATE OF user_id ON public.members
    FOR EACH ROW
    WHEN (NEW.user_id IS DISTINCT FROM OLD.user_id)
    EXECUTE FUNCTION sync_member_admin_data();

RAISE NOTICE '✅ تم إنشاء: sync_member_admin_data_trigger';

-- ═══════════════════════════════════════════════════
-- 2. دالة منع تحديث الحقول الحساسة (محدثة)
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION prevent_sensitive_fields_update()
RETURNS TRIGGER AS $$
DECLARE
    is_admin BOOLEAN;
BEGIN
    -- التحقق من أن المستخدم الحالي هو super_admin
    SELECT EXISTS (
        SELECT 1 FROM public.admin_users  -- ← محدث: admin_users بدلاً من admins
        WHERE admin_users.user_id = auth.uid()
        AND admin_users.role = 'super_admin'  -- ← محدث: role بدلاً من is_admin
        AND admin_users.is_active = true
    ) INTO is_admin;
    
    -- إذا لم يكن super_admin، منع تحديث الحقول الحساسة
    IF NOT is_admin THEN
        -- منع تحديث user_id
        IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
            RAISE EXCEPTION 'غير مصرح لك بتحديث user_id';
        END IF;
        
        -- منع تحديث email (اختياري)
        IF NEW.email IS DISTINCT FROM OLD.email THEN
            RAISE EXCEPTION 'غير مصرح لك بتحديث البريد الإلكتروني';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER prevent_sensitive_fields_update_trigger
    BEFORE UPDATE ON public.members
    FOR EACH ROW
    EXECUTE FUNCTION prevent_sensitive_fields_update();

RAISE NOTICE '✅ تم إنشاء: prevent_sensitive_fields_update_trigger';

-- ═══════════════════════════════════════════════════
-- 3. دالة مزامنة بيانات الأعضاء (محدثة)
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION sync_admin_data()
RETURNS TRIGGER AS $$
BEGIN
    -- عند تحديث بيانات العضو، تحديث updated_at في admin_users
    IF EXISTS (SELECT 1 FROM public.admin_users WHERE member_id = NEW.id) THEN
        UPDATE public.admin_users
        SET updated_at = NOW()
        WHERE member_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_admin_data
    AFTER UPDATE ON public.members
    FOR EACH ROW
    EXECUTE FUNCTION sync_admin_data();

RAISE NOTICE '✅ تم إنشاء: sync_admin_data';

-- ═══════════════════════════════════════════════════
-- التحقق من إنشاء الـ Triggers
-- ═══════════════════════════════════════════════════

SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    'members' as table_name
FROM information_schema.triggers
WHERE event_object_table = 'members'
AND trigger_schema = 'public'
ORDER BY trigger_name;

RAISE NOTICE '';
RAISE NOTICE '✅ تم إعادة إنشاء جميع الـ Triggers بنجاح!';
RAISE NOTICE 'ℹ️  الـ Triggers الآن تعمل مع الجداول الجديدة (admin_users)';
