-- ════════════════════════════════════════════════════════════════════════
-- النسخة: 20261002221856   الاسم: volunteer_time_windows
--
-- **الوقتُ يُغلق التطوّعَ كما يُغلقه اكتمالُ العدد** (جردُ الخلل، أمرُ المالك ٢٠٢٦-١٠-٠٣). كان التقديمُ يُقفل
-- بالحالة وحدَها، والحالةُ لا تتغيّر إلّا بيد المشرف أو باكتمال العدد: فرصةٌ مضى موعدُها تبقى «متاحة» ويُقبل
-- عليها التقديم، والفترةُ تُفحص باليوم لا بالساعة، والطلبُ المعلّقُ في فرصةٍ مضت يبقى «قيد المراجعة» أبدًا.
--   · **نوافذ الوقت بساعة الرياض**: بدايةُ الفترة ونهايتُها (والعابرةُ منتصفَ الليل تنتهي في غدها)، ونهايةُ
--     التقديم على الفرصة: **انتهاءُ آخر ساعةٍ منها** (أمرُه: «لا عند بدايتها بل بانتهاء آخر ساعة»).
--       ذاتُ الفترات: نهايةُ آخر فترة · القديمةُ: آخرُ يومها بساعة نهايتها اليوميّة أو بانقضائه ·
--       المرنةُ: إنهاءُ المشرف أو انقضاءُ آخر يومها، وبلا يومٍ أخيرٍ لا ينتهي تقديمُها بالوقت.
--   · **التقديم**: الفترةُ تُقبل حتى تنتهي، والفرصةُ بلا فتراتٍ حتى تنتهي نافذتُها.
--   · **المراجعة**: لا قبولَ ولا ردَّ بعد انتهاء موعد الطلب؛ يصير الطلبُ «فات قبل المراجعة» (`expired`)
--     لا «مرفوضًا»، فلا يُحمَّل صاحبُه ما لم يفعله.
--   · **الحضور**: لا يُسجَّل قبل بداية فترته (أو موعد الفرصة القديمة)، والمرنةُ بلا بدايةٍ فيُسجَّل إنجازُها متى كان.
--   · **الكنّاس** كلَّ دقيقة (سنّةُ الاستبيانات): يُفيت المعلّقَ الذي انتهى موعدُه، ويُغلق التقديمَ على ما انتهت
--     نافذتُه، فتصدق الشارةُ والأعدادُ وصفحةُ المتطوّع بلا يد.
-- ════════════════════════════════════════════════════════════════════════

-- ١) «فات قبل المراجعة» حالٌ للطلب
alter table public.volunteer_applications drop constraint volunteer_applications_status_check;
alter table public.volunteer_applications add constraint volunteer_applications_status_check
  check (status = any (array['pending','accepted','rejected','withdrawn','expired']));

-- ٢) نوافذُ الوقت — مصدرٌ واحدٌ تقرؤه الدوالُّ والكنّاس
create or replace function public.volunteer_period_starts(p public.volunteer_opportunity_periods)
returns timestamptz language sql stable set search_path = public, pg_temp
as $$ select (p.day + p.starts_at) at time zone 'Asia/Riyadh' $$;

create or replace function public.volunteer_period_ends(p public.volunteer_opportunity_periods)
returns timestamptz language sql stable set search_path = public, pg_temp
as $$
  select (p.day + p.ends_at + case when p.ends_at <= p.starts_at then interval '1 day' else interval '0' end)
         at time zone 'Asia/Riyadh'
$$;

/** بدايةُ الفرصة القديمة (بلا فترات) لتسجيل حضورها؛ والمرنةُ وما لا موعدَ له: null (لا بدايةَ تُنتظر). */
create or replace function public.volunteer_opportunity_starts(o public.volunteer_opportunities)
returns timestamptz language sql stable set search_path = public, pg_temp
as $$
  select case when o.flexible or o.starts_on is null then null
              else (o.starts_on + coalesce(o.daily_from, time '00:00')) at time zone 'Asia/Riyadh' end
$$;

