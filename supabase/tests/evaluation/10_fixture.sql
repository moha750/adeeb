-- هيكلٌ يشبه أدِيب الحيّ، بأشخاصٍ وهميّين. المعرّف `u(n)` = 00000000-0000-0000-0000-0000000000nn.
create or replace function u(n int) returns uuid language sql immutable as
$$ select ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid $$;

insert into roles (role_name, role_name_ar, holder_uniqueness, home_committee_id, removal_needs_club_president) values
 ('club_president','رئيس أدِيب','global',null,false), ('hr_committee_leader','قائد','global',22,true),
 ('qa_committee_leader','قائد','global',23,true), ('hr_admin_member','عضو','multi',22,false),
 ('qa_admin_member','عضو','multi',23,false), ('executive_council_president','الرئيس التنفيذي','global',null,false),
 ('committee_leader','قائد','per_committee',null,false), ('deputy_committee_leader','نائب','per_committee',null,false),
 ('committee_member','عضو','multi',null,false), ('department_head','منسّق','per_department',null,false),
 ('adeeb_admin','أَدِيب','global',null,false), ('exec_admin_member','عضو','multi',37,false);

insert into councils (id, name_ar) values ('executive','المجلس التشغيلي'), ('administrative','المجلس الإداري');
insert into departments (id, name_ar) values (1,'قسم الإنتاج'), (2,'قسم الفعاليات'), (3,'قسم بلا لجان');
insert into committees (id, committee_name_ar, department_id, council_id, leader_role_name, member_role_name, supervises) values
 (1,'لجنة التصوير',1,'executive','committee_leader','committee_member',false),
 (2,'لجنة التأليف',1,'executive','committee_leader','committee_member',false),
 (3,'لجنة التنظيم',2,'executive','committee_leader','committee_member',false),
 (4,'لجنة مغلقة',2,'executive','committee_leader','committee_member',false),
 (22,'إدارة الموارد البشرية',null,'administrative','hr_committee_leader','hr_admin_member',true),
 (23,'إدارة الضمان والجودة',null,'administrative','qa_committee_leader','qa_admin_member',true),
 (37,'الإدارة التنفيذية',null,'administrative','executive_council_president','exec_admin_member',false);
update committees set is_active = false where id = 4;

insert into profiles (id, full_name, joined_date, gender, account_status)
select u(n), 'عضو رقم ' || n, date '2025-09-01', case when n % 2 = 0 then 'male' else 'female' end,
       case when n = 17 then 'suspended' else 'active' end
from unnest(array[1,2,3,5,6,10,11,12,13,14,15,16,17,20,21,22,30,40,41,99]) n;
insert into auth.users select id from profiles;

-- كلُّ صفٍّ بتاريخ إسنادٍ قديم، إلّا قائد التأليف (أُسند قبل الموعد بأقلّ من 4 أسابيع)
insert into user_roles (user_id, role_name, committee_id, department_id, assigned_at, is_active) values
 (u(1),'club_president',null,null,'2025-09-01',true),
 (u(2),'executive_council_president',null,null,'2025-09-01',true),
 (u(3),'hr_committee_leader',22,null,'2025-09-01',true),
 (u(5),'hr_admin_member',22,null,'2025-09-01',true),
 (u(6),'qa_admin_member',23,null,'2025-09-01',true),
 (u(10),'committee_leader',1,null,'2026-01-01',true),
 (u(11),'deputy_committee_leader',1,null,'2026-01-01',true),
 (u(12),'committee_member',1,null,'2026-01-01',true),
 (u(13),'committee_member',1,null,'2026-01-01',true),
 (u(14),'committee_member',1,null,'2026-01-01',true),
 (u(15),'committee_member',1,null,'2026-01-01',true),
 (u(17),'committee_member',1,null,'2026-01-01',true),
 (u(20),'committee_leader',2,null,now() - interval '10 days',true),
 (u(21),'committee_member',2,null,'2026-01-01',true),
 (u(22),'committee_member',2,null,'2026-01-01',true),
 (u(30),'committee_leader',3,null,'2026-01-01',true),
 (u(40),'committee_member',3,null,'2025-09-01',false),     -- تاريخُ عضويّةٍ سابقة يعود إليها
 (u(40),'department_head',null,2,'2026-01-01',true),
 (u(41),'department_head',null,1,'2026-01-01',true),        -- منسّقٌ لا لجنةَ سابقةَ له
 (u(16),'committee_member',4,null,'2026-01-01',true),       -- في لجنةٍ مغلقة
 (u(99),'adeeb_admin',null,null,'2025-09-01',true);
-- العضو 15 مكلَّفٌ بقيادة الضمان (شاغرة) وهو عضوٌ في التصوير: له الشقّان، فيقيّم من المجلس
insert into user_roles (user_id, role_name, committee_id, is_acting, acting_until) values (u(15),'qa_committee_leader',23,true,'2027-06-30');
-- العضو 17 معلَّق: `guard_live_member_has_seat` لا يحرسه، و`is_adeeb_member` يُخرجه

-- عضوا الموارد والضمان يشرفان على لجنة التصوير
insert into committee_supervision (committee_id, unit_id, supervisor_id) values (1, 22, u(5)), (1, 23, u(6));

insert into position_authority (role_name, target_roles) values
 ('club_president', array['committee_leader','deputy_committee_leader','department_head','committee_member']);

-- القدرات كما في الترحيل ٠١ (منسوخةٌ هنا لأنّ الترحيل يُطبَّق قبل الأدوار في الاختبار)
insert into permissions (permission_key, permission_name_ar, category) values
 ('manage_leader_evaluation','x','membership'), ('view_leader_evaluation_results','x','membership')
on conflict do nothing;
insert into role_permissions (role_name, permission_id)
select r, p.id from permissions p, unnest(array['club_president','executive_council_president','hr_committee_leader']) r
where p.permission_key = 'manage_leader_evaluation' on conflict do nothing;
