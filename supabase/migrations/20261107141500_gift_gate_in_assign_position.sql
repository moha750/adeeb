-- بابُ الإهداء في البوّابة الأوّليّة لـ`assign_position` (تتمّة 20261107140000)
--
-- `assign_position` يردّ أوّلًا كلَّ من لا صفَّ له في `position_authority` («لا تملك صلاحية إدارة
-- الهيكلة»)، وأعضاء الموارد والإدارة التنفيذيّة لا صفَّ لهم. فحين يفتح الإهداءُ بابه
-- (`app.gift_gate`) تُتخطّى هذه البوّابة وحدَها، ويبقى ما بعدها كلُّه، ومنه `can_assign_role`
-- الذي لا يسع البابُ فيه إلّا منصبَ عضوٍ في لجنةٍ نشطة.
-- رُقِّعت الدالّة على تعريفها الحيّ، والترقيعُ يتحقّق من وقوعه.

do $patch$
declare
  v_def text;
  v_old text := $o$  if not exists (
    select 1 from user_roles ur
    join position_authority pa on pa.role_name = ur.role_name
    where ur.user_id = p_actor and ur.is_active
  ) then$o$;
  v_new text := $n$  -- بابُ الإهداء (20261107141500): يفتحه `grant_membership_to_volunteer` وحدَه.
  if coalesce(current_setting('app.gift_gate', true), '') <> 'open' and not exists (
    select 1 from user_roles ur
    join position_authority pa on pa.role_name = ur.role_name
    where ur.user_id = p_actor and ur.is_active
  ) then$n$;
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'assign_position';
  if position(v_new in v_def) > 0 then
    return; -- مُرقَّعةٌ من قبل
  end if;
  if position(v_old in v_def) = 0 then
    raise exception 'assign_position: البوّابة الأوّليّة ليست على النصّ المتوقَّع';
  end if;
  execute replace(v_def, v_old, v_new);
end
$patch$;
