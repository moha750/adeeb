-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260806071606   الاسم: tasks_03_scope_reader

create or replace function public.task_committees_of(p_actor uuid)
returns setof integer
language sql stable security definer set search_path to 'public'
as $$
  select c.id from committees c
  where can_manage_tasks_of(p_actor, c.id);
$$;

comment on function public.task_committees_of(uuid) is
  'اللجانُ التي يملك هذا الفاعلُ مهامَّها — قراءةٌ لشاشة اللوحة. تأخذ الفاعلَ مُدخَلًا فلا تُنادى إلّا بمفتاح الخدمة (٢٠٢٦-٠٨-٠٦).';

revoke execute on function public.task_committees_of(uuid) from public, anon, authenticated;
