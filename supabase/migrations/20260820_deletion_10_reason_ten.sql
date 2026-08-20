-- **سببُ الخروج عشرةُ محارفَ لا خمسة** — أمرُ المالك ٢٠ أغسطس ٢٠٢٦.
--
-- نزل الحدُّ خمسةً على سنّة سبب الإنذار، فرآه المالكُ في الشاشة يقبل كلمةً لا تقول شيئًا.
-- والسببُ يُقرأ بعد سنةٍ ليُفهَم، فرُفع إلى عشرة.
--
-- **ويتغيّر في أربعة مواضعَ معًا**: قيدُ الجدول، ودالّتا الطلب والإنهاء، وسببُ الردّ في
-- دالّة القضاء. وتوأمُه في الواجهة `EXIT_REASON_MIN` في `app/me/vocab.ts` — فمن غيّر
-- أحدَهما وجب أن يتبعه الآخر.

begin;

alter table public.membership_exit_requests drop constraint membership_exit_requests_reason_check;
alter table public.membership_exit_requests
  add constraint membership_exit_requests_reason_check check (length(btrim(reason)) >= 10);

create or replace function public.request_membership_exit(p_reason text)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_uid    uuid := auth.uid();
  v_door   text;
  v_reason text := btrim(coalesce(p_reason, ''));
  v_id     uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'no_session', 'message', 'لا جلسةَ لك.');
  end if;

  if length(v_reason) < 10 then
    return jsonb_build_object('ok', false, 'code', 'reason_required',
      'message', 'اكتب سببًا لا يقلّ عن عشرة محارف: خروجُك واقعةٌ تُقرأ بعد سنة، ولا تُقرأ بلا علّتها.');
  end if;

  v_door := membership_exit_door(v_uid);
  if v_door <> 'request' then
    return jsonb_build_object('ok', false, 'code', 'wrong_door', 'door', v_door,
      'message', 'ليس هذا بابَك.');
  end if;

  if exists (select 1 from membership_exit_requests r where r.user_id = v_uid and r.status = 'pending') then
    return jsonb_build_object('ok', false, 'code', 'already_pending', 'message', 'طلبُك قائمٌ ينتظر القرار.');
  end if;

  insert into membership_exit_requests (user_id, reason) values (v_uid, v_reason)
  returning id into v_id;

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (v_uid, 'request_membership_exit', 'profile', v_uid::text,
          jsonb_build_object('request_id', v_id, 'reason', v_reason));

  return jsonb_build_object('ok', true, 'id', v_id,
    'message', 'أُرسل طلبُك. يقضي فيه من يعلوك في الشجرة.');
end;
$$;

create or replace function public.end_my_membership(p_reason text)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_uid    uuid := auth.uid();
  v_door   text;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'no_session', 'message', 'لا جلسةَ لك.');
  end if;

  if length(v_reason) < 10 then
    return jsonb_build_object('ok', false, 'code', 'reason_required',
      'message', 'اكتب سببًا لا يقلّ عن عشرة محارف: خروجُك واقعةٌ تُقرأ بعد سنة، ولا تُقرأ بلا علّتها.');
  end if;

  v_door := membership_exit_door(v_uid);
  if v_door <> 'end_now' then
    return jsonb_build_object('ok', false, 'code', 'wrong_door', 'door', v_door, 'message', 'ليس هذا بابَك.');
  end if;

  perform _apply_termination(v_uid, v_uid, 'أنهى عضويّتَه بنفسه: ' || v_reason, 'self_exit');

  return jsonb_build_object('ok', true,
    'message', 'انتهت عضويّتُك. صرتَ صاحبَ حسابٍ في أديب، ولك أن تحذف حسابَك إن شئت.');
end;
$$;

create or replace function public.decide_membership_exit(p_request uuid, p_approve boolean, p_reason text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_actor  uuid := auth.uid();
  v_req    membership_exit_requests%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select * into v_req from membership_exit_requests where id = p_request for update;
  if not found or v_req.status <> 'pending' then
    return jsonb_build_object('ok', false, 'code', 'gone', 'message', 'هذا الطلبُ لم يعد قائمًا.');
  end if;

  if not can_decide_membership_exit(v_actor, v_req.user_id) then
    return jsonb_build_object('ok', false, 'code', 'forbidden',
      'message', 'ليس لك القضاءُ في هذا الطلب.');
  end if;

  if not p_approve then
    if v_reason is null or length(v_reason) < 10 then
      return jsonb_build_object('ok', false, 'code', 'reason_required',
        'message', 'اكتب سببَ الرفض في عشرة محارفَ فأكثر: من طلب الخروجَ يستحقّ جوابًا لا صمتًا.');
    end if;
    update membership_exit_requests
       set status = 'rejected', decided_by = v_actor, decided_at = now(), decision_reason = v_reason
     where id = p_request;

    insert into activity_log (user_id, action_type, target_type, target_id, details)
    values (v_actor, 'reject_membership_exit', 'profile', v_req.user_id::text,
            jsonb_build_object('request_id', p_request, 'reason', v_reason));

    return jsonb_build_object('ok', true, 'message', 'رُفض الطلب، ووصل صاحبَه سببُه.');
  end if;

  perform _apply_termination(v_actor, v_req.user_id,
    'أنهى عضويّتَه بطلبه: ' || v_req.reason, 'exit_request');

  update membership_exit_requests
     set status = 'approved', decided_by = v_actor, decided_at = now(), decision_reason = v_reason
   where id = p_request;

  return jsonb_build_object('ok', true, 'message', 'قُبل الطلب. انتهت عضويّتُه ونُزعت مقاعدُه، وصار صاحبَ حساب.');
end;
$$;

commit;
