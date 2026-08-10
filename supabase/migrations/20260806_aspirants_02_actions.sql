-- أفعالُ مسار الطامحين — كلُّها تقرأ الفاعلَ من `auth.uid()` لا من مُدخَل (بعد ثغرة `p_actor`).

/** التقديم: صاحبُ حسابٍ ليس عضوًا يضع نفسه في القائمة. والقيدُ الفريدُ يجعل التكرار مستحيلًا. */
create or replace function public.apply_for_membership()
returns void language plpgsql security definer set search_path to 'public', 'pg_temp'
as $$
declare v_user uuid := auth.uid(); v_p profiles%rowtype;
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into v_p from profiles where id = v_user;
  if not found then raise exception 'NO_PROFILE'; end if;
  if v_p.joined_date is not null then raise exception 'ALREADY_MEMBER'; end if;

  insert into membership_applications (user_id, status, applied_at)
  values (v_user, 'waiting', now())
  on conflict (user_id) do update
    set status = case when membership_applications.status = 'joined' then 'joined' else 'waiting' end,
        applied_at = case when membership_applications.status = 'withdrawn' then now() else membership_applications.applied_at end;
end;
$$;

create or replace function public.withdraw_application()
returns void language plpgsql security definer set search_path to 'public', 'pg_temp'
as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED'; end if;
  update membership_applications set status = 'withdrawn' where user_id = v_user and status = 'waiting';
end;
$$;

/**
 * التطوّع — **الطامحون أوّلًا ثمّ العموم**، والعضوُ لا يتطوّع.
 *
 * وأولويّةُ الطامحين هي قيمةُ وجودهم في القروب: سبقٌ في الفرص لا وعدٌ مؤجّل. ثمّ يُفتح
 * للعموم لأنّ الكفاءةَ التي تنقص اللجنةَ أرجحُ أن تكون **خارج** بركة من أرادوا العضويّة.
 */
create or replace function public.volunteer_for_call(p_task uuid)
returns void language plpgsql security definer set search_path to 'public', 'pg_temp'
as $$
declare
  v_user uuid := auth.uid();
  v_task tasks%rowtype;
  v_joined date;
  v_is_aspirant boolean;
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into v_task from tasks where id = p_task;
  if not found then raise exception 'TASK_NOT_FOUND'; end if;
  if v_task.kind <> 'open_call' then raise exception 'NOT_AN_OPEN_CALL'; end if;
  if v_task.status <> 'open'    then raise exception 'CALL_CLOSED'; end if;

  select joined_date into v_joined from profiles where id = v_user;
  if not found then raise exception 'NO_PROFILE'; end if;
  if v_joined is not null then raise exception 'MEMBERS_DO_NOT_VOLUNTEER'; end if;

  select exists (select 1 from membership_applications a where a.user_id = v_user and a.status = 'waiting')
  into v_is_aspirant;

  if (v_task.open_to_public_at is null or now() < v_task.open_to_public_at) and not v_is_aspirant then
    raise exception 'ASPIRANTS_ONLY';
  end if;

  insert into task_assignments (task_id, user_id, source)
  values (p_task, v_user, 'volunteered')
  on conflict (task_id, user_id) do nothing;
end;
$$;

/** الاختيار — بحدود المقاعد المعلنة في النداء، فلا يُوعَد بما لا يُوفى. */
create or replace function public.select_volunteer(p_assignment uuid, p_selected boolean)
returns void language plpgsql security definer set search_path to 'public', 'pg_temp'
as $$
declare
  v_actor uuid := auth.uid();
  v_row task_assignments%rowtype;
  v_task tasks%rowtype;
  v_taken integer;
begin
  if v_actor is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into v_row from task_assignments where id = p_assignment;
  if not found then raise exception 'ASSIGNMENT_NOT_FOUND'; end if;
  select * into v_task from tasks where id = v_row.task_id;
  if not can_manage_tasks_of(v_actor, v_task.committee_id) then raise exception 'NOT_AUTHORIZED'; end if;
  if v_row.source <> 'volunteered' then raise exception 'NOT_A_VOLUNTEER'; end if;

  if p_selected and v_task.slots is not null then
    select count(*) into v_taken from task_assignments
    where task_id = v_task.id and selected_at is not null and id <> p_assignment;
    if v_taken >= v_task.slots then raise exception 'NO_SLOTS_LEFT'; end if;
  end if;

  update task_assignments set selected_at = case when p_selected then now() else null end
  where id = p_assignment;
end;
$$;

/** الترشيح — **لا يرشّح إلّا من عمل معه**: اختاره في نداءٍ من نداءات لجنته. فالتزكيةُ شهادةُ عملٍ لا معرفةٍ شخصيّة. */
create or replace function public.recommend_aspirant(p_user uuid, p_note text)
returns void language plpgsql security definer set search_path to 'public', 'pg_temp'
as $$
declare v_actor uuid := auth.uid(); v_worked boolean;
begin
  if v_actor is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select exists (
    select 1 from task_assignments a
    join tasks t on t.id = a.task_id
    where a.user_id = p_user and a.selected_at is not null
      and can_manage_tasks_of(v_actor, t.committee_id)
  ) into v_worked;
  if not v_worked then raise exception 'NEVER_WORKED_TOGETHER'; end if;

  update membership_applications
  set recommended_by = v_actor, recommended_at = now(),
      recommend_note = nullif(btrim(coalesce(p_note, '')), '')
  where user_id = p_user and status = 'waiting';

  if not found then raise exception 'NO_WAITING_APPLICATION'; end if;
end;
$$;

grant execute on function public.apply_for_membership()          to authenticated;
grant execute on function public.withdraw_application()          to authenticated;
grant execute on function public.volunteer_for_call(uuid)        to authenticated;
grant execute on function public.select_volunteer(uuid, boolean) to authenticated;
grant execute on function public.recommend_aspirant(uuid, text)  to authenticated;
