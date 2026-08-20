-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260815091922   الاسم: volunteering_admin_actions

-- نظام التطوّع — أفعالُ المخوَّل (م٢ إلى م٥)
-- النسقُ نسقُ `issue_certificate`: jsonb {ok, code, message} لا استثناءات، فالشاشةُ تعرض ما يُقال لها.

-- ١) القبولُ والرفض — المقعدُ يُقتطع ههنا بقفل صفّ الفرصة (كما في book_activity_seat)
create or replace function public.decide_volunteer_application(
  p_id uuid, p_accept boolean, p_reason text default null
) returns jsonb
language plpgsql security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_actor uuid := auth.uid();
  v_app   volunteer_applications%rowtype;
  v_opp   volunteer_opportunities%rowtype;
  v_taken integer;
begin
  if v_actor is null then
    return jsonb_build_object('ok', false, 'code', 'NOT_AUTHENTICATED', 'message', 'لا جلسة.');
  end if;
  if not check_user_permission(v_actor, 'manage_volunteering') then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'صلاحيتك لا تبلغ إدارة التطوّع.');
  end if;

  select * into v_app from volunteer_applications where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا وجود لهذا التقديم.');
  end if;
  if v_app.status <> 'pending' then
    return jsonb_build_object('ok', false, 'code', 'ALREADY_DECIDED', 'message', 'حُسم هذا التقديم من قبل.');
  end if;

  -- القفلُ قبل العدّ: بلا هذا يقبل اثنان لمقعدٍ واحدٍ في اللحظة نفسها
  select * into v_opp from volunteer_opportunities where id = v_app.opportunity_id for update;

  if p_accept then
    select count(*) into v_taken from volunteer_applications
    where opportunity_id = v_app.opportunity_id and status = 'accepted';
    if v_taken >= v_opp.seats then
      return jsonb_build_object('ok', false, 'code', 'NO_SEATS',
        'message', format('اكتمل عددُ المطلوبين (%s).', v_opp.seats));
    end if;

    update volunteer_applications
    set status = 'accepted', decided_by = v_actor, decided_at = now(), decision_reason = nullif(btrim(coalesce(p_reason,'')), '')
    where id = p_id;

    return jsonb_build_object('ok', true, 'status', 'accepted', 'message', 'قُبل المتطوّع في الفرصة.');
  end if;

  if btrim(coalesce(p_reason, '')) = '' then
    return jsonb_build_object('ok', false, 'code', 'REASON_REQUIRED',
      'message', 'اكتب سببَ الرفض. الرفضُ الصامت أثقلُ على صاحبه.');
  end if;

  update volunteer_applications
  set status = 'rejected', decided_by = v_actor, decided_at = now(), decision_reason = btrim(p_reason)
  where id = p_id;

  return jsonb_build_object('ok', true, 'status', 'rejected', 'message', 'رُفض التقديم بسببه المكتوب.');
end;
$$;

-- ٢) تأشيرُ الحضور — والغائبُ تسقط عنه شهادتُه ولو أُشِّرت قبلُ
create or replace function public.mark_volunteer_attendance(p_id uuid, p_attendance text)
returns jsonb
language plpgsql security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_actor uuid := auth.uid();
  v_app   volunteer_applications%rowtype;
begin
  if v_actor is null or not check_user_permission(v_actor, 'manage_volunteering') then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'صلاحيتك لا تبلغ إدارة التطوّع.');
  end if;
  if p_attendance is null or p_attendance not in ('attended','absent') then
    return jsonb_build_object('ok', false, 'code', 'BAD_VALUE', 'message', 'الحضورُ حاضرٌ أو غائب.');
  end if;

  select * into v_app from volunteer_applications where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا وجود لهذا التقديم.');
  end if;
  if v_app.status <> 'accepted' then
    return jsonb_build_object('ok', false, 'code', 'NOT_ACCEPTED', 'message', 'الحضورُ يُؤشَّر للمقبولين وحدهم.');
  end if;
  if exists (select 1 from participation_certificates where application_id = p_id and status = 'active') then
    return jsonb_build_object('ok', false, 'code', 'CERT_ISSUED',
      'message', 'صدرت شهادتُه، فلا يُبدَّل حضورُه. أبطِل الشهادةَ أوّلًا.');
  end if;

  update volunteer_applications
  set attendance = p_attendance, attendance_at = now(), attendance_by = v_actor,
      deserves_certificate = case when p_attendance = 'absent' then false else deserves_certificate end,
      denial_reason = case
        when p_attendance = 'absent' then coalesce(nullif(btrim(coalesce(denial_reason,'')), ''), 'لم يحضر الفرصة')
        else denial_reason end
  where id = p_id;

  return jsonb_build_object('ok', true, 'message',
    case when p_attendance = 'attended' then 'أُشِّر حاضرًا.' else 'أُشِّر غائبًا.' end);
