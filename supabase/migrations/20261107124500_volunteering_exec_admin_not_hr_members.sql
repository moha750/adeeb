-- التطوّع (قرار المالك ٢٠٢٦-١١-٠٧) — مخالفةٌ مؤقّتةٌ للدستور بطلبه («لمدّة يومين»)
--
-- ١. نُزع `manage_volunteering` من أعضاء إدارة الموارد البشريّة (`hr_admin_member`) نزعًا كاملًا
--    (أُعطوه في 20260924180000). يخالف المادّة ٦١ من مسوّدة الدستور التي تسمّيهم.
-- ٢. أُعطي عضو الإدارة التنفيذيّة (`exec_admin_member`) القفلَ كاملًا كالرئيسين، **منحًا فرديًّا مؤقّتًا**
--    في `user_specific_permissions` ينتهي 2026-11-09 15:53 بتوقيت الرياض، لا منحًا على الدور.
--    يخالف المادّة ١٧ من الدستور والمادّة ١٨ من نظام المناصب (لا سلطة لها على الأشخاص).
--    وإهداءُ العضويّة باقٍ للثلاثة (الرئيسان وقائد الموارد).
-- بعد انقضاء المنح يبقى القفل عند الرئيسين وقائد الموارد وحدهم، حتّى يحسم المالك أحد الخيارات
-- (إرجاع أعضاء الموارد، أو تعديل المسوّدات، أو قسمة القفل).

delete from public.role_permissions rp
using public.permissions p
where rp.permission_id = p.id
  and p.permission_key = 'manage_volunteering'
  and rp.role_name in ('hr_admin_member', 'exec_admin_member');

insert into public.user_specific_permissions (user_id, permission_id, is_granted, granted_by, expires_at)
select ur.user_id, p.id, true,
       (select id from auth.users where email = 'mohammad.bin.ismael@gmail.com'),
       timestamptz '2026-11-09 15:53:00+03'
from public.user_roles ur
cross join public.permissions p
where ur.role_name = 'exec_admin_member' and ur.is_active and p.permission_key = 'manage_volunteering';
