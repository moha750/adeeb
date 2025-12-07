-- =====================================================
-- إصلاح مشكلة Triggers القديمة
-- =====================================================
-- المشكلة: Trigger قديم يحاول الوصول لجدول admins الذي لم يعد موجوداً
-- الحل: حذف أو تحديث الـ Triggers القديمة
-- =====================================================

-- الخطوة 1: عرض جميع الـ Triggers على جدول members
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'members'
AND trigger_schema = 'public';

-- الخطوة 2: حذف الـ Trigger القديم
DROP TRIGGER IF EXISTS sync_member_admin_data_trigger ON public.members;
DROP TRIGGER IF EXISTS sync_admin_data ON public.members;
DROP TRIGGER IF EXISTS update_member_admin ON public.members;

-- الخطوة 3: حذف الدالة القديمة
DROP FUNCTION IF EXISTS sync_member_admin_data() CASCADE;
DROP FUNCTION IF EXISTS sync_admin_data() CASCADE;
DROP FUNCTION IF EXISTS update_member_admin() CASCADE;

-- الخطوة 4: إنشاء دالة جديدة محدثة (إذا لزم الأمر)
CREATE OR REPLACE FUNCTION sync_member_to_admin_users()
RETURNS TRIGGER AS $$
BEGIN
    -- تحديث بيانات admin_users عند تحديث members
    IF NEW.user_id IS NOT NULL AND NEW.user_id != OLD.user_id THEN
        UPDATE public.admin_users
        SET user_id = NEW.user_id,
            updated_at = NOW()
        WHERE member_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- الخطوة 5: إنشاء Trigger جديد
DROP TRIGGER IF EXISTS sync_member_to_admin_users_trigger ON public.members;

CREATE TRIGGER sync_member_to_admin_users_trigger
    AFTER UPDATE OF user_id ON public.members
    FOR EACH ROW
    WHEN (NEW.user_id IS DISTINCT FROM OLD.user_id)
    EXECUTE FUNCTION sync_member_to_admin_users();

-- =====================================================
-- التحقق من نجاح الإصلاح
-- =====================================================

-- عرض الـ Triggers الحالية
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'members'
AND trigger_schema = 'public';

RAISE NOTICE '✅ تم إصلاح الـ Triggers القديمة بنجاح!';
