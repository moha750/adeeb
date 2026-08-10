-- ══════════════════════════════════════════════════════════════════════════════
-- م٤ — **سجلُّ المهامّ**: دفترٌ يعرف من كُلّف بماذا وهل سلّم
--
-- وُلد من نقاش المجلس (٢٠٢٦-٠٨-٠٦): يُستبعَد نصفُ الأعضاء لأنّهم «لا يردّون على المهامّ»،
-- **وليس في النظام أثرٌ واحدٌ لمهمّة** — الدليلُ كلُّه محادثاتٌ في واتساب. فكلُّ إخراجٍ صار
-- حملةً جماعيّةً لأنّ الحكم الفرديّ يحتاج دليلًا فرديًّا وهو مفقود.
--
-- وعليه يقوم ما بعده: **الإنذارُ الآليّ** يقرأ منه، و**مميّزُ الشهر** يُختار بعرضه، و**نداءُ
-- الطامحين** مهمّةٌ من نوعٍ آخر فيه. ولذلك وُضع فيه من أوّل يوم عمودان لا يستعملهما هو:
-- `kind` (داخليّةٌ أم نداءٌ مفتوح) و`source` (أُسند أم تطوّع) — فيركب عليه م٥ بلا ترحيلٍ ثانٍ.
--
-- **ولا يحكم هذا الدفترُ على أحد**: يسجّل فقط. ولا إنذارَ يقع منه اليوم.
-- ══════════════════════════════════════════════════════════════════════════════


-- ═══ ١) الجدولان ══════════════════════════════════════════════════════════════

create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (btrim(title) <> ''),
  description  text,
  -- اللجنةُ صاحبةُ المهمّة. NULL = مهمّةُ إدارةٍ لا لجنةَ لها (وحدهما الرئيسان يملكانها).
  committee_id integer references public.committees(id) on delete set null,
  kind         text not null default 'committee' check (kind in ('committee', 'open_call')),
  status       text not null default 'open'      check (status in ('open', 'closed', 'cancelled')),
  due_on       date,
  created_by   uuid not null references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.tasks is
  'المهامّ — دفترُ ما يُكلَّف به الأعضاء. `kind=open_call` محجوزٌ لنداءات الطامحين (م٥).';

create table if not exists public.task_assignments (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references public.tasks(id)    on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  -- كيف صار في المهمّة: أسندها إليه قائدُه، أم تطوّع لنداءٍ مفتوح (م٥)
  source       text not null default 'assigned' check (source in ('assigned', 'volunteered')),
  -- والحالُ أربع: معلَّقٌ · سلّم · لم يسلّم · **معذور** (وهذه صمّامُ الأمان: مرضٌ أو سفرٌ
  -- يعرفه القائد فلا يصير إنذارًا في م٦).
  state        text not null default 'pending'  check (state in ('pending', 'delivered', 'missed', 'excused')),
  submission   text,                    -- ما كتبه صاحبُها: نصٌّ أو رابط
  submitted_at timestamptz,
  marked_by    uuid references public.profiles(id),
  marked_at    timestamptz,
  note         text,                    -- ملحوظةُ القائد عند التأشير
  selected_at  timestamptz,             -- محجوزٌ لم٥: متى اختار القائدُ هذا المتطوّع
  created_at   timestamptz not null default now(),
  unique (task_id, user_id)
);

comment on table public.task_assignments is
  'من في المهمّة وماذا كان منه. التأشيرُ (state) بيد القائد وحده، والتسليمُ (submission) بيد صاحبها — قرار المالك ٢٠٢٦-٠٨-٠٦.';

create index if not exists task_assignments_user_idx  on public.task_assignments (user_id);
create index if not exists task_assignments_state_idx on public.task_assignments (state);
create index if not exists tasks_committee_idx        on public.tasks (committee_id);


-- ═══ ٢) القدرة ومداها ═════════════════════════════════════════════════════════

insert into public.permissions (permission_key, permission_name_ar, description, category)
select 'manage_tasks', 'إدارة المهامّ', 'إنشاءُ المهامّ وإسنادُها وتأشيرُ تسليمها في نطاق الوحدة', 'membership'
where not exists (select 1 from public.permissions where permission_key = 'manage_tasks');

insert into public.role_permissions (role_name, permission_id)
select r.role_name, p.id
from (values
  ('committee_leader'), ('deputy_committee_leader'),
  ('hr_committee_leader'), ('qa_committee_leader'),
  ('department_head'), ('club_president'), ('executive_council_president')
) as r(role_name)
cross join public.permissions p
where p.permission_key = 'manage_tasks'
  and not exists (
    select 1 from public.role_permissions rp
    where rp.role_name = r.role_name and rp.permission_id = p.id
  );

/**
 * مدى القدرة — **القدرةُ تفتح، والصفُّ يسمّي**: من حمل `manage_tasks` لا يتصرّف في كلّ لجنة،
 * بل في التي يقودها. وهذا عُرفُ أديب نفسُه (`can_issue_warning` + `member_within_reach`).
 */
