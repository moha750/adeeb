-- قدرة حاكمة للوحة الصلاحيات نفسها (dogfooding: مَن يدير الصلاحيات تحكمه قدرة، لا رقم ولا اسم محفور).
-- تُمنح لمجموعة الحوكمة العليا (is_top_admin_role) بدايةً؛ تُوسَّع/تُضيَّق لاحقًا من اللوحة ذاتها.
insert into permissions (permission_key, permission_name_ar, category)
select 'manage_permissions', 'إدارة الصلاحيات', 'admin'
where not exists (select 1 from permissions where permission_key = 'manage_permissions');

insert into role_permissions (role_id, permission_id)
select r.id, p.id
from roles r cross join permissions p
where p.permission_key = 'manage_permissions'
  and r.role_name in ('club_president','president_advisor','executive_council_president','hr_committee_leader')
  and not exists (select 1 from role_permissions rp where rp.role_id = r.id and rp.permission_id = p.id);
