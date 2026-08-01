-- فصل الإشراف عن الانتماء — المرحلة ٢: ترحيل الصفوف الحيّة
--
-- كلّ صفٍّ قديم يلد حقيقتيه: انتماءً إلى الإدارة (يُطوى إلى صفٍّ واحدٍ لكلّ شخص)،
-- وإشرافًا على لجنته (صفٌّ في `committee_supervision`). ثمّ يُطفأ الصفّ القديم ولا يُحذف.
-- لا أحد يختفي ولا يظهر أحد؛ والعدد يُتحقّق منه بعد التنفيذ.
--
-- الترتيب مقصود: الانتماء أوّلًا، لأنّ حارس `committee_supervision` يشترط أن يكون
-- المشرف عضوًا في إدارته — وهو الشرط الذي لم يكن يمكن كتابته قبل الفصل.

-- ١) الانتماء — صفٌّ واحدٌ لكلّ شخصٍ على إدارته الأمّ، بتاريخ أوّل إسنادٍ له (فهو تاريخ انضمامه)
with src as (
  select
    ur.user_id,
    ur.role_id,
    ur.role_name,
    r.home_committee_id                                     as unit_id,
    min(ur.assigned_at)                                     as first_at,
    (array_agg(ur.assigned_by order by ur.assigned_at))[1]  as first_by
  from user_roles ur
  join roles r on r.id = ur.role_id
  where ur.is_active
    and ur.role_name in ('hr_admin_member', 'qa_admin_member')
    and r.home_committee_id is not null
    and ur.committee_id is distinct from r.home_committee_id
  group by 1, 2, 3, 4
)
insert into user_roles (user_id, role_id, role_name, committee_id, is_active, assigned_by, assigned_at, notes)
select s.user_id, s.role_id, s.role_name, s.unit_id, true, s.first_by, s.first_at,
       'انتماءٌ استُخرج من صفوف الإشراف عند فصل الإشراف عن الانتماء (20260731).'
from src s
where not exists (
  select 1 from user_roles x
  where x.user_id = s.user_id and x.role_id = s.role_id and x.committee_id = s.unit_id
);

-- ٢) الإشراف — صفٌّ لكلّ لجنةٍ كان يشرف عليها
insert into committee_supervision (committee_id, unit_id, supervisor_id, assigned_by, assigned_at, notes)
select ur.committee_id, r.home_committee_id, ur.user_id, ur.assigned_by, ur.assigned_at,
       'مُرحَّلٌ من user_roles عند فصل الإشراف عن الانتماء (20260731).'
from user_roles ur
join roles r on r.id = ur.role_id
where ur.is_active
  and ur.role_name in ('hr_admin_member', 'qa_admin_member')
  and r.home_committee_id is not null
  and ur.committee_id is distinct from r.home_committee_id
on conflict (committee_id, unit_id) do nothing;

-- ٣) الصفّ القديم يُطفأ — أثرُه محفوظٌ في الحقيقتين أعلاه
update user_roles ur
set is_active = false
from roles r
where r.id = ur.role_id
  and ur.is_active
  and ur.role_name in ('hr_admin_member', 'qa_admin_member')
  and r.home_committee_id is not null
  and ur.committee_id is distinct from r.home_committee_id;