create or replace function public.can_manage_tasks_of(p_actor uuid, p_committee integer)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select p_actor is not null
     and check_user_permission(p_actor, 'manage_tasks')
     and (
       -- رئيسُ النادي ورئيسُ التنفيذيّ: مدُّهما النادي كلُّه (وهما وحدهما لمهمّةٍ بلا لجنة)
       exists (
         select 1 from user_roles ur
         where ur.user_id = p_actor and ur.is_active
           and ur.role_name in ('club_president', 'executive_council_president')
       )
       or (
         p_committee is not null and (
           -- قائدُ اللجنة أو نائبُها
           exists (
             select 1 from user_roles ur
             where ur.user_id = p_actor and ur.is_active
               and ur.committee_id = p_committee
               and ur.role_name in ('committee_leader', 'deputy_committee_leader',
                                    'hr_committee_leader', 'qa_committee_leader')
           )
           -- أو منسّقُ القسم الذي تتبعه اللجنة
           or exists (
             select 1
             from user_roles ur
             join committees c on c.id = p_committee
             where ur.user_id = p_actor and ur.is_active
               and ur.role_name = 'department_head'
               and ur.department_id = c.department_id
           )
         )
       )
     );
$$;

comment on function public.can_manage_tasks_of(uuid, integer) is
  'أيملك هذا الفاعلُ مهامَّ هذه اللجنة؟ القدرةُ `manage_tasks` + موقعُه من الوحدة.';


-- ═══ ٣) الحراسة (RLS) — القراءةُ ههنا، والكتابةُ بالدوالّ وحدها ════════════════

alter table public.tasks            enable row level security;
alter table public.task_assignments enable row level security;

-- المهمّةُ يراها: من أُسندت إليه · من يملكها · ومن يرى سجلّ الأعضاء (اطّلاعُ الإدارة العليا)
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select to authenticated
  using (
    can_manage_tasks_of(auth.uid(), committee_id)
    or check_user_permission(auth.uid(), 'view_members')
    or exists (
      select 1 from task_assignments a
      where a.task_id = tasks.id and a.user_id = auth.uid()
    )
  );

-- وصفُّ الإسناد يراه صاحبُه، ومن يملك المهمّة، والمطّلع
drop policy if exists task_assignments_select on public.task_assignments;
create policy task_assignments_select on public.task_assignments
  for select to authenticated
  using (
    user_id = auth.uid()
    or check_user_permission(auth.uid(), 'view_members')
    or exists (
      select 1 from tasks t
      where t.id = task_assignments.task_id
        and can_manage_tasks_of(auth.uid(), t.committee_id)
    )
  );

-- **ولا سياسةَ كتابةٍ لأحد**: الإنشاءُ والإسنادُ والتسليمُ والتأشير كلُّها دوالُّ مفوَّضة
-- أدناه — فلا يُكتب في هذين الجدولين إلّا بحُكمٍ مكتوبٍ يُقرأ.
revoke insert, update, delete on public.tasks            from anon, authenticated;
revoke insert, update, delete on public.task_assignments from anon, authenticated;
revoke all on public.tasks            from anon;
revoke all on public.task_assignments from anon;


-- ═══ ٤) الأفعال — كلُّها مفوَّضةٌ تفحص الإذن بنفسها ═══════════════════════════

