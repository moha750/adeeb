-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260806073505   الاسم: tasks_04_break_policy_recursion

-- سياسةُ `tasks` كانت تسأل `task_assignments`، وسياسةُ `task_assignments` تسأل `tasks` —
-- فتدور كلٌّ منهما على الأخرى (42P17). والكسرُ بدالّتين **مفوَّضتين** تتخطّيان RLS بطبعهما،
-- فينقطع الدوران عند أوّل قفزة. ولا تأخذان فاعلًا: الأولى تقرأ `auth.uid()` بنفسها.

create or replace function public.is_my_task(p_task uuid)
returns boolean
language sql stable security definer set search_path to 'public'
as $$
  select exists (
    select 1 from task_assignments a
    where a.task_id = p_task and a.user_id = auth.uid()
  );
$$;

create or replace function public.task_committee(p_task uuid)
returns integer
language sql stable security definer set search_path to 'public'
as $$
  select committee_id from tasks where id = p_task;
$$;

drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select to authenticated
  using (
    can_manage_tasks_of(auth.uid(), committee_id)
    or check_user_permission(auth.uid(), 'view_members')
    or is_my_task(id)
  );

drop policy if exists task_assignments_select on public.task_assignments;
create policy task_assignments_select on public.task_assignments
  for select to authenticated
  using (
    user_id = auth.uid()
    or check_user_permission(auth.uid(), 'view_members')
    or can_manage_tasks_of(auth.uid(), task_committee(task_id))
  );
