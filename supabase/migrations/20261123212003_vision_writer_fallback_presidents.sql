-- **يكتب الرئيسان حين تخلو إدارة الضمان والجودة** (محمد ٢٠٢٦-١١-٢٤، «يعتمد الحل الأول»): الكتابةُ لمن يُعدّ الرؤى بلا مقعد رئاسة،
-- فإن لم يكن في الإدارة أحدٌ يحمل «إعداد الرؤى» انتقلت الكتابةُ إلى الرئيسين تلقائيًّا، وعادت إلى الإدارة ساعةَ يُعيَّن فيها أحد.
create or replace function public.vision_qa_staffed()
returns boolean language sql stable security definer set search_path to 'public', 'pg_temp' as $$
  select exists (
    select 1 from public.user_roles ur
      join public.role_permissions rp on rp.role_name = ur.role_name
      join public.permissions p on p.id = rp.permission_id
     where p.permission_key = 'draft_vision' and ur.is_active and ur.frozen_by is null
       and ur.role_name not in ('club_president', 'executive_council_president'));
$$;
revoke all on function public.vision_qa_staffed() from public, anon, authenticated;
grant execute on function public.vision_qa_staffed() to service_role;

create or replace function public.vision_writer(p_user uuid)
returns boolean language sql stable security definer set search_path to 'public', 'pg_temp' as $$
  select coalesce(public.check_user_permission(p_user, 'draft_vision'), false)
     and (public.vision_president_seat(p_user) is null or not public.vision_qa_staffed());
$$;

do $mig$
declare d text; o text;
begin
  d := pg_get_functiondef('public.vision_access(uuid,bigint)'::regprocedure); o := d;
  d := replace(d, E'''writer'', public.vision_writer(p_user),',
                  E'''writer'', public.vision_writer(p_user),\n    ''qa_staffed'', public.vision_qa_staffed(),');
  if d = o then raise exception 'access anchor'; end if;
  execute d;
end
$mig$;
