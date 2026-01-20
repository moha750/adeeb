-- =====================================================
-- إزالة نظام الإعلانات بالكامل من قاعدة البيانات
-- =====================================================

-- حذف جميع السياسات
DROP POLICY IF EXISTS "announcements_select_policy" ON public.announcements;
DROP POLICY IF EXISTS "announcements_insert_policy" ON public.announcements;
DROP POLICY IF EXISTS "announcements_update_policy" ON public.announcements;
DROP POLICY IF EXISTS "announcements_delete_policy" ON public.announcements;
DROP POLICY IF EXISTS "announcements_select_all" ON public.announcements;
DROP POLICY IF EXISTS "announcements_insert_all" ON public.announcements;
DROP POLICY IF EXISTS "announcements_update_all" ON public.announcements;
DROP POLICY IF EXISTS "announcements_delete_all" ON public.announcements;

-- حذف الدوال المتعلقة بالإعلانات
DROP FUNCTION IF EXISTS public.can_manage_announcements();
DROP FUNCTION IF EXISTS public.can_delete_announcements();

-- حذف الفهارس
DROP INDEX IF EXISTS public.idx_announcements_target_audience;
DROP INDEX IF EXISTS public.idx_announcements_published_at;
DROP INDEX IF EXISTS public.idx_announcements_is_pinned;

-- حذف الجدول
DROP TABLE IF EXISTS public.announcements CASCADE;

-- تأكيد الحذف
SELECT 'تم حذف نظام الإعلانات بالكامل من قاعدة البيانات' as status;