create or replace function public.create_task(
  p_title text, p_description text, p_committee integer, p_due_on date
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_actor uuid := auth.uid();
  v_id    uuid;
begin
  if v_actor is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if btrim(coalesce(p_title, '')) = '' then raise exception 'TITLE_REQUIRED'; end if;
  if not can_manage_tasks_of(v_actor, p_committee) then raise exception 'NOT_AUTHORIZED'; end if;

  insert into tasks (title, description, committee_id, due_on, created_by)
  values (btrim(p_title), nullif(btrim(coalesce(p_description, '')), ''), p_committee, p_due_on, v_actor)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.assign_task(p_task uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_actor uuid := auth.uid();
  v_task  tasks%rowtype;
begin
  if v_actor is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into v_task from tasks where id = p_task;
  if not found then raise exception 'TASK_NOT_FOUND'; end if;
  if not can_manage_tasks_of(v_actor, v_task.committee_id) then raise exception 'NOT_AUTHORIZED'; end if;
  if v_task.status <> 'open' then raise exception 'TASK_CLOSED'; end if;

  -- لا تُسنَد مهمّةُ لجنةٍ إلّا إلى من له فيها صفٌّ حيّ — فلا يُكلَّف أحدٌ خارج وحدته
  if v_task.committee_id is not null and not exists (
    select 1 from user_roles ur
    where ur.user_id = p_user and ur.is_active and ur.committee_id = v_task.committee_id
  ) then
    raise exception 'NOT_IN_COMMITTEE';
  end if;

  insert into task_assignments (task_id, user_id, source)
  values (p_task, p_user, 'assigned')
  on conflict (task_id, user_id) do nothing;
end;
$$;

create or replace function public.unassign_task(p_task uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_actor uuid := auth.uid();
  v_task  tasks%rowtype;
begin
  if v_actor is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into v_task from tasks where id = p_task;
  if not found then raise exception 'TASK_NOT_FOUND'; end if;
  if not can_manage_tasks_of(v_actor, v_task.committee_id) then raise exception 'NOT_AUTHORIZED'; end if;

  -- ما أُشّر لا يُنزَع: السجلُّ لا يُمحى بعد أن صار حكمًا
  delete from task_assignments
  where task_id = p_task and user_id = p_user and state = 'pending';
end;
$$;

/** التسليمُ بيد صاحبه — يكتب ما عنده ولا يحكم على نفسه. */
create or replace function public.submit_task(p_assignment uuid, p_submission text)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_actor uuid := auth.uid();
  v_row   task_assignments%rowtype;
  v_task  tasks%rowtype;
begin
  if v_actor is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into v_row from task_assignments where id = p_assignment;
  if not found then raise exception 'ASSIGNMENT_NOT_FOUND'; end if;
  if v_row.user_id <> v_actor then raise exception 'NOT_OWNER'; end if;

  select * into v_task from tasks where id = v_row.task_id;
  if v_task.status <> 'open' then raise exception 'TASK_CLOSED'; end if;

  update task_assignments
  set submission   = nullif(btrim(coalesce(p_submission, '')), ''),
      submitted_at = case when btrim(coalesce(p_submission, '')) = '' then null else now() end
  where id = p_assignment;
end;
$$;

/** والتأشيرُ بيد القائد وحده — لأنّ الإنذارَ سيُبنى عليه، ولو ملكه صاحبُه لأشّر لنفسه أبدًا. */
create or replace function public.mark_task(p_assignment uuid, p_state text, p_note text)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_actor uuid := auth.uid();
  v_row   task_assignments%rowtype;
  v_task  tasks%rowtype;
begin
  if v_actor is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_state not in ('pending', 'delivered', 'missed', 'excused') then raise exception 'BAD_STATE'; end if;

  select * into v_row from task_assignments where id = p_assignment;
  if not found then raise exception 'ASSIGNMENT_NOT_FOUND'; end if;

  select * into v_task from tasks where id = v_row.task_id;
  if not can_manage_tasks_of(v_actor, v_task.committee_id) then raise exception 'NOT_AUTHORIZED'; end if;
  if v_row.user_id = v_actor then raise exception 'NOT_ON_SELF'; end if;

  update task_assignments
  set state     = p_state,
      note      = nullif(btrim(coalesce(p_note, '')), ''),
      marked_by = case when p_state = 'pending' then null else v_actor end,
      marked_at = case when p_state = 'pending' then null else now() end
  where id = p_assignment;
end;
$$;

create or replace function public.set_task_status(p_task uuid, p_status text)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_actor uuid := auth.uid();
  v_task  tasks%rowtype;
begin
  if v_actor is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_status not in ('open', 'closed', 'cancelled') then raise exception 'BAD_STATUS'; end if;

  select * into v_task from tasks where id = p_task;
  if not found then raise exception 'TASK_NOT_FOUND'; end if;
  if not can_manage_tasks_of(v_actor, v_task.committee_id) then raise exception 'NOT_AUTHORIZED'; end if;

  update tasks set status = p_status, updated_at = now() where id = p_task;
end;
$$;

create or replace function public.update_task(
  p_task uuid, p_title text, p_description text, p_due_on date
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_actor uuid := auth.uid();
  v_task  tasks%rowtype;
begin
  if v_actor is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if btrim(coalesce(p_title, '')) = '' then raise exception 'TITLE_REQUIRED'; end if;

  select * into v_task from tasks where id = p_task;
  if not found then raise exception 'TASK_NOT_FOUND'; end if;
  if not can_manage_tasks_of(v_actor, v_task.committee_id) then raise exception 'NOT_AUTHORIZED'; end if;

  update tasks
  set title       = btrim(p_title),
      description = nullif(btrim(coalesce(p_description, '')), ''),
      due_on      = p_due_on,
      updated_at  = now()
  where id = p_task;
end;
$$;

grant execute on function public.create_task(text, text, integer, date)     to authenticated;
grant execute on function public.update_task(uuid, text, text, date)        to authenticated;
grant execute on function public.assign_task(uuid, uuid)                    to authenticated;
grant execute on function public.unassign_task(uuid, uuid)                  to authenticated;
grant execute on function public.submit_task(uuid, text)                    to authenticated;
grant execute on function public.mark_task(uuid, text, text)                to authenticated;
grant execute on function public.set_task_status(uuid, text)                to authenticated;