end;
$$;

-- ٣) التقييم: أيستحقّ الشهادة؟ والحرمانُ مُسبَّب. والملاحظةُ الإداريّة تُكتب ههنا ولا تخرج لصاحبها.
create or replace function public.evaluate_volunteer(
  p_id uuid, p_deserves boolean, p_denial_reason text default null, p_admin_note text default null
) returns jsonb
language plpgsql security definer
set search_path to 'public', 'pg_temp'
as $$
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
  if v_app.status <> 'accepted' then
    return jsonb_build_object('ok', false, 'code', 'NOT_ACCEPTED', 'message', 'التقييمُ للمقبولين وحدهم.');
  end if;
  if v_app.attendance is null then
    return jsonb_build_object('ok', false, 'code', 'NO_ATTENDANCE', 'message', 'أشِّر حضورَه أوّلًا، ثمّ قيّمه.');
  end if;
  if p_deserves and v_app.attendance = 'absent' then
    return jsonb_build_object('ok', false, 'code', 'ABSENT', 'message', 'لا شهادةَ لغائب.');
  end if;
  if p_deserves is not true and btrim(coalesce(p_denial_reason, '')) = '' then
    return jsonb_build_object('ok', false, 'code', 'REASON_REQUIRED', 'message', 'اكتب سببَ الحرمان.');
  end if;
  if exists (select 1 from participation_certificates where application_id = p_id and status = 'active') then
    return jsonb_build_object('ok', false, 'code', 'CERT_ISSUED',
      'message', 'صدرت شهادتُه. أبطِلها أوّلًا إن أردت تغيير التقييم.');
  end if;

  update volunteer_applications
  set deserves_certificate = p_deserves,
      denial_reason = case when p_deserves then null else btrim(p_denial_reason) end,
      admin_note    = nullif(btrim(coalesce(p_admin_note, '')), ''),
      evaluated_by  = v_actor, evaluated_at = now()
  where id = p_id;

  return jsonb_build_object('ok', true, 'message',
    case when p_deserves then 'سُجّل استحقاقُه للشهادة.' else 'سُجّل حرمانُه بسببه.' end);
end;
$$;

-- ٤) إصدارُ شهادة المشاركة — لقطةٌ تُخزَّن، وسلسلةٌ لا تُخمَّن (نسقُ شهادة الخبرة)
create or replace function public.issue_participation_certificate(p_application_id uuid)
returns jsonb
language plpgsql security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_actor uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Riyadh')::date;
  v_app   volunteer_applications%rowtype;
  v_opp   volunteer_opportunities%rowtype;
  v_name  text;
  v_committee text;
  v_serial text;
  v_id uuid;
begin
  if v_actor is null or not check_user_permission(v_actor, 'manage_volunteering') then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'صلاحيتك لا تبلغ إدارة التطوّع.');
  end if;

  select * into v_app from volunteer_applications where id = p_application_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا وجود لهذا التقديم.');
  end if;
  if v_app.status <> 'accepted' or v_app.attendance is distinct from 'attended' then
    return jsonb_build_object('ok', false, 'code', 'NOT_ATTENDED', 'message', 'الشهادةُ لمن حضر من المقبولين.');
  end if;
  if v_app.deserves_certificate is not true then
    return jsonb_build_object('ok', false, 'code', 'NOT_DESERVING', 'message', 'لم يُسجَّل استحقاقُه للشهادة.');
  end if;
  if exists (select 1 from participation_certificates where application_id = p_application_id and status = 'active') then
    return jsonb_build_object('ok', false, 'code', 'ALREADY_ISSUED', 'message', 'صدرت شهادتُه من قبل.');
  end if;

  select * into v_opp from volunteer_opportunities where id = v_app.opportunity_id;
  select btrim(full_name) into v_name from profiles where id = v_app.user_id;
  if v_name is null or char_length(v_name) < 3 then
    return jsonb_build_object('ok', false, 'code', 'NO_NAME', 'message', 'اسمُ المتطوّع ناقص.');
  end if;
  select committee_name_ar into v_committee from committees where id = v_opp.committee_id;

  v_serial := 'ADEEB-VOL-' || extract(year from v_today)::text || '-'
              || lpad(nextval('participation_certificate_serial_seq')::text, 4, '0') || '-'
              || upper(encode(gen_random_bytes(3), 'hex'));

  -- الشهادةُ الباطلةُ تبقى في السجلّ مشطوبةً، والجديدةُ تحلّ محلَّها (القيدُ على المُصدَرة الحيّة)
  delete from participation_certificates where application_id = p_application_id and status = 'revoked';

  insert into participation_certificates
    (application_id, user_id, serial, holder_name, opportunity_title, committee_name, served_from, served_to, issued_by)
  values
    (p_application_id, v_app.user_id, v_serial, v_name, v_opp.title, v_committee,
     v_opp.starts_on, v_opp.ends_on, v_actor)
  returning id into v_id;

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (v_actor, 'issue_participation_certificate', 'profile', v_app.user_id::text,
          jsonb_build_object('certificate_id', v_id, 'serial', v_serial, 'opportunity', v_opp.title));

  return jsonb_build_object('ok', true, 'id', v_id, 'serial', v_serial,
    'message', format('صدرت شهادةُ المشاركة برقم %s.', v_serial));
