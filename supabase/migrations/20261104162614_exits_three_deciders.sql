-- ═══ طلباتُ الخروج: للرئيسين وقائد الموارد البشريّة وحدهم (محمد ٢٠٢٦-١١-٠٤) ══════════════════════════
-- «الدخولُ إلى تبويب طلبات الخروج، وأساسًا ظهورُ التبويب، والقضاءُ فيه يعود فقط للرئيسين وقائد الموارد البشريّة.»
-- كان القفلُ `view_members` (ويحمله قائدُ الضمان أيضًا)، وكان قائدُ الضمان من أهل القضاء: يقضي في طلبات أعضاء إدارته.
-- فصار للغرفة قدرتُها، وخرج قائدُ الضمان من القضاء كلِّه — وطلباتُ أعضاء الضمان للرئيسين وحدهما، كأعضاء الإدارة التنفيذيّة
-- (لا لقائد الموارد: إدارتُه تحت متابعة الضمان، فلا يقضي في من يتابعه).

-- ── (١) قدرةُ الغرفة: الدخولُ وظهورُ التبويب ─────────────────────────────────────────────
insert into public.permissions (permission_key, permission_name_ar, description, category)
select 'decide_membership_exits', 'طلبات الخروج',
       'غرفةُ طلبات الخروج في /dashboard/members/exits: دخولُها وظهورُها في التنقّل. ومن يقضي في كلّ طلبٍ تقوله `exit_decider_roles`', 'membership'
where not exists (select 1 from public.permissions p where p.permission_key = 'decide_membership_exits');

insert into public.role_permissions (role_name, permission_id)
select r.role_name, p.id
from (values ('club_president'), ('executive_council_president'), ('hr_committee_leader')) as r(role_name)
join public.permissions p on p.permission_key = 'decide_membership_exits'
where not exists (
  select 1 from public.role_permissions x
  where x.role_name = r.role_name and x.permission_id = p.id
);

-- ── (٢) من يقضي في طلب فلان: قائدُ الضمان خرج، وما سواه كما كان حرفًا ──────────────────────────
create or replace function public.exit_decider_roles(p_user uuid)
returns text[]
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select case
    when exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active
                   and ur.role_name = 'executive_council_president')
      then array['club_president']
    when exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active
                   and ur.role_name in ('hr_committee_leader', 'qa_committee_leader'))
      then array['club_president', 'executive_council_president']
    -- عضوُ إدارة الضمان: الرئيسان وحدَهما (كان معهما قائدُ إدارته حتى ٢٠٢٦-١١-٠٤)
    when exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active
                   and ur.role_name = 'qa_admin_member')
      then array['club_president', 'executive_council_president']
    when exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active
                   and ur.role_name = 'exec_admin_member')
      then array['club_president', 'executive_council_president']
    else array['club_president', 'executive_council_president', 'hr_committee_leader']
  end;
$$;

comment on function public.exit_decider_roles(uuid) is
  'من يقضي في طلب خروج فلان — السلطةُ تتبع مقعدَه: الرئيسُ التنفيذيّ لرئيس أدِيب، وقائدا الإدارتين وعضوا الضمان والتنفيذيّة للرئيسين، وما سواهم لقائد الموارد ومن فوقه. وقائدُ الضمان ليس من أهل القضاء (2026-11-04).';

-- ── (٣) أهذا القارئُ من أهل القضاء أصلًا؟ (سياسةُ القراءة) — الثلاثةُ وحدهم ─────────────────────────
create or replace function public.can_decide_membership_exit(p_actor uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1 from user_roles ur
    where ur.user_id = p_actor and ur.is_active
      and ur.role_name in ('club_president', 'executive_council_president', 'hr_committee_leader')
  );
$$;
