-- فصل الإشراف عن الانتماء — المرحلة ١ (تمام): الإشراف يسقط بسقوط الانتماء
--
-- الفصل يمنح العضو وجودًا مستقلًّا عن توزيعه، لكنّ العكس لا يستقيم: **إشرافٌ بلا انتماء
-- لا يقوم**. فمن أُخرج من إدارته لا يبقى مشرفًا باسمها. حارس الجدول يشترط العضويّة عند
-- الكتابة؛ وهذا يحرسها عند الخروج — وإلّا بقي صفٌّ يتيمٌ يعرضه القارئ مشرفًا وهو ليس بعضو.

create or replace function public.cascade_membership_loss_to_supervision()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op = 'DELETE' or (old.is_active and not new.is_active) then
    delete from committee_supervision cs
    using committees u
    where u.id = old.committee_id
      and u.member_role_name = old.role_name
      and cs.unit_id = u.id
      and cs.supervisor_id = old.user_id;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke execute on function public.cascade_membership_loss_to_supervision() from public, anon, authenticated;

drop trigger if exists user_roles_cascade_supervision on public.user_roles;
create trigger user_roles_cascade_supervision
  after update or delete on public.user_roles
  for each row execute function public.cascade_membership_loss_to_supervision();
