-- سلطة إنهاء العضوية — جدولٌ يُسمّي، لا حَكَمٌ مستعار
--
-- بُني أوّلَ مرّةٍ على `can_assign_role`، وكان خلطًا: **إنهاء العضوية غير نزع المنصب**.
-- قائد إدارة الضمان يُعيّن أعضاء إدارته ويزيلهم ولا يُنهي عضويّة أحد؛ وقائد إدارة الموارد
-- يُنهي العضويّة بحكم مسمّى منصبه. فعلان مختلفان لا يقيسهما حَكَمٌ واحد.
--
-- والسلطة تُكتب بالأسماء لا بالأرقام: لكلّ منصبٍ صفٌّ يقول مداه ومن يُحجب عنه (من يعلوه
-- ومن يساويه). فمن أراد تغيير السلطة غيّر صفًّا ولم يمسّ كودًا.

create table if not exists public.membership_termination_authority (
  role_name text primary key references public.roles(role_name) on update cascade on delete cascade,
  -- `all` = كلّ الأعضاء إلّا المحجوبين · `supervised` = من يشرف عليهم في لجانه وحدهم
  scope text not null check (scope in ('all', 'supervised')),
  -- الأدوار التي لا تبلغها سلطتُه (من يعلوه ومن يساويه) — بالاسم لا برقم رتبة
  blocked_roles text[] not null default '{}',
  note text
);

comment on table public.membership_termination_authority is
  'من يُنهي عضويّة من — سلطةٌ مكتوبة بالأسماء. غير سلطة الإسناد والإزالة (can_assign_role).';

insert into public.membership_termination_authority (role_name, scope, blocked_roles, note) values
  ('club_president', 'all', '{}', 'رئيس النادي — الجميع عدا نفسه'),
  ('executive_council_president', 'all',
   array['club_president', 'president_advisor'],
   'رئيس المجلس التنفيذي — الجميع عدا نفسه ورئيس النادي والمستشار'),
  ('hr_committee_leader', 'all',
   array['club_president', 'executive_council_president', 'president_advisor', 'qa_committee_leader'],
   'قائد إدارة الموارد البشرية — الجميع عدا نفسه ومن يعلوه ومن يساويه'),
  ('hr_admin_member', 'supervised', '{}',
   'عضو إدارة الموارد — أعضاء اللجان التي يشرف عليها وحدهم (لا قائدها ولا نائبها)')
on conflict (role_name) do update
  set scope = excluded.scope, blocked_roles = excluded.blocked_roles, note = excluded.note;

alter table public.membership_termination_authority enable row level security;

drop policy if exists mta_read on public.membership_termination_authority;
create policy mta_read on public.membership_termination_authority for select using (true);
-- لا سياسة كتابة: السلطة تُغيَّر بهجرةٍ لا من اللوحة (تغييرُها تغييرٌ في اللائحة لا في البيانات)

-- ═══ الحَكَم — يقرأ الجدول وحده ═══
create or replace function public.can_end_membership(p_actor uuid, p_target uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    p_actor is not null and p_target is not null
    -- لا يُنهي أحدٌ عضويّة نفسه — مهما بلغت سلطته
    and p_actor <> p_target
    and exists (
      select 1
      from user_roles a
      join membership_termination_authority t on t.role_name = a.role_name
      where a.user_id = p_actor and a.is_active
        and case t.scope
          -- سلطةٌ عامّة: يبلغ كلّ عضوٍ لا يحمل دورًا محجوبًا عنه (المحجوب يحمي صاحبه كلّه)
          when 'all' then not exists (
            select 1 from user_roles v
            where v.user_id = p_target and v.is_active
              and v.role_name = any (t.blocked_roles)
          )
          -- سلطةُ إشراف: من كان **كلّ** أدواره عضويّةَ لجنةٍ يشرف عليها هذا المنفّذ.
          -- «عضويّة اللجنة» تُقرأ من `committees.member_role_name` لا باسمٍ مكتوبٍ هنا،
          -- فتخرج القيادة والنيابة والتنسيق من مدّه: من فوقه لا يبلغه إشرافُه.
          when 'supervised' then
            exists (select 1 from user_roles v where v.user_id = p_target and v.is_active)
            and not exists (
              select 1 from user_roles v
              where v.user_id = p_target and v.is_active
                and not (
                  v.committee_id is not null
                  and exists (
                    select 1 from committees c
                    where c.id = v.committee_id and c.member_role_name = v.role_name
                  )
                  and exists (
                    select 1 from user_roles s
                    where s.user_id = p_actor and s.is_active
                      and s.role_name = a.role_name
                      and s.committee_id = v.committee_id
                  )
                )
            )
          else false
        end
    );
$$;

comment on function public.can_end_membership(uuid, uuid) is
  'حَكَم إنهاء العضوية وإعادتها — يقرأ membership_termination_authority. لا نفسك، ولا من حُجب عنك.';

-- ═══ قفلُ الغرفة الجديدة: «من أشرف عليهم» ═══
-- عضو إدارة الموارد لا يملك `view_members` (لا يرى السجلّ كلّه)، فله مفتاحُ غرفته وحدها.
insert into public.permissions (permission_key, permission_name_ar, description, category)
values ('view_supervised_members', 'عرض من أشرف عليهم', 'رؤية أعضاء اللجان التي يشرف عليها المستخدم', 'membership')
on conflict (permission_key) do nothing;

insert into public.role_permissions (role_id, role_name, permission_id)
select r.id, r.role_name, p.id
from public.roles r, public.permissions p
where r.role_name = 'hr_admin_member' and p.permission_key = 'view_supervised_members'
on conflict do nothing;
