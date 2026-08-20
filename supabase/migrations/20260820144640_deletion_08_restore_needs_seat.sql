-- **إعادةُ العضويّة تقول علّتَها** — تتمّةٌ لـ`20260820_deletion_07_termination_vacates_seat.sql`.
--
-- لمّا صار الإنهاءُ يُفرِّغ المقعد، صارت الإعادةُ تصطدم بحارس «لا عضويّةَ حيّةٌ بلا مقعد»
-- (٢٠٢٦-٠٨-٢٠) عند ختم المعاملة — فيسقط النداءُ باستثناءٍ خام، ويرى المسؤولُ رسالةَ خطأٍ
-- تقنيّةً بدل جوابٍ يفهمه.
--
-- فتُقدَّم العلّةُ إلى بابها: `restore_membership` تفحص المقعدَ أوّلًا وتردّ جوابًا عربيًّا
-- من قائمتها (`NO_SEAT`) كسائر أجوبتها. **والترتيبُ الذي يقوله الجوابُ هو الحكم**: يُسنَد
-- المقعدُ أوّلًا ثمّ تُعاد العضويّة، لأنّ العضويّةَ في أديب مقعدٌ لا صفة.

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

  -- المقعدُ يسبق العضويّة (2026-08-20): من خرج خلا مقعدُه، فلا تُحيا عضويّتُه في الهواء.
  if not exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active) then
    return jsonb_build_object('ok', false, 'code', 'NO_SEAT',
      'message', 'أسنِد له مقعدًا أوّلًا من تبويب تعيين المناصب، ثمّ أعِد عضويّتَه: لا عضويّةَ في أديب بلا مقعد.');
  end if;

  perform set_config('app.membership_gate', 'open', true);
  update profiles
  set account_status = 'active', termination_reason = null, updated_at = now()
  where id = p_user;
  perform set_config('app.membership_gate', '', true);

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (p_actor, 'restore_membership', 'profile', p_user::text,
          jsonb_build_object('previous_reason', v_reason, 'previous_terminated_at', v_at));

  return jsonb_build_object('ok', true, 'message', 'أُعيدت العضوية.');
end;
$function$;
