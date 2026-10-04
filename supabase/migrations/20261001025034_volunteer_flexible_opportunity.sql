-- ════════════════════════════════════════════════════════════════════════
-- النسخة: 20261001025034   الاسم: volunteer_flexible_opportunity
--
-- **الفرصةُ المرنة** (أمرُ المالك ٢٠٢٦-١٠-٠١: «فرصةٌ ما أبغاها مرتبطةً بيوم، بل مفتوحة»). عملٌ لا يومَ له ولا
-- ساعة (تصميمُ منشوراتِ حملة، كتابةُ محتوى): يقدّم المتطوّعُ على الفرصة كلِّها، وعددُها عليها، ولها **آخرُ
-- يومٍ اختياريّ** (`ends_on` بلا `starts_on`). فإن لم يكن لها يومٌ أخير أنهاها المشرفُ بيده (`ended_at`)،
-- وكذلك إن أراد إنهاءها قبل يومها الأخير. والحضورُ فيها **إنجاز**: العمودُ نفسُه (`attendance`) والكلمةُ
-- في الشاشة «أنجز / لم ينجز».
--   · `flexible`: مرنةٌ لا فتراتَ لها (يمنع المشغّلُ فترةً على مرنة).
--   · `ended_at`: إنهاءُ المشرف — تنقضي به الفرصةُ كما تنقضي بمضيّ يومها الأخير.
--   · قيدُ التاريخين: النهايةُ بلا بدايةٍ للمرنة وحدَها (آخرُ يومٍ لا مدى).
--   · الشهادةُ في المرنة: من يوم قبوله إلى يوم انقضائها (إنهاؤها، أو آخرُ يومها، أو يومُ الإصدار).
-- ════════════════════════════════════════════════════════════════════════

alter table public.volunteer_opportunities add column flexible boolean not null default false;
alter table public.volunteer_opportunities add column ended_at timestamptz;

comment on column public.volunteer_opportunities.flexible is
  'فرصةٌ مرنة: لا يومَ لها ولا ساعة ولا فترات. يقدّم المتطوّعُ عليها كلِّها، و`ends_on` آخرُ يومٍ اختياريّ (٢٠٢٦-١٠-٠١).';
comment on column public.volunteer_opportunities.ended_at is
  'إنهاءُ المشرف للفرصة المرنة: تنقضي به كما تنقضي بمضيّ يومها الأخير.';

alter table public.volunteer_opportunities drop constraint opportunity_dates;
alter table public.volunteer_opportunities add constraint opportunity_dates check (
  ends_on is null
  or (starts_on is not null and ends_on >= starts_on)
  or (flexible and starts_on is null)
);

-- الفتراتُ لا تقع على مرنة: المشغّلُ الذي يُزامن تاريخَ الفرصة بفتراتها يردّها أوّلًا
create or replace function public.sync_opportunity_dates_from_periods()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_opp uuid := coalesce(new.opportunity_id, old.opportunity_id);
  v_min date;
  v_max date;
begin
  if tg_op <> 'DELETE' and exists (select 1 from volunteer_opportunities where id = v_opp and flexible) then
    raise exception 'FLEXIBLE_HAS_NO_PERIODS';
  end if;

  select min(day), max(day) into v_min, v_max
  from volunteer_opportunity_periods where opportunity_id = v_opp;

  update volunteer_opportunities
  set starts_on = v_min,
      ends_on = case when v_max > v_min then v_max end,
      daily_from = null, daily_to = null, duration_note = null, seats = null,
      updated_at = now()
  where id = v_opp;
  return null;
end;
$function$;

