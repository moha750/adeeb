-- سلطةٌ واحدة على العضو: الإنهاء والتعديل
--
-- الجدول بُني للإنهاء وحده، ثمّ طُلب «تعديل البيانات بنفس النسق» — فصار الجدول سلطةً على
-- العضو لا على فعلٍ واحد، واسمُه يتبع معناه: `membership_authority`.
--
-- المدى واحدٌ للفعلين (من تبلغه سلطتُك تُنهي عضويّته وتعدّل بياناته)، ويفترقان في النفس وحدها:
-- لا تُنهي عضويّتك، ولك أن تعدّل بياناتك.

alter table if exists public.membership_termination_authority rename to membership_authority;

comment on table public.membership_authority is
  'سلطة كلّ منصبٍ على العضويّات: مداه ومن يُحجب عنه. تقرؤها can_end_membership و can_edit_member_data.';

-- ═══ ١) المدى — حَكَمٌ واحد يقرأه الفعلان ═══
create or replace function public.member_within_reach(p_actor uuid, p_target uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select p_actor is not null and p_target is not null and exists (
    select 1
    from user_roles a
    join membership_authority t on t.role_name = a.role_name
    where a.user_id = p_actor and a.is_active
      and case t.scope
        -- سلطةٌ عامّة: يبلغ كلّ عضوٍ لا يحمل دورًا محجوبًا عنه (المحجوب يحمي صاحبه كلّه)
        when 'all' then not exists (
          select 1 from user_roles v
          where v.user_id = p_target and v.is_active
            and v.role_name = any (t.blocked_roles)
        )
        -- سلطةُ إشراف: من كان **كلّ** أدواره عضويّةَ لجنةٍ يشرف عليها هذا المنفّذ.
        -- «عضويّة اللجنة» من `committees.member_role_name` لا باسمٍ مكتوبٍ هنا، فتخرج
        -- القيادة والنيابة والتنسيق من مدّه: من فوقه لا يبلغه إشرافُه.
        when 'supervised' then
          exists (select 1 from user_roles v where v.user_id = p_target and v.is_active)
          and not exists (
            select 1 from user_roles v
            where v.user_id = p_target and v.is_active
              and not (
                v.committee_id is not null
                and exists (
                  select 1 from committees c
                  where c.id = v.committee_id and c.member_role_name = v.role_name
                )
                and exists (
                  select 1 from user_roles s
                  where s.user_id = p_actor and s.is_active
                    and s.role_name = a.role_name
                    and s.committee_id = v.committee_id
                )
              )
          )
        else false
      end
  );
$$;

comment on function public.member_within_reach(uuid, uuid) is
  'هل تبلغ سلطةُ المنفّذ هذا العضو؟ (بلا حكمٍ على النفس — يقرّره كلُّ فعلٍ بنفسه).';

-- ═══ ٢) الفعلان — يفترقان في النفس وحدها ═══
create or replace function public.can_end_membership(p_actor uuid, p_target uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  -- لا يُنهي أحدٌ عضويّة نفسه مهما بلغت سلطته
  select p_actor is distinct from p_target and member_within_reach(p_actor, p_target);
$$;

create or replace function public.can_edit_member_data(p_actor uuid, p_target uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  -- ولكلٍّ أن يعدّل بيانات نفسه: التعديل ليس فعلًا هدّامًا، وسياسة `profiles_update_own` تقولها أصلًا
  select p_actor is not null and (p_actor = p_target or member_within_reach(p_actor, p_target));
$$;

comment on function public.can_edit_member_data(uuid, uuid) is
  'حَكَم تعديل بيانات العضو — نفس مدى الإنهاء، ويزيد عليه: لكلٍّ بياناتُ نفسه.';

-- ═══ ٣) مرآة الواجهة — نداءٌ واحد يحمل الحكمين ═══
drop function if exists public.members_i_may_end(uuid);

create or replace function public.members_in_my_reach(p_actor uuid)
returns table (user_id uuid, may_end boolean, may_edit boolean)
language sql
stable
security definer
set search_path to 'public'
as $$
  select p.id, can_end_membership(p_actor, p.id), can_edit_member_data(p_actor, p.id)
  from profiles p
  where can_edit_member_data(p_actor, p.id) or can_end_membership(p_actor, p.id);
$$;

-- ═══ ٤) سياسات الكتابة تتبع الحَكَم نفسه ═══
-- كانت تسأل عن المستدعي وحده (`manage_member_data`) ولا تسأل عن المقصود — فالسؤال الآن عنهما معًا.
drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update using (can_edit_member_data(auth.uid(), id));

drop policy if exists "المسؤولون يمكنهم تحديث بيانات الأ" on public.member_details;
create policy "المسؤولون يمكنهم تحديث بيانات الأ" on public.member_details
  for update using (can_edit_member_data(auth.uid(), user_id));

grant execute on function public.member_within_reach(uuid, uuid) to authenticated, service_role;
grant execute on function public.can_edit_member_data(uuid, uuid) to authenticated, service_role;
grant execute on function public.members_in_my_reach(uuid) to authenticated, service_role;
