-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260721200909   الاسم: eradicate_impersonation_system


-- استئصال نظام الانتحال (impersonation) بالكامل من القاعدة.
-- لا كود حيّ يستعمله؛ سجلّ activity_log التاريخيّ (96 صفًّا) يُترك عمدًا.

-- 1) الدوالّ الستّ
DROP FUNCTION IF EXISTS public.start_impersonation(uuid, text);
DROP FUNCTION IF EXISTS public.end_impersonation(uuid);
DROP FUNCTION IF EXISTS public.verify_impersonation_access(uuid);
DROP FUNCTION IF EXISTS public.impersonate_read(uuid, text, text);
DROP FUNCTION IF EXISTS public.get_active_impersonation();
DROP FUNCTION IF EXISTS public.get_impersonation_history(integer, integer);

-- 2) الجدولان (تسقط معهما سياسات RLS الستّ والمنح)
DROP TABLE IF EXISTS public.impersonation_sessions CASCADE;
DROP TABLE IF EXISTS public.admin_impersonation_logs CASCADE;

-- 3) الصلاحية ورابطها بالأدوار
DELETE FROM public.role_permissions WHERE permission_id = 17;
DELETE FROM public.permissions      WHERE permission_key = 'impersonate_users';

