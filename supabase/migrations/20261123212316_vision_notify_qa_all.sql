-- **الإعادةُ والاعتمادُ يصلان إدارة الضمان والجودة كلَّها** (محمد ٢٠٢٦-١١-٢٤، «نفّذ الأول فقط»): لا من أرسلها وحده، فيعلم كلُّ من في
-- الإدارة أنّ المسوّدة أُعيدت بملاحظة أو وافق عليها الرئيسان. ومن أرسلها يبقى معهم وإن لم يكن منهم (رئيسٌ كتبها لخلوّ الإدارة).
-- والموافقةُ الأولى لا تصل الإدارة: تصل الرئيسَ الآخر وحده.
create or replace function public.vision_qa_members()
returns jsonb language sql stable security definer set search_path to 'public', 'pg_temp' as $$
  select coalesce(jsonb_agg(distinct ur.user_id), '[]'::jsonb)
    from public.user_roles ur
    join public.role_permissions rp on rp.role_name = ur.role_name
    join public.permissions p on p.id = rp.permission_id
   where p.permission_key = 'draft_vision' and ur.is_active and ur.frozen_by is null
     and ur.role_name not in ('club_president', 'executive_council_president');
$$;
revoke all on function public.vision_qa_members() from public, anon, authenticated;
grant execute on function public.vision_qa_members() to service_role;

do $mig$
declare d text; o text;
begin
  d := pg_get_functiondef('public.vision_plan_act(bigint,uuid,text,text)'::regprocedure); o := d;
  d := replace(d, E'''notify'', case when v_n >= 2 and v.submitted_by is not null and v.submitted_by <> p_actor then jsonb_build_array(v.submitted_by) else ''[]''::jsonb end,',
                  E'''notify'', case when v_n >= 2 then coalesce((select jsonb_agg(distinct u) from (\n        select jsonb_array_elements_text(public.vision_qa_members()) u\n        union select v.submitted_by::text where v.submitted_by is not null) x where u <> p_actor::text), ''[]''::jsonb) else ''[]''::jsonb end,');
  if d = o then raise exception 'approve anchor'; end if; o := d;
  d := replace(d, E'      select v.submitted_by u where v.submitted_by is not null\n      union select user_id from public.vision_approvals where vision_id = p_vision\n    ) x where u <> p_actor;',
                  E'      select v.submitted_by u where v.submitted_by is not null\n      union select user_id from public.vision_approvals where vision_id = p_vision\n      union select (jsonb_array_elements_text(public.vision_qa_members()))::uuid\n    ) x where u <> p_actor;');
  if d = o then raise exception 'send_back anchor'; end if;
  execute d;
end
$mig$;
