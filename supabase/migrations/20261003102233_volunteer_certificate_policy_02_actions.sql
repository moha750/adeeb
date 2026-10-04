-- ٣ ── ترشيحُ التميّز وإلغاؤه (جملةٌ فارغة تُلغيه)
create or replace function public.nominate_volunteer_distinction(p_id uuid, p_note text)
returns jsonb language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare
  v_actor uuid := auth.uid();
  v_app   volunteer_applications%rowtype;
  v_note  text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if v_actor is null or not check_user_permission(v_actor, 'manage_volunteering') then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'صلاحيتك لا تبلغ إدارة التطوّع.');
  end if;
  select * into v_app from volunteer_applications where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا وجود لهذا التقديم.');
  end if;
  if v_app.status <> 'accepted' or v_app.attendance is distinct from 'attended' then
    return jsonb_build_object('ok', false, 'code', 'NOT_ATTENDED', 'message', 'التميّزُ لمن حضر.');
  end if;
  if v_app.deserves_certificate is false then
    return jsonb_build_object('ok', false, 'code', 'WITHHELD', 'message', 'شهادتُه محجوبة. ارفع الحجبَ أوّلًا.');
  end if;
  if exists (
    select 1 from participation_certificates c join volunteer_applications a on a.id = c.application_id
    where a.user_id = v_app.user_id and a.opportunity_id = v_app.opportunity_id and c.status = 'active'
  ) then
    return jsonb_build_object('ok', false, 'code', 'CERT_ISSUED', 'message', 'صدرت شهادتُه. أبطِلها أوّلًا إن أردت ترشيحَه للتميّز.');
  end if;
  if v_note is not null and char_length(v_note) < 5 then
    return jsonb_build_object('ok', false, 'code', 'NOTE_SHORT', 'message', 'اكتب سببَ تميّزه، خمسةَ أحرفٍ فأكثر.');
  end if;
  if v_note is not null and char_length(v_note) > 300 then
    return jsonb_build_object('ok', false, 'code', 'NOTE_LONG', 'message', 'ثلاثمئة حرفٍ أقصى ما يُكتب.');
  end if;

  update volunteer_applications
     set distinction_note = v_note,
         distinguished_by = case when v_note is null then null else v_actor end,
         distinguished_at = case when v_note is null then null else now() end
   where user_id = v_app.user_id and opportunity_id = v_app.opportunity_id
     and status = 'accepted' and attendance = 'attended';

  return jsonb_build_object('ok', true, 'message',
    case when v_note is null then 'أُلغي ترشيحُه للتميّز.' else 'رُشّح للتميّز، وتصدر شهادتُه بختمه.' end);
end;
$$;

-- ٤ ── الحجبُ ورفعُه: استثناءٌ بسببٍ مكتوب
create or replace function public.withhold_volunteer_certificate(p_id uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare
  v_actor  uuid := auth.uid();
  v_app    volunteer_applications%rowtype;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if v_actor is null or not check_user_permission(v_actor, 'manage_volunteering') then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'صلاحيتك لا تبلغ إدارة التطوّع.');
  end if;
  select * into v_app from volunteer_applications where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا وجود لهذا التقديم.');
  end if;
  if v_app.status <> 'accepted' or v_app.attendance is distinct from 'attended' then
    return jsonb_build_object('ok', false, 'code', 'NOT_ATTENDED', 'message', 'الحجبُ لمن حضر، والغائبُ لا شهادةَ له أصلًا.');
  end if;
  if char_length(v_reason) < 5 then
    return jsonb_build_object('ok', false, 'code', 'REASON_REQUIRED', 'message', 'اكتب سببَ الحجب، خمسةَ أحرفٍ فأكثر.');
  end if;
  if exists (
    select 1 from participation_certificates c join volunteer_applications a on a.id = c.application_id
    where a.user_id = v_app.user_id and a.opportunity_id = v_app.opportunity_id and c.status = 'active'
  ) then
    return jsonb_build_object('ok', false, 'code', 'CERT_ISSUED', 'message', 'صدرت شهادتُه. أبطِلها من غرفة الشهادات إن لزم.');
  end if;

  update volunteer_applications
     set deserves_certificate = false, denial_reason = v_reason,
         evaluated_by = v_actor, evaluated_at = now(),
         distinction_note = null, distinguished_by = null, distinguished_at = null
   where user_id = v_app.user_id and opportunity_id = v_app.opportunity_id
     and status = 'accepted' and attendance = 'attended';

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (v_actor, 'withhold_participation_certificate', 'profile', v_app.user_id::text,
          jsonb_build_object('application_id', p_id, 'opportunity_id', v_app.opportunity_id, 'reason', v_reason));

  return jsonb_build_object('ok', true, 'message', 'حُجبت شهادتُه بسببه.');
end;
$$;

create or replace function public.release_volunteer_certificate(p_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare
  v_actor uuid := auth.uid();
  v_app   volunteer_applications%rowtype;
begin
  if v_actor is null or not check_user_permission(v_actor, 'manage_volunteering') then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'صلاحيتك لا تبلغ إدارة التطوّع.');
  end if;
  select * into v_app from volunteer_applications where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا وجود لهذا التقديم.');
  end if;
  if v_app.deserves_certificate is not false then
    return jsonb_build_object('ok', false, 'code', 'NOT_WITHHELD', 'message', 'شهادتُه غيرُ محجوبة.');
  end if;

  update volunteer_applications
     set deserves_certificate = null, denial_reason = null, evaluated_by = v_actor, evaluated_at = now()
   where user_id = v_app.user_id and opportunity_id = v_app.opportunity_id
     and status = 'accepted' and deserves_certificate is false;

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (v_actor, 'release_participation_certificate', 'profile', v_app.user_id::text,
          jsonb_build_object('application_id', p_id, 'opportunity_id', v_app.opportunity_id));

  return jsonb_build_object('ok', true, 'message', 'رُفع الحجب، وصارت شهادتُه جاهزةً للإصدار.');
end;
$$;

-- ٥ ── الملاحظةُ الإداريّة فعلٌ مستقلّ (كانت تُحفظ مع التقييم، فتتعطّل لمن لم يُقيَّم بعد)
create or replace function public.set_volunteer_admin_note(p_id uuid, p_note text)
returns jsonb language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare
  v_actor uuid := auth.uid();
  v_note  text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if v_actor is null or not check_user_permission(v_actor, 'manage_volunteering') then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'صلاحيتك لا تبلغ إدارة التطوّع.');
  end if;
  update volunteer_applications set admin_note = v_note where id = p_id and status = 'accepted';
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'الملاحظةُ للمقبولين وحدهم.');
  end if;
  return jsonb_build_object('ok', true, 'message', case when v_note is null then 'حُذفت الملاحظة.' else 'حُفظت الملاحظة.' end);
end;
$$;

-- الصلاحياتُ كسابقاتها: للجلسات المصادَق عليها وحدها، وصفحةُ التحقّق للجميع
revoke all on function public.nominate_volunteer_distinction(uuid, text) from public, anon;
revoke all on function public.withhold_volunteer_certificate(uuid, text) from public, anon;
revoke all on function public.release_volunteer_certificate(uuid) from public, anon;
revoke all on function public.set_volunteer_admin_note(uuid, text) from public, anon;
grant execute on function public.nominate_volunteer_distinction(uuid, text) to authenticated;
grant execute on function public.withhold_volunteer_certificate(uuid, text) to authenticated;
grant execute on function public.release_volunteer_certificate(uuid) to authenticated;
grant execute on function public.set_volunteer_admin_note(uuid, text) to authenticated;
