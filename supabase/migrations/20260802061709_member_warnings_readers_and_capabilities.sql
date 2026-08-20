-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260802061709   الاسم: member_warnings_readers_and_capabilities

-- مرايا القراءة والقدرتان (٢٠٢٦-٠٨-٠٢)

-- سجلّ الإنذارات كما يراه هذا القارئ — الترشيح في القاعدة لا في الواجهة، فمفتاح الخدمة
-- يتجاوز RLS. والترتيب (الأوّل/الثاني/الثالث) يُحسب هنا من السواري وحدها.
create or replace function public.warnings_for_reader(p_actor uuid)
 returns table(
   id uuid, user_id uuid, member_name text, member_avatar text, member_gender text,
   member_status text, committee_id integer, committee_name text,
   role_at_issue text, role_ar text, category text, reason text, occurred_on date,
   status text, created_at timestamptz, issuer_name text,
   cancelled_at timestamptz, cancel_reason text, canceller_name text,
   caused_termination boolean, ordinal integer, active_count integer, may_manage boolean
 )
 language sql stable security definer set search_path to 'public'
as $$
  with visible as (
    select w.* from member_warnings w where can_view_warnings_of(p_actor, w.user_id)
  ), ranked as (
    select v.*,
      case when v.status = 'active'
        then row_number() over (partition by v.user_id, v.status order by v.created_at)
      end as ord
    from visible v
  )
  select r.id, r.user_id, p.full_name, p.avatar_url, p.gender, p.account_status,
         r.committee_id, c.committee_name_ar, r.role_at_issue, ro.role_name_ar,
         r.category, r.reason, r.occurred_on, r.status, r.created_at, ip.full_name,
         r.cancelled_at, r.cancel_reason, cp.full_name, r.caused_termination,
         r.ord::integer,
         (select count(*)::integer from member_warnings a where a.user_id = r.user_id and a.status = 'active'),
         can_issue_warning(p_actor, r.user_id)
  from ranked r
  join profiles p on p.id = r.user_id
  left join committees c on c.id = r.committee_id
  left join roles ro on ro.role_name = r.role_at_issue
  left join profiles ip on ip.id = r.issued_by
  left join profiles cp on cp.id = r.cancelled_by
  order by r.created_at desc;
$$;

-- من يبلغهم إنذارُ هذا الفاعل — مرآةٌ للواجهة (كـ`members_in_my_reach`)
create or replace function public.members_i_may_warn(p_actor uuid)
 returns table(user_id uuid, name text, committee_id integer, committee_name text,
               role_ar text, active_count integer)
 language sql stable security definer set search_path to 'public'
as $$
  select p.id, p.full_name, ur.committee_id, c.committee_name_ar, ro.role_name_ar,
         (select count(*)::integer from member_warnings w where w.user_id = p.id and w.status = 'active')
  from profiles p
  left join lateral (
    select u.committee_id, u.role_name from user_roles u
    where u.user_id = p.id and u.is_active
    order by (u.committee_id is not null) desc, u.assigned_at limit 1
  ) ur on true
  left join committees c on c.id = ur.committee_id
  left join roles ro on ro.role_name = ur.role_name
  where p.account_status = 'active' and can_issue_warning(p_actor, p.id);
$$;

-- القدرتان: بابُ الغرفة وفعلُها
insert into public.permissions (permission_key, permission_name_ar, description, category)
values
  ('view_warnings', 'سجلّ الإنذارات', 'الاطّلاع على سجلّ إنذارات الأعضاء', 'membership'),
  ('manage_warnings', 'إصدار الإنذارات', 'إصدار الإنذارات وإلغاؤها', 'membership')
on conflict (permission_key) do nothing;

insert into public.role_permissions (role_name, permission_id)
select v.role_name, p.id
from (values
  ('club_president', 'view_warnings'),
  ('executive_council_president', 'view_warnings'),
  ('hr_committee_leader', 'view_warnings'),
  ('hr_admin_member', 'view_warnings'),
  ('hr_committee_leader', 'manage_warnings'),
  ('hr_admin_member', 'manage_warnings')
) as v(role_name, key)
join public.permissions p on p.permission_key = v.key
on conflict do nothing;
