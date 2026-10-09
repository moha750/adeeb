-- نقلُ العضو إلى المتطوّعين (طلب المالك ٢٠٢٦-١٠-٠٨)
--
-- بابٌ ثانٍ بجانب «إنهاء العضويّة» في تبويب أعضاء أديب: تنتهي العضويّة بالسبب والسلطة نفسيهما
-- (`_apply_termination`)، ويصير صاحبُها في المعاملة ذاتها متطوّعًا نشطًا بلا طلبٍ منه.
-- فلا خطوتان («أنهِ» ثمّ «تطوّع») يقع بينهما صديقُ أدِيب لا يعرف أنّ له طريقًا.
--
-- ورغباتُ اللجان لا تُفرض عليه: يرتّبها بنفسه من «/me» كما يفعل كلُّ متطوّع.

create or replace function public.move_member_to_volunteers(p_actor uuid, p_user uuid, p_reason text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_status text;
begin
  select account_status into v_status from profiles where id = p_user;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا وجود لهذا العضو.');
  end if;
  if v_status = 'suspended' then
    return jsonb_build_object('ok', false, 'code', 'ALREADY', 'message', 'عضويّته منتهية أصلًا.');
  end if;
  if p_actor = p_user then
    return jsonb_build_object('ok', false, 'code', 'SELF', 'message', 'لا تُنهي عضويّتك بنفسك.');
  end if;
  if not can_end_membership(p_actor, p_user) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN',
      'message', 'صلاحيتك لا تبلغ عضويّة هذا العضو — لا تُنهي إلّا عضويّة من تملك نزع مناصبه.');
  end if;
  if v_reason is null or char_length(v_reason) < 5 then
    return jsonb_build_object('ok', false, 'code', 'REASON_REQUIRED', 'message', 'اذكر سبب إنهاء العضوية (خمسة أحرف فأكثر).');
  end if;

  perform _apply_termination(p_actor, p_user, v_reason, 'to_volunteer');

  -- من كان متطوّعًا قبل عضويّته يعود صفُّه نفسُه نشطًا، ويبقى خبرُ انتهائه السابق كما هو
  insert into volunteers (user_id, status, applied_at)
  values (p_user, 'active', now())
  on conflict (user_id) do update
    set status = 'active',
        returned_at = now();

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (p_actor, 'member_to_volunteer', 'profile', p_user::text, jsonb_build_object('reason', v_reason));

  return jsonb_build_object('ok', true, 'message', 'انتهت عضويّتُه، وصار متطوّعًا.');
end;
$function$;

revoke all on function public.move_member_to_volunteers(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.move_member_to_volunteers(uuid, uuid, text) to service_role;

comment on function public.move_member_to_volunteers(uuid, uuid, text) is
  'إنهاءُ العضويّة ونقلُ صاحبها إلى المتطوّعين في معاملةٍ واحدة. السلطةُ سلطةُ الإنهاء (can_end_membership)، ويُستدعى من الخادم بمفتاح الخدمة كأخيه terminate_membership.';

-- إعادةُ العضويّة تُنهي التطوّعَ الساري: العضوُ فوق المتطوّع لا معه (كما يفعل الإهداء).
-- وكانت الإعادةُ تترك من تطوّع بعد خروجه عضوًا ومتطوّعًا معًا.
create or replace function public.restore_membership(p_actor uuid, p_user uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_status text;
  v_reason text;
  v_at timestamptz;
begin
  select account_status, termination_reason, terminated_at into v_status, v_reason, v_at
  from profiles where id = p_user;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا وجود لهذا العضو.');
  end if;
  if v_status is distinct from 'suspended' then
    return jsonb_build_object('ok', false, 'code', 'NOT_TERMINATED', 'message', 'عضويّته ليست منتهية.');
  end if;
  if not can_end_membership(p_actor, p_user) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN',
      'message', 'صلاحيتك لا تبلغ عضويّة هذا العضو.');
  end if;

  if not exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active) then
    return jsonb_build_object('ok', false, 'code', 'NO_SEAT',
      'message', 'أسنِد له مقعدًا أوّلًا من تبويب تعيين المناصب، ثمّ أعِد عضويّتَه: لا عضويّةَ في أديب بلا مقعد.');
  end if;

  perform set_config('app.membership_gate', 'open', true);
  update profiles
  set account_status = 'active', termination_reason = null, updated_at = now()
  where id = p_user;
  perform set_config('app.membership_gate', '', true);

  update volunteers
  set status = 'former', ended_at = now(), ended_by = p_actor, end_reason = 'عادت عضويّته'
  where user_id = p_user and status = 'active';

  update volunteer_applications set status = 'withdrawn'
  where user_id = p_user and status = 'pending';

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (p_actor, 'restore_membership', 'profile', p_user::text,
          jsonb_build_object('previous_reason', v_reason, 'previous_terminated_at', v_at));

  return jsonb_build_object('ok', true, 'message', 'أُعيدت العضوية.');
end;
$function$;
