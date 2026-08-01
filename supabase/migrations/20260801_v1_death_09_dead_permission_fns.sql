-- موت V1 — البند ٩ (انكشف 2026-08-01): إعدام دالّتَي منح القدرة وسحبها
--
-- ═══ العلّة ═══
--
-- `grant_permission_to_role` و`revoke_permission_from_role` ليستا دالّتَين
-- معطَّلتَين بل **جثّتَين**: لا يمكن أن تنجح إحداهما بحالٍ من الأحوال.
--
--   • تكتبان في `public.permissions_audit_log` — **وهو غير موجود في القاعدة**.
--   • وتُسنِدان `scope` · `conditions` · `granted_at` · `granted_by` — وليست
--     أعمدةً في `role_permissions`. أعمدته: `role_name` · `permission_id` ·
--     `created_at` (وكان معها `role_id` حتّى ترحيل البند ١).
--   • وهدف `on conflict` كان `(role_id, permission_id, scope)` ولا فهرس فريدًا
--     يطابقه — فحتّى الإدراج كان يفشل قبل بلوغ التدقيق.
--
-- وإنّما لم تُكتشف لأنّ `plpgsql` لا يتحقّق من الجداول والأعمدة إلّا وقت النداء،
-- ولم يُنادَ منذ عهد V1. ولم تظهر إلّا حين رُحّلتا إلى الاسم في ملفّ ٠٠ فقُرئ
-- جسداهما حرفًا بحرف.
--
-- ═══ من يحلّ محلّهما ═══
--
-- تبويب الصلاحيات في V2 (`dashboard/system/permissions/actions.ts`) يكتب في
-- `role_permissions` مباشرةً بالاسم، ويحرسه `manage_permissions` وحارسُ «آخر
-- مانح». فالمعنى له مصدرٌ واحد حيّ، وهاتان بابان مسدودان يوهمان بوجود ثالث.
--
-- ═══ التحقّق قبل الإعدام ═══
--
--   • V2 ودوالّ الحافّة: صفر نداء.
--   • القاعدة: صفر دالّة وصفر تريغر وصفر سياسة تذكرهما.

begin;

drop function if exists public.grant_permission_to_role(integer, text, text, uuid, jsonb);
drop function if exists public.revoke_permission_from_role(integer, text, text, uuid);

commit;

-- ═══ التحقّق بعد التنفيذ ═══
--
--   select proname from pg_proc
--    where proname in ('grant_permission_to_role','revoke_permission_from_role');
--   → صفر صفوف.
--
-- وبهذا لم يبقَ في القاعدة كلّها ذِكرٌ لـ`role_id` على `user_roles` أو
-- `role_permissions` — لا عمودًا ولا وسيطًا ولا سطرًا في جسد دالّة.
