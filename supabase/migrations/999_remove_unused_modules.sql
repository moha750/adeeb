-- ============================================================================
-- إزالة جذرية ونهائية للتبويبات غير المستخدمة
-- Migration 999
-- ============================================================================
-- التبويبات المراد حذفها: المشاريع، المهام، الاجتماعات، التقارير
-- ============================================================================

-- ============================================================================
-- 1. حذف الجداول المرتبطة بالمهام
-- ============================================================================

-- حذف جدول مرفقات المهام
DROP TABLE IF EXISTS public.task_attachments CASCADE;

-- حذف جدول تعليقات المهام
DROP TABLE IF EXISTS public.task_comments CASCADE;

-- حذف جدول المهام
DROP TABLE IF EXISTS public.tasks CASCADE;

-- ============================================================================
-- 2. حذف الجداول المرتبطة بالمشاريع
-- ============================================================================

-- حذف جدول المشاريع
DROP TABLE IF EXISTS public.projects CASCADE;

-- ============================================================================
-- 3. حذف الجداول المرتبطة بالاجتماعات
-- ============================================================================

-- حذف جدول الحضور
DROP TABLE IF EXISTS public.attendance CASCADE;

-- حذف جدول الاجتماعات
DROP TABLE IF EXISTS public.meetings CASCADE;

-- ============================================================================
-- 4. حذف جدول التقارير
-- ============================================================================

-- حذف جدول التقارير
DROP TABLE IF EXISTS public.reports CASCADE;

-- ============================================================================
-- 5. حذف الصلاحيات المرتبطة بالتبويبات المحذوفة
-- ============================================================================

-- حذف صلاحيات المشاريع
DELETE FROM public.role_permissions 
WHERE permission_id IN (
    SELECT id FROM public.permissions 
    WHERE permission_name LIKE '%project%' 
    OR category = 'projects'
);

DELETE FROM public.permissions 
WHERE permission_name LIKE '%project%' 
OR category = 'projects';

-- حذف صلاحيات المهام
DELETE FROM public.role_permissions 
WHERE permission_id IN (
    SELECT id FROM public.permissions 
    WHERE permission_name LIKE '%task%' 
    OR category = 'tasks'
);

DELETE FROM public.permissions 
WHERE permission_name LIKE '%task%' 
OR category = 'tasks';

-- حذف صلاحيات الاجتماعات
DELETE FROM public.role_permissions 
WHERE permission_id IN (
    SELECT id FROM public.permissions 
    WHERE permission_name LIKE '%meeting%' 
    OR category = 'meetings'
);

DELETE FROM public.permissions 
WHERE permission_name LIKE '%meeting%' 
OR category = 'meetings';

-- حذف صلاحيات التقارير
DELETE FROM public.role_permissions 
WHERE permission_id IN (
    SELECT id FROM public.permissions 
    WHERE permission_name LIKE '%report%' 
    OR category = 'reports'
);

DELETE FROM public.permissions 
WHERE permission_name LIKE '%report%' 
OR category = 'reports';

-- ============================================================================
-- 6. تنظيف سجل الأنشطة من الإشارات للتبويبات المحذوفة
-- ============================================================================

DELETE FROM public.activity_log 
WHERE target_type IN ('task', 'project', 'meeting', 'report');

-- ============================================================================
-- 7. تنظيف الإشعارات المرتبطة
-- ============================================================================

DELETE FROM public.notifications 
WHERE notification_type IN ('task', 'meeting');

-- ============================================================================
-- رسالة تأكيد
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ تم حذف التبويبات التالية بشكل نهائي:';
    RAISE NOTICE '   ❌ المشاريع (projects)';
    RAISE NOTICE '   ❌ المهام (tasks)';
    RAISE NOTICE '   ❌ الاجتماعات (meetings)';
    RAISE NOTICE '   ❌ التقارير (reports)';
    RAISE NOTICE '';
    RAISE NOTICE '📊 تم حذف:';
    RAISE NOTICE '   - جميع الجداول المرتبطة';
    RAISE NOTICE '   - جميع الصلاحيات المرتبطة';
    RAISE NOTICE '   - جميع السجلات والإشعارات المرتبطة';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ هذا الإجراء نهائي ولا يمكن التراجع عنه';
END $$;