-- الغيابُ في المرنة «لم ينجز العمل» لا «لم يحضر الفرصة»
create or replace function public.mark_volunteer_attendance(p_id uuid, p_attendance text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_actor uuid := auth.uid();
  v_app   volunteer_applications%rowtype;
  v_flex  boolean;
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
  if exists (
    select 1 from participation_certificates c
    join volunteer_applications a on a.id = c.application_id
    where a.user_id = v_app.user_id and a.opportunity_id = v_app.opportunity_id and c.status = 'active'
  ) then
    return jsonb_build_object('ok', false, 'code', 'CERT_ISSUED',
      'message', 'صدرت شهادتُه، فلا يُبدَّل حضورُه. أبطِل الشهادةَ أوّلًا.');
  end if;
  select flexible into v_flex from volunteer_opportunities where id = v_app.opportunity_id;

  update volunteer_applications
  set attendance = p_attendance, attendance_at = now(), attendance_by = v_actor,
      deserves_certificate = case when p_attendance = 'absent' then false else deserves_certificate end,
      denial_reason = case
        when p_attendance = 'absent' then coalesce(nullif(btrim(coalesce(denial_reason,'')), ''),
          case when v_flex then 'لم ينجز العمل' else 'لم يحضر الفرصة' end)
        else denial_reason end
  where id = p_id;

  return jsonb_build_object('ok', true, 'message', case
    when v_flex then case when p_attendance = 'attended' then 'أُشِّر منجِزًا.' else 'أُشِّر غيرَ منجِز.' end
    else case when p_attendance = 'attended' then 'أُشِّر حاضرًا.' else 'أُشِّر غائبًا.' end end);
end;
$function$;

-- الشهادةُ في المرنة: من يوم قبوله إلى يوم انقضائها
create or replace function public.issue_participation_certificate(p_application_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $function$
declare
  v_actor uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Riyadh')::date;
  v_app   volunteer_applications%rowtype;
  v_opp   volunteer_opportunities%rowtype;
  v_name  text;
  v_gender text;
  v_committee text;
  v_serial text;
  v_from  date;
  v_to    date;
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
  if exists (
    select 1 from participation_certificates c
    join volunteer_applications a on a.id = c.application_id
    where a.user_id = v_app.user_id and a.opportunity_id = v_app.opportunity_id and c.status = 'active'
  ) then
    return jsonb_build_object('ok', false, 'code', 'ALREADY_ISSUED', 'message', 'صدرت شهادتُه من قبل.');
  end if;
  if exists (
    select 1 from volunteer_applications a
    where a.user_id = v_app.user_id and a.opportunity_id = v_app.opportunity_id and a.status = 'accepted'
      and (a.attendance is null or (a.attendance = 'attended' and a.deserves_certificate is null))
  ) then
    return jsonb_build_object('ok', false, 'code', 'PERIODS_PENDING',
      'message', 'له في الفرصة فترةٌ لم يُسجَّل حضورُها أو تقييمُها بعد. أكملها ثمّ أصدر الشهادة.');
  end if;

  select * into v_opp from volunteer_opportunities where id = v_app.opportunity_id;
  select btrim(full_name), gender into v_name, v_gender from profiles where id = v_app.user_id;
  if v_name is null or char_length(v_name) < 3 then
    return jsonb_build_object('ok', false, 'code', 'NO_NAME', 'message', 'اسمُ المتطوّع ناقص.');
  end if;
  select committee_name_ar into v_committee from committees where id = v_opp.committee_id;

  select min(p.day), max(p.day) into v_from, v_to
  from volunteer_applications a join volunteer_opportunity_periods p on p.id = a.period_id
  where a.user_id = v_app.user_id and a.opportunity_id = v_app.opportunity_id
    and a.status = 'accepted' and a.attendance = 'attended' and a.deserves_certificate is true;
  if v_from is null then
    if v_opp.flexible then
      -- المرنة: من يوم قبوله إلى يوم انقضائها (إنهاؤها، أو آخرُ يومها، أو يومُ الإصدار)، ولا تسبق النهايةُ البداية
      v_from := coalesce((v_app.decided_at at time zone 'Asia/Riyadh')::date, v_today);
      v_to := least(coalesce((v_opp.ended_at at time zone 'Asia/Riyadh')::date, v_opp.ends_on, v_today), v_today);
      if v_to <= v_from then v_to := null; end if;
    else
      v_from := coalesce(v_opp.starts_on, v_today);
      v_to := v_opp.ends_on;
    end if;
  elsif v_to = v_from then
    v_to := null;
  end if;

  v_serial := 'ADEEB-VOL-' || extract(year from v_today)::text || '-'
              || lpad(nextval('participation_certificate_serial_seq')::text, 4, '0') || '-'
              || upper(encode(gen_random_bytes(3), 'hex'));

  delete from participation_certificates where application_id = p_application_id and status = 'revoked';

  insert into participation_certificates
    (application_id, user_id, serial, holder_name, holder_gender, opportunity_title, committee_name,
     served_from, served_to, issued_by)
  values
    (p_application_id, v_app.user_id, v_serial, v_name, v_gender, v_opp.title, v_committee,
     v_from, v_to, v_actor)
  returning id into v_id;

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (v_actor, 'issue_participation_certificate', 'profile', v_app.user_id::text,
          jsonb_build_object('certificate_id', v_id, 'serial', v_serial, 'opportunity', v_opp.title));

  return jsonb_build_object('ok', true, 'id', v_id, 'serial', v_serial,
    'message', format('صدرت شهادةُ المشاركة برقم %s.', v_serial));
end;
$function$;
