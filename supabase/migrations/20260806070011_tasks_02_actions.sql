-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260806070011   الاسم: tasks_02_actions

create or replace function public.create_task(
  p_title text, p_description text, p_committee integer, p_due_on date
)
returns uuid language plpgsql security definer set search_path to 'public', 'pg_temp'
as $$
declare v_actor uuid := auth.uid(); v_id uuid;
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

create or replace function public.update_task(p_task uuid, p_title text, p_description text, p_due_on date)
returns void language plpgsql security definer set search_path to 'public', 'pg_temp'
as $$
declare v_actor uuid := auth.uid(); v_task tasks%rowtype;
begin
  if v_actor is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if btrim(coalesce(p_title, '')) = '' then raise exception 'TITLE_REQUIRED'; end if;
  select * into v_task from tasks where id = p_task;
  if not found then raise exception 'TASK_NOT_FOUND'; end if;
  if not can_manage_tasks_of(v_actor, v_task.committee_id) then raise exception 'NOT_AUTHORIZED'; end if;

  update tasks
  set title = btrim(p_title),
      description = nullif(btrim(coalesce(p_description, '')), ''),
      due_on = p_due_on, updated_at = now()
  where id = p_task;
end;
$$;

create or replace function public.assign_task(p_task uuid, p_user uuid)
returns void language plpgsql security definer set search_path to 'public', 'pg_temp'
as $$
declare v_actor uuid := auth.uid(); v_task tasks%rowtype;
begin
  if v_actor is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into v_task from tasks where id = p_task;
  if not found then raise exception 'TASK_NOT_FOUND'; end if;
  if not can_manage_tasks_of(v_actor, v_task.committee_id) then raise exception 'NOT_AUTHORIZED'; end if;
  if v_task.status <> 'open' then raise exception 'TASK_CLOSED'; end if;

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
returns void language plpgsql security definer set search_path to 'public', 'pg_temp'
as $$
declare v_actor uuid := auth.uid(); v_task tasks%rowtype;
begin
  if v_actor is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into v_task from tasks where id = p_task;
  if not found then raise exception 'TASK_NOT_FOUND'; end if;
  if not can_manage_tasks_of(v_actor, v_task.committee_id) then raise exception 'NOT_AUTHORIZED'; end if;

  delete from task_assignments
  where task_id = p_task and user_id = p_user and state = 'pending';
end;
$$;

create or replace function public.submit_task(p_assignment uuid, p_submission text)
returns void language plpgsql security definer set search_path to 'public', 'pg_temp'
as $$
declare v_actor uuid := auth.uid(); v_row task_assignments%rowtype; v_task tasks%rowtype;
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

create or replace function public.mark_task(p_assignment uuid, p_state text, p_note text)
returns void language plpgsql security definer set search_path to 'public', 'pg_temp'
as $$
declare v_actor uuid := auth.uid(); v_row task_assignments%rowtype; v_task tasks%rowtype;
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
returns void language plpgsql security definer set search_path to 'public', 'pg_temp'
as $$
declare v_actor uuid := auth.uid(); v_task tasks%rowtype;
begin
  if v_actor is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_status not in ('open', 'closed', 'cancelled') then raise exception 'BAD_STATUS'; end if;
  select * into v_task from tasks where id = p_task;
  if not found then raise exception 'TASK_NOT_FOUND'; end if;
  if not can_manage_tasks_of(v_actor, v_task.committee_id) then raise exception 'NOT_AUTHORIZED'; end if;

  update tasks set status = p_status, updated_at = now() where id = p_task;
end;
$$;

grant execute on function public.create_task(text, text, integer, date)     to authenticated;
grant execute on function public.update_task(uuid, text, text, date)        to authenticated;
grant execute on function public.assign_task(uuid, uuid)                    to authenticated;
grant execute on function public.unassign_task(uuid, uuid)                  to authenticated;
grant execute on function public.submit_task(uuid, text)                    to authenticated;
grant execute on function public.mark_task(uuid, text, text)                to authenticated;
grant execute on function public.set_task_status(uuid, text)                to authenticated;