/** نهايةُ التقديم على الفرصة = انتهاءُ آخر ساعةٍ منها؛ null = لا تنتهي بالوقت. */
create or replace function public.volunteer_apply_ends(o public.volunteer_opportunities)
returns timestamptz language sql stable set search_path = public, pg_temp
as $$
  select case
    when o.flexible then coalesce(o.ended_at, (o.ends_on + 1)::timestamp at time zone 'Asia/Riyadh')
    when exists (select 1 from volunteer_opportunity_periods p where p.opportunity_id = o.id) then
      (select max(volunteer_period_ends(p)) from volunteer_opportunity_periods p where p.opportunity_id = o.id)
    when coalesce(o.ends_on, o.starts_on) is null then null
    when o.daily_to is not null then
      (coalesce(o.ends_on, o.starts_on) + o.daily_to
        + case when o.daily_from is not null and o.daily_to <= o.daily_from then interval '1 day' else interval '0' end)
      at time zone 'Asia/Riyadh'
    else (coalesce(o.ends_on, o.starts_on) + 1)::timestamp at time zone 'Asia/Riyadh'
  end
$$;

/** أانتهى موعدُ هذا الطلب؟ فترتُه إن كانت له فترة، وإلّا نافذةُ فرصته. */
create or replace function public.volunteer_application_over(a public.volunteer_applications)
returns boolean language sql stable set search_path = public, pg_temp
as $$
  select case when a.period_id is not null
    then (select volunteer_period_ends(p) <= now() from volunteer_opportunity_periods p where p.id = a.period_id)
    else coalesce((select volunteer_apply_ends(o) <= now() from volunteer_opportunities o where o.id = a.opportunity_id), false)
  end
$$;

-- ٣) التقديمُ على الفترات: الفترةُ تُقبل حتى تنتهي (لا حتى ينقضي يومُها)
create or replace function public.apply_for_periods(p_opportunity_id uuid, p_period_ids uuid[])
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user   uuid := auth.uid();
  v_opp    volunteer_opportunities%rowtype;
  v_gender text;
  v_period volunteer_opportunity_periods%rowtype;
  v_taken  integer;
  v_n      integer := 0;
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not is_active_volunteer(v_user) then raise exception 'NOT_VOLUNTEER'; end if;

  select * into v_opp from volunteer_opportunities where id = p_opportunity_id;
  if not found then raise exception 'OPPORTUNITY_NOT_FOUND'; end if;
  if v_opp.status <> 'open' then raise exception 'OPPORTUNITY_CLOSED'; end if;

  select gender into v_gender from profiles where id = v_user;
  if v_opp.target_gender is not null and v_opp.target_gender is distinct from v_gender then
    raise exception 'WRONG_GENDER';
  end if;

  if p_period_ids is null or cardinality(p_period_ids) = 0 then raise exception 'NO_PERIOD'; end if;
  if (select count(*) from volunteer_opportunity_periods
      where id = any(p_period_ids) and opportunity_id = p_opportunity_id)
     <> (select count(distinct x) from unnest(p_period_ids) x) then
    raise exception 'BAD_PERIOD';
  end if;

  for v_period in
    select * from volunteer_opportunity_periods
    where id = any(p_period_ids) and opportunity_id = p_opportunity_id
    order by day, starts_at
    for update
  loop
    if volunteer_period_ends(v_period) <= now() then raise exception 'PERIOD_PASSED'; end if;
    -- المقدَّمُ عليها (معلّقًا أو مقبولًا أو مردودًا) لا يُعاد؛ والمسحوبُ يُستأنف
    if exists (
      select 1 from volunteer_applications
      where period_id = v_period.id and user_id = v_user and status in ('pending','accepted','rejected')
    ) then continue; end if;
    if v_period.seats is not null then
      select count(*) into v_taken from volunteer_applications
      where period_id = v_period.id and status = 'accepted';
      if v_taken >= v_period.seats then raise exception 'PERIOD_FULL'; end if;
    end if;

    insert into volunteer_applications (opportunity_id, period_id, user_id, status)
    values (p_opportunity_id, v_period.id, v_user, 'pending')
    on conflict (period_id, user_id) where period_id is not null do update
      set status = 'pending', applied_at = now(),
          decided_by = null, decided_at = null, decision_reason = null;
    v_n := v_n + 1;
  end loop;

  if v_n = 0 then raise exception 'ALREADY_APPLIED'; end if;
  return v_n;