end;
$$;

-- ٥) إبطالُ شهادةٍ خرجت بخطأ — تبقى مشطوبةً ولا تُنكَر
create or replace function public.revoke_participation_certificate(p_id uuid, p_reason text)
returns jsonb
language plpgsql security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null or not check_user_permission(v_actor, 'manage_volunteering') then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'صلاحيتك لا تبلغ إدارة التطوّع.');
  end if;
  if btrim(coalesce(p_reason, '')) = '' then
    return jsonb_build_object('ok', false, 'code', 'REASON_REQUIRED', 'message', 'اكتب سببَ الإبطال.');
  end if;

  update participation_certificates
  set status = 'revoked', revoked_by = v_actor, revoked_at = now(), revoke_reason = btrim(p_reason)
  where id = p_id and status = 'active';
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا شهادةَ حيّةً بهذا المعرّف.');
  end if;

  return jsonb_build_object('ok', true, 'message', 'أُبطلت الشهادة، وبقيت في السجلّ مشطوبة.');
end;
$$;

-- ٦) إنهاءُ التطوّع — مُسبَّبٌ دائمًا، فمقابلةُ القروب تحتاج أن تعرف من خرج
create or replace function public.end_volunteering(p_user uuid, p_reason text)
returns jsonb
language plpgsql security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null or not check_user_permission(v_actor, 'manage_volunteering') then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'صلاحيتك لا تبلغ إدارة التطوّع.');
  end if;
  if btrim(coalesce(p_reason, '')) = '' then
    return jsonb_build_object('ok', false, 'code', 'REASON_REQUIRED', 'message', 'اكتب سببَ الإنهاء.');
  end if;

  update volunteers
  set status = 'former', ended_at = now(), ended_by = v_actor, end_reason = btrim(p_reason)
  where user_id = p_user and status = 'active';
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_ACTIVE', 'message', 'ليس متطوّعًا نشطًا.');
  end if;

  update volunteer_applications set status = 'withdrawn'
  where user_id = p_user and status = 'pending';

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (v_actor, 'end_volunteering', 'profile', p_user::text, jsonb_build_object('reason', btrim(p_reason)));

  return jsonb_build_object('ok', true, 'message', 'أُنهي تطوّعُه، وبقي في السجلّ سابقًا.');
end;
$$;

-- ٧) الإهداء: عضويّةٌ ومنصبٌ وإنهاءُ تطوّعٍ في فعلٍ واحد.
-- والإسنادُ يمرّ بـ`assign_position` وحدَها (البابُ الوحيد للهيكلة)، فتحرسه سلطتُها كما تحرس غيرَه.
create or replace function public.grant_membership_to_volunteer(p_user uuid, p_committee_id integer)
returns jsonb
language plpgsql security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_actor uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Riyadh')::date;
  v_role  text;
  v_committee text;
  v_assign jsonb;
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

  -- الإسنادُ أوّلًا: لو ردّته سلطةُ الهيكلة لم يُكتب شيءٌ بعدُ
  v_assign := assign_position(v_actor, p_user, v_role, p_committee_id, null, false,
                              'إهداءُ عضويّةٍ لمتطوّع');
  if not coalesce((v_assign->>'ok')::boolean, false) then
    return v_assign;
  end if;

  update profiles set joined_date = coalesce(joined_date, v_today) where id = p_user;

  update volunteers
  set status = 'former', ended_at = now(), ended_by = v_actor, end_reason = 'نال العضويّة'
  where user_id = p_user;

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (v_actor, 'grant_membership', 'profile', p_user::text,
          jsonb_build_object('committee_id', p_committee_id, 'role', v_role, 'joined_date', v_today));

  return jsonb_build_object('ok', true, 'message',
    format('صار عضوًا في %s، وانتهى تطوّعُه.', v_committee));
end;
$$;
