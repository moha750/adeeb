-- إنشاءُ النداء ورؤيتُه — بابان لولاهما لبقي المسارُ نظريًّا.

/**
 * النداءُ فعلٌ آخر غيرُ إنشاء المهمّة: له **مقاعدُ** معلنة و**نافذةُ أولويّةٍ** للطامحين.
 * ولذلك دالّةٌ ثانية لا معاملاتٌ تُحشَر في الأولى — الأفعالُ تُسمّى بما هي.
 *
 * **والمعيارُ يُكتب في وصف النداء نفسِه** لا لائحةً عامّة: «سكربتٌ في ٨٠٠ كلمة يُسلَّم خلال
 * أسبوع» — فيصير مكتوبًا **قبل** أن يبدأ أحد (فلا محاباةَ تُتّهمون بها)، وواقعيًّا بيد القائد.
 */
create or replace function public.create_open_call(
  p_title text, p_description text, p_committee integer, p_due_on date,
  p_slots integer, p_aspirant_days integer
)
returns uuid language plpgsql security definer set search_path to 'public', 'pg_temp'
as $$
declare v_actor uuid := auth.uid(); v_id uuid;
begin
  if v_actor is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if btrim(coalesce(p_title, '')) = '' then raise exception 'TITLE_REQUIRED'; end if;
  if not can_manage_tasks_of(v_actor, p_committee) then raise exception 'NOT_AUTHORIZED'; end if;

  insert into tasks (title, description, committee_id, due_on, created_by, kind, slots, open_to_public_at)
  values (
    btrim(p_title), nullif(btrim(coalesce(p_description, '')), ''), p_committee, p_due_on, v_actor,
    'open_call', p_slots,
    now() + make_interval(days => greatest(coalesce(p_aspirant_days, 3), 0))
  )
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.create_open_call(text, text, integer, date, integer, integer) to authenticated;

/**
 * أيرى هذا المنادي النداء؟ — ولولا هذا لبقي النداءُ محجوبًا عمّن كُتب له: سياسةُ `tasks`
 * كانت تُري المُسنَدَ إليه، والمتطوّعُ لم يتطوّع بعدُ فلا إسنادَ له.
 *
 * والطامحُ يراه من يومه، وسائرُ أصحاب الحسابات بعد انقضاء نافذة الأولويّة. والعضوُ لا يراه
 * من هذا الباب (يراه إن كان يملك مهامَّ لجنته).
 *
 * مفوَّضةٌ بلا مُدخَل فاعل: تقرأ `auth.uid()` بنفسها — فلا تُنتحَل، ولا تُدير سياسةً على نفسها.
 */
create or replace function public.may_see_open_call(p_task uuid)
returns boolean
language sql stable security definer set search_path to 'public'
as $$
  select exists (
    select 1
    from tasks t
    join profiles p on p.id = auth.uid()
    where t.id = p_task
      and t.kind = 'open_call'
      and t.status = 'open'
      and p.joined_date is null
      and (
        (t.open_to_public_at is not null and now() >= t.open_to_public_at)
        or exists (
          select 1 from membership_applications a
          where a.user_id = auth.uid() and a.status = 'waiting'
        )
      )
  );
$$;

drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select to authenticated
  using (
    can_manage_tasks_of(auth.uid(), committee_id)
    or check_user_permission(auth.uid(), 'view_members')
    or is_my_task(id)
    or may_see_open_call(id)
  );