end;
$function$;

-- ٤) التقديمُ على الفرصة بلا فترات (القديمة والمرنة): حتى تنتهي نافذتُها
create or replace function public.apply_for_opportunity(p_opportunity_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user uuid := auth.uid();
  v_opp  volunteer_opportunities%rowtype;
  v_gender text;
  v_id uuid;
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not is_active_volunteer(v_user) then raise exception 'NOT_VOLUNTEER'; end if;

  select * into v_opp from volunteer_opportunities where id = p_opportunity_id;
  if not found then raise exception 'OPPORTUNITY_NOT_FOUND'; end if;
  if v_opp.status <> 'open' then raise exception 'OPPORTUNITY_CLOSED'; end if;
  if exists (select 1 from volunteer_opportunity_periods where opportunity_id = p_opportunity_id) then
    raise exception 'PERIOD_REQUIRED';
  end if;
  if volunteer_apply_ends(v_opp) <= now() then raise exception 'OPPORTUNITY_CLOSED'; end if;

  select gender into v_gender from profiles where id = v_user;
  if v_opp.target_gender is not null and v_opp.target_gender is distinct from v_gender then
    raise exception 'WRONG_GENDER';
  end if;

  if exists (
    select 1 from volunteer_applications
    where opportunity_id = p_opportunity_id and user_id = v_user and period_id is null
      and status in ('pending','accepted','rejected')
  ) then raise exception 'ALREADY_APPLIED'; end if;

  insert into volunteer_applications (opportunity_id, user_id, status)
  values (p_opportunity_id, v_user, 'pending')
  on conflict (opportunity_id, user_id) where period_id is null do update
    set status = 'pending', applied_at = now(),
        decided_by = null, decided_at = null, decision_reason = null
  returning id into v_id;

  return v_id;
end;
$function$;

-- ٥) المراجعة: لا قبولَ ولا ردَّ بعد انتهاء موعد الطلب، بل يفوت (ويبقى ما سواه كما كان)
create or replace function public.decide_volunteer_application(p_id uuid, p_accept boolean, p_reason text default null::text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_actor  uuid := auth.uid();
  v_app    volunteer_applications%rowtype;
  v_opp    volunteer_opportunities%rowtype;
  v_period volunteer_opportunity_periods%rowtype;
  v_taken  integer;
  v_closed boolean := false;
  v_full   boolean := false;
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
    return jsonb_build_object('ok', false, 'code', 'ALREADY_DECIDED', 'message', 'رُوجع هذا التقديم من قبل.');
  end if;

  select * into v_opp from volunteer_opportunities where id = v_app.opportunity_id for update;

  -- انتهى موعدُه قبل أن يُراجَع: يفوت الآن (لا ينتظر الكنّاس)، ولا يُقبل ولا يُردّ
  if volunteer_application_over(v_app) then
    update volunteer_applications set status = 'expired', decided_at = now() where id = p_id;
    return jsonb_build_object('ok', false, 'code', 'EXPIRED',
      'message', case when v_app.period_id is not null
        then 'انتهى موعدُ هذه الفترة قبل مراجعة الطلب، فلا يُقبل ولا يُردّ.'
        else 'انتهى موعدُ الفرصة قبل مراجعة الطلب، فلا يُقبل ولا يُردّ.' end);
  end if;

  if p_accept then
    if v_app.period_id is not null then
      select * into v_period from volunteer_opportunity_periods where id = v_app.period_id for update;
      if v_period.seats is not null then
        select count(*) into v_taken from volunteer_applications
        where period_id = v_app.period_id and status = 'accepted';
        if v_taken >= v_period.seats then
          return jsonb_build_object('ok', false, 'code', 'NO_SEATS',
            'message', format('اكتمل عددُ هذه الفترة (%s).', v_period.seats));
        end if;
        v_full := v_taken + 1 >= v_period.seats;
      end if;
    elsif v_opp.seats is not null then
      select count(*) into v_taken from volunteer_applications
      where opportunity_id = v_app.opportunity_id and status = 'accepted';
      if v_taken >= v_opp.seats then
        return jsonb_build_object('ok', false, 'code', 'NO_SEATS',
          'message', format('اكتمل عددُ المطلوبين (%s).', v_opp.seats));
      end if;
      v_full := v_taken + 1 >= v_opp.seats;
    end if;

    update volunteer_applications
    set status = 'accepted', decided_by = v_actor, decided_at = now(),
        decision_reason = nullif(btrim(coalesce(p_reason,'')), '')
    where id = p_id;

    if v_full and v_opp.status = 'open' then
      v_closed := v_app.period_id is null or not exists (
        select 1 from volunteer_opportunity_periods p
        where p.opportunity_id = v_opp.id
          and (p.seats is null
               or (select count(*) from volunteer_applications a
                   where a.period_id = p.id and a.status = 'accepted') < p.seats)
      );
      if v_closed then
        update volunteer_opportunities
        set status = 'closed', closed_at = now(), updated_at = now()
        where id = v_opp.id;
      end if;
    end if;

    return jsonb_build_object('ok', true, 'status', 'accepted', 'closed', v_closed,
      'message', case
        when v_closed and v_app.period_id is not null then 'قُبل المتطوّع، وامتلأت الفتراتُ كلُّها فانتهى التقديم.'
        when v_closed then format('قُبل المتطوّع، واكتمل العدد (%s) فانتهى التقديم.', v_opp.seats)
        when v_full then 'قُبل المتطوّع، واكتمل عددُ هذه الفترة.'
        else 'قُبل المتطوّع في الفرصة.' end);
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
$function$;

-- ٦) الحضور: لا يُسجَّل قبل بداية فترته (أو موعد الفرصة القديمة)؛ والمرنةُ متى كان
create or replace function public.mark_volunteer_attendance(p_id uuid, p_attendance text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_actor uuid := auth.uid();
  v_app   volunteer_applications%rowtype;
  v_opp   volunteer_opportunities%rowtype;
  v_flex  boolean;
  v_start timestamptz;
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

  select * into v_opp from volunteer_opportunities where id = v_app.opportunity_id;
  v_flex := v_opp.flexible;
  if v_app.period_id is not null then
    select volunteer_period_starts(p) into v_start from volunteer_opportunity_periods p where p.id = v_app.period_id;
  else
    v_start := volunteer_opportunity_starts(v_opp);
  end if;
  if v_start is not null and v_start > now() then
    return jsonb_build_object('ok', false, 'code', 'NOT_STARTED',
      'message', case when v_app.period_id is not null
        then 'لم تبدأ الفترةُ بعد، فلا يُسجَّل حضورُها.'
        else 'لم يبدأ موعدُ الفرصة بعد، فلا يُسجَّل حضورُها.' end);
  end if;

  if exists (
    select 1 from participation_certificates c
    join volunteer_applications a on a.id = c.application_id
    where a.user_id = v_app.user_id and a.opportunity_id = v_app.opportunity_id and c.status = 'active'
  ) then
    return jsonb_build_object('ok', false, 'code', 'CERT_ISSUED',
      'message', 'صدرت شهادتُه، فلا يُبدَّل حضورُه. أبطِل الشهادةَ أوّلًا.');
  end if;

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

-- ٧) الكنّاس: يُفيت المعلّقَ الذي انتهى موعدُه، ويُغلق التقديمَ على ما انتهت نافذتُه
create or replace function public.sweep_volunteer_windows()
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_expired integer;
  v_closed  integer;
begin
  update volunteer_applications a
     set status = 'expired', decided_at = now()
   where a.status = 'pending' and volunteer_application_over(a);
  get diagnostics v_expired = row_count;

  update volunteer_opportunities o
     set status = 'closed', closed_at = now(), updated_at = now()
   where o.status = 'open' and volunteer_apply_ends(o) <= now();
  get diagnostics v_closed = row_count;

  return v_expired + v_closed;
end;
$function$;

revoke all on function public.sweep_volunteer_windows() from public, anon, authenticated;

select cron.schedule('volunteer-sweep-windows', '* * * * *', 'SELECT public.sweep_volunteer_windows();');
