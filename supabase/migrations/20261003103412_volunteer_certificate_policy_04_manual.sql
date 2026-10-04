-- ٧ ── الإصدارُ اليدويّ: طلبٌ قائمٌ حاضرٌ غيرُ محجوبٍ يُصدَر له (كان يشترط «يستحقّ»)
create or replace function public.issue_manual_participation_certificate(p_user_id uuid, p_opportunity_id uuid, p_period_id uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path to 'public', 'extensions', 'pg_temp' as $$
declare
  v_actor  uuid := auth.uid();
  v_today  date := (now() at time zone 'Asia/Riyadh')::date;
  v_reason text := btrim(coalesce(p_reason, ''));
  v_opp    volunteer_opportunities%rowtype;
  v_day    date;
  v_app    volunteer_applications%rowtype;
  v_app_id uuid;
  v_res    jsonb;
begin
  if v_actor is null or not check_user_permission(v_actor, 'manage_volunteering') then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'صلاحيتك لا تبلغ إدارة التطوّع.');
  end if;
  if char_length(v_reason) < 5 then
    return jsonb_build_object('ok', false, 'code', 'REASON', 'message', 'اكتب سببَ الإصدار، خمسةَ أحرفٍ فأكثر.');
  end if;
  if not exists (select 1 from volunteers where user_id = p_user_id) then
    return jsonb_build_object('ok', false, 'code', 'NOT_VOLUNTEER', 'message', 'ليس في سجلّ المتطوّعين.');
  end if;

  select * into v_opp from volunteer_opportunities where id = p_opportunity_id;
  if not found or v_opp.status = 'draft' then
    return jsonb_build_object('ok', false, 'code', 'NO_OPPORTUNITY', 'message', 'لا فرصةَ منشورةً بهذا.');
  end if;

  if exists (select 1 from volunteer_opportunity_periods where opportunity_id = p_opportunity_id) then
    select day into v_day from volunteer_opportunity_periods where id = p_period_id and opportunity_id = p_opportunity_id;
    if v_day is null then
      return jsonb_build_object('ok', false, 'code', 'PERIOD', 'message', 'اختر الفترةَ التي شارك فيها.');
    end if;
    if v_day > v_today then
      return jsonb_build_object('ok', false, 'code', 'NOT_YET', 'message', 'لم يأتِ يومُ هذه الفترة بعد.');
    end if;
  else
    if p_period_id is not null then
      return jsonb_build_object('ok', false, 'code', 'PERIOD', 'message', 'هذه الفرصةُ بلا فترات.');
    end if;
    if not v_opp.flexible and v_opp.starts_on is not null and v_opp.starts_on > v_today then
      return jsonb_build_object('ok', false, 'code', 'NOT_YET', 'message', 'لم يأتِ موعدُ هذه الفرصة بعد.');
    end if;
  end if;

  select * into v_app from volunteer_applications
   where user_id = p_user_id and opportunity_id = p_opportunity_id
     and period_id is not distinct from p_period_id;
  if found then
    if v_app.status = 'accepted' and v_app.attendance = 'attended' and v_app.deserves_certificate is distinct from false then
      return issue_participation_certificate(v_app.id);
    end if;
    return jsonb_build_object('ok', false, 'code', 'HAS_APPLICATION',
      'message', 'له طلبٌ في هذه الفرصة. أكّد حضورَه من سجلّ الفرصة ثمّ أصدر شهادتَه.');
  end if;

  begin
    insert into volunteer_applications
      (opportunity_id, period_id, user_id, status, decided_by, decided_at,
       attendance, attendance_at, attendance_by, deserves_certificate, evaluated_by, evaluated_at, admin_note)
    values
      (p_opportunity_id, p_period_id, p_user_id, 'accepted', v_actor, now(),
       'attended', now(), v_actor, true, v_actor, now(), 'إصدارٌ بلا طلب: ' || v_reason)
    returning id into v_app_id;

    v_res := issue_participation_certificate(v_app_id);
    if coalesce((v_res ->> 'ok')::boolean, false) is not true then
      raise exception 'manual_issue_refused';
    end if;
  exception when raise_exception then
    if sqlerrm = 'manual_issue_refused' then
      return v_res;
    end if;
    raise;
  end;

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (v_actor, 'issue_manual_participation_certificate', 'profile', p_user_id::text,
          jsonb_build_object('application_id', v_app_id, 'opportunity', v_opp.title, 'reason', v_reason));

  return v_res;
end;
$$;
