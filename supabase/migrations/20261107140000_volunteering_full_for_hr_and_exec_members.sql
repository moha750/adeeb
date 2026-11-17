-- التطوّعُ كلُّه وإهداءُ العضويّة لأعضاء الموارد والإدارة التنفيذيّة (قرار المالك ٢٠٢٦-١١-٠٧)
--
-- يعكس نزعَ 20261107124500 عن أعضاء الموارد، ويجعل منحَ الإدارة التنفيذيّة دائمًا على الدور.
-- فأهلُ التطوّع (الفرص وسجلّ المتطوّعين والشهادات، كلّ أفعالها) وأهلُ الإهداء صاروا واحدًا:
--   رئيس أدِيب، والرئيس التنفيذيّ، وقائد الموارد، وأعضاء الموارد (`hr_admin_member`)،
--   وأعضاء الإدارة التنفيذيّة (`exec_admin_member`).
-- ويخالف ذلك مسوّدةَ الدستور (م١٧ «لا سلطة لأعضائها على الأشخاص»، وم٣٧ الإهداءُ للثلاثة)
-- ونظامَ المناصب م١٨، حتّى تُعدَّل المسوّدات.
--
-- والإهداءُ يُسند منصبَ «عضو اللجنة» عبر `assign_position`، وهذا يسأل سلطةَ الهيكلة
-- (`can_assign_role` ← `position_authority`) التي لا يملكها أعضاء الإدارتين. فلا يُعطَون سلطةَ
-- إسنادٍ عامّة في الهيكل؛ بل يفتح الإهداءُ بابًا محلّيًّا في معاملته (`app.gift_gate`) لا يسع إلّا
-- منصبَ عضوٍ في لجنةٍ نشطة، ويُغلق فور الإسناد. والبابُ لا يُفتح من العميل: كلُّ نداءٍ معاملةٌ وحدَه.

insert into public.role_permissions (role_name, permission_id)
select r.role_name, p.id
from (values ('hr_admin_member'), ('exec_admin_member')) as r(role_name)
cross join public.permissions p
where p.permission_key in ('manage_volunteering', 'manage_membership_applications')
on conflict (role_name, permission_id) do nothing;

CREATE OR REPLACE FUNCTION public.can_assign_role(p_actor uuid, p_role_name text, p_committee integer)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from user_roles ur
    join position_authority pa on pa.role_name = ur.role_name
    where ur.user_id = p_actor and ur.is_active
      and p_role_name = any (pa.target_roles)
      -- ما كان «في وحدته» لا يُسنَد إلّا في الوحدة التي يقودها هو
      and (not (p_role_name = any (pa.own_unit_roles))
           or exists (
             select 1 from committees c
             where c.id = p_committee
               and c.leader_role_name = ur.role_name
               and ur.committee_id = c.id
           ))
  )
  -- بابُ الإهداء (20261107140000): يفتحه `grant_membership_to_volunteer` وحدَه بعد أن يسأل
  -- قدرةَ الإهداء، ولا يسع إلّا منصبَ عضوٍ في لجنةٍ نشطة.
  or (
    coalesce(current_setting('app.gift_gate', true), '') = 'open'
    and exists (
      select 1 from committees c
      where c.id = p_committee and c.is_active and c.member_role_name = p_role_name
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.grant_membership_to_volunteer(p_user uuid, p_committee_id integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_actor uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Riyadh')::date;
  v_role  text;
  v_committee text;
  v_assign jsonb;
  v_prev  profiles%rowtype;
  v_returning boolean;
begin
  if v_actor is null or not check_user_permission(v_actor, 'manage_membership_applications') then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'صلاحيتك لا تبلغ منحَ العضويّة.');
  end if;
  if not exists (select 1 from volunteers where user_id = p_user and status = 'active') then
    return jsonb_build_object('ok', false, 'code', 'NOT_VOLUNTEER', 'message', 'العضويّةُ تُهدى لمتطوّعٍ نشط.');
  end if;
  if is_adeeb_member(p_user) then
    return jsonb_build_object('ok', false, 'code', 'ALREADY_MEMBER', 'message', 'هو عضوٌ أصلًا.');
  end if;

  select member_role_name, committee_name_ar into v_role, v_committee
  from committees where id = p_committee_id and is_active;
  if v_role is null then
    return jsonb_build_object('ok', false, 'code', 'NO_COMMITTEE', 'message', 'لا لجنةَ نشطةً بهذا المعرّف.');
  end if;

  select * into v_prev from profiles where id = p_user;
  v_returning := v_prev.account_status = 'suspended';

  -- الإسنادُ أوّلًا: لو ردّته سلطةُ الهيكلة لم يُكتب شيءٌ بعدُ.
  -- قدرةُ الإهداء هي سلطةُ هذا الإسناد وحدَه، فيُفتح لها بابٌ محلّيّ ثمّ يُغلق (20261107140000).
  perform set_config('app.gift_gate', 'open', true);
  v_assign := assign_position(v_actor, p_user, v_role, p_committee_id, null, false,
                              'إهداءُ عضويّةٍ لمتطوّع');
  perform set_config('app.gift_gate', '', true);
  if not coalesce((v_assign->>'ok')::boolean, false) then
    return v_assign;
  end if;

  if v_returning then
    -- عضوٌ سابقٌ يعود: الحالُ والتاريخُ في كتابةٍ واحدة (حارسُ المنتهية يردّ تعديلَ التاريخ وحده)،
    -- والعضويّةُ السابقةُ تُحفظ في السجلّ أدناه
    perform set_config('app.membership_gate', 'open', true);
    update profiles
    set account_status = 'active', termination_reason = null, joined_date = v_today, updated_at = now()
    where id = p_user;
    perform set_config('app.membership_gate', '', true);

    -- سجلُّ التفاصيل جُمّد على اسم يوم الخروج، فيلحق اسمَه الحاليّ
    update member_details md
    set full_name_triple = p.full_name, updated_at = now()
    from profiles p
    where p.id = p_user and md.user_id = p_user
      and coalesce(btrim(p.full_name), '') <> ''
      and md.full_name_triple is distinct from p.full_name;
  else
    update profiles set joined_date = coalesce(joined_date, v_today) where id = p_user;
  end if;

  update volunteers
  set status = 'former', ended_at = now(), ended_by = v_actor, end_reason = 'نال العضويّة'
  where user_id = p_user;

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (v_actor, 'grant_membership', 'profile', p_user::text,
          jsonb_build_object('committee_id', p_committee_id, 'role', v_role, 'joined_date', v_today)
          || case when v_returning then jsonb_build_object(
               'returning', true,
               'previous_joined_date', v_prev.joined_date,
               'previous_terminated_at', v_prev.terminated_at,
               'previous_termination_reason', v_prev.termination_reason)
             else '{}'::jsonb end);

  return jsonb_build_object('ok', true, 'message',
    format('صار عضوًا في %s، وانتهى تطوّعُه.', v_committee));
end;
$function$;
