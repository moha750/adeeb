-- =====================================================
-- حذف جميع الـ Triggers القديمة المرتبطة بجدول admins
-- =====================================================
-- هذا السكريبت يحذف جميع الـ Triggers والدوال التي تستخدم جدول admins القديم
-- =====================================================

-- عرض جميع الـ Triggers على جدول members
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'members'
AND trigger_schema = 'public';

-- ═══════════════════════════════════════════════════
-- حذف جميع الـ Triggers المعروفة
-- ═══════════════════════════════════════════════════

-- Trigger 1: sync_member_admin_data
DROP TRIGGER IF EXISTS sync_member_admin_data_trigger ON public.members CASCADE;
DROP FUNCTION IF EXISTS sync_member_admin_data() CASCADE;

-- Trigger 2: sync_admin_data
DROP TRIGGER IF EXISTS sync_admin_data ON public.members CASCADE;
DROP FUNCTION IF EXISTS sync_admin_data() CASCADE;

-- Trigger 3: update_member_admin
DROP TRIGGER IF EXISTS update_member_admin ON public.members CASCADE;
DROP FUNCTION IF EXISTS update_member_admin() CASCADE;

-- Trigger 4: prevent_sensitive_fields_update (المشكلة الحالية)
DROP TRIGGER IF EXISTS prevent_sensitive_fields_update ON public.members CASCADE;
DROP TRIGGER IF EXISTS prevent_sensitive_fields_update_trigger ON public.members CASCADE;
DROP FUNCTION IF EXISTS prevent_sensitive_fields_update() CASCADE;

-- Trigger 5: أي triggers أخرى قد تكون موجودة
DROP TRIGGER IF EXISTS check_admin_permission ON public.members CASCADE;
DROP TRIGGER IF EXISTS validate_admin ON public.members CASCADE;
DROP TRIGGER IF EXISTS sync_admins ON public.members CASCADE;

-- ═══════════════════════════════════════════════════
-- حذف الدوال القديمة المرتبطة بـ admins
-- ═══════════════════════════════════════════════════

DROP FUNCTION IF EXISTS check_is_admin() CASCADE;
DROP FUNCTION IF EXISTS check_admin_exists() CASCADE;
DROP FUNCTION IF EXISTS validate_admin_user() CASCADE;
DROP FUNCTION IF EXISTS sync_admin_member() CASCADE;

RAISE NOTICE '✅ تم حذف جميع الـ Triggers والدوال القديمة';

-- ═══════════════════════════════════════════════════
-- التحقق من عدم وجود triggers متبقية
-- ═══════════════════════════════════════════════════

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM information_schema.triggers
    WHERE event_object_table = 'members'
    AND trigger_schema = 'public';
    
    IF v_count = 0 THEN
        RAISE NOTICE '✅ لا توجد triggers متبقية على جدول members';
    ELSE
        RAISE WARNING '⚠️ يوجد % triggers متبقية على جدول members', v_count;
    END IF;
END $$;

-- عرض الـ Triggers المتبقية (إن وجدت)
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'members'
AND trigger_schema = 'public';
