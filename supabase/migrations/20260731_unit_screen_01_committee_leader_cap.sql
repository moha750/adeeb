-- «وحدتي» — قائد اللجنة ينال مفتاح بابه
--
-- `can_assign_role` تسمح منذ يومها لقائد الوحدة بإسناد دور عضوها **في وحدته** (`t.id = u.id`)،
-- وقائد اللجنة وحدةٌ كقائد الإدارة. لكنّ القدرة `assign_unit_members` — مفتاحُ الباب في
-- اللوحة — كانت لقائدَي الإدارتين وحدهما، فسلطةٌ ممنوحةٌ في القاعدة بلا بابٍ يبلغها.
--
-- ولا توسيعَ في هذا: المفتاح يفتح **الشاشة**، و`can_assign_role` وحدها تقرّر الغرفة —
-- فقائد التصميم لا يبلغ لجنة التصوير ولا دورًا غير `committee_member` ولو كتب المسار بيده.

insert into role_permissions (role_id, role_name, permission_id)
select r.id, r.role_name, p.id
from roles r, permissions p
where r.role_name = 'committee_leader'
  and p.permission_key = 'assign_unit_members'
  and not exists (
    select 1 from role_permissions rp
    where rp.role_name = r.role_name and rp.permission_id = p.id
  );
