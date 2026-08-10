-- ══════════════════════════════════════════════════════════════════════════════
-- كسرُ دورانٍ في الحراسة — `42P17: infinite recursion detected in policy`
--
-- كُتبت سياسةُ `tasks` تسأل `task_assignments` («أمُسنَدةٌ إليّ؟»)، وسياسةُ `task_assignments`
-- تسأل `tasks` («أأملك لجنتَها؟»). فكلُّ قراءةٍ من أحدهما تستدعي الآخر، وذاك يستدعي الأوّل —
-- **دورانٌ لا ينتهي**، ولا يظهر إلّا عند أوّل قراءةٍ حقيقيّة (لا في الترحيل ولا في المترجم).
--
-- **والكسرُ بدالّتين مفوَّضتين**: `SECURITY DEFINER` تتخطّى RLS بطبعها، فتنقطع السلسلةُ عند
-- أوّل قفزة. ولا تأخذان فاعلًا — الأولى تقرأ `auth.uid()` بنفسها، والثانية بحثٌ عن لجنةِ
-- مهمّة. (وهذا هو العرفُ الجديد: لا مُدخَلَ فاعلٍ في دالّةٍ يبلغها الخارج.)
--
-- **الدرسُ العامّ**: سياستان تتقاطعان على جدولين مترابطين لا تُكتبان بالاستعلام المباشر —
-- إحداهما على الأقلّ تمرّ بدالّةٍ مفوَّضة.
-- ══════════════════════════════════════════════════════════════════════════════

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
