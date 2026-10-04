-- ════════════════════════════════════════════════════════════════════════
-- النسخة: 20261001020156   الاسم: volunteer_opportunity_periods
--
-- **فتراتُ الفرصة** (أمرُ المالك ٢٠٢٦-١٠-٠١: «فرصةُ يومٍ فيها فترتان»). وقراراتُه:
--   · المتطوّعُ **يختار فترة** عند التقديم، ولكلّ فترةٍ مقاعدُها وطلباتُها وحضورُها.
--   · **لكلّ يومٍ فتراتُه**: الفترةُ يومٌ وساعتان (لا ساعتان تتكرّران على مدى).
--   · يقدّم على **فترةٍ أو أكثر** في الفرصة نفسِها.
--   · **شهادةٌ واحدةٌ للفرصة** وإن حضر فترتين، ومدّتُها من أوّل ما حضر إلى آخره.
--
-- والفرصُ القائمةُ قبلها (خمسٌ، كلُّها مضى موعدُها) تبقى سجلًّا بلا فترات: طلباتُها بلا `period_id`،
-- ومقاعدُها وتواريخُها على الفرصة كما كانت. والفرصةُ ذاتُ الفترات تُشتقّ تواريخُها منها (`starts_on` أوّلُ
-- يوم، و`ends_on` آخرُه إن تعدّد) بمشغّلٍ واحد، فكلُّ قارئٍ للتاريخ اليوم (الكرت، والسجلّ، والشهادة،
-- وحسابُ المتطوّع) يبقى صادقًا بلا تعديل؛ ومقاعدُها وساعاتُها على الفترات لا عليها.
-- ════════════════════════════════════════════════════════════════════════

-- ١) الفترات ─────────────────────────────────────────────────────────────
create table public.volunteer_opportunity_periods (
  id             uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.volunteer_opportunities(id) on delete cascade,
  day            date not null,
  starts_at      time not null,
  ends_at        time not null,
  -- `null` = بلا سقف
  seats          integer,
  created_at     timestamptz not null default now(),
  constraint period_seats check (seats is null or seats > 0),
  -- وتعبر منتصفَ الليل كساعتَي الفرصة (أقرّه المالك ٢٠٢٦-٠٩-٣٠)، والممنوعُ المدى الصفريّ وحدَه
  constraint period_hours check (ends_at <> starts_at),
  -- هويّةٌ مركّبةٌ يتعلّق بها الطلب، فلا يُربط طلبُ فرصةٍ بفترةِ غيرها
  constraint period_identity unique (id, opportunity_id)
);
create index volunteer_opportunity_periods_opp_idx on public.volunteer_opportunity_periods (opportunity_id, day, starts_at);

comment on table public.volunteer_opportunity_periods is
  'فتراتُ الفرصة التطوّعيّة: يومٌ وساعتان ومقاعد. المتطوّعُ يقدّم على فترةٍ أو أكثر (٢٠٢٦-١٠-٠١).';

alter table public.volunteer_opportunity_periods enable row level security;
-- يقرؤها من يقرأ فرصتَها (سياسةُ `volunteer_opportunities_select` نفسُها)، والكتابةُ بمفتاح الخدمة وحدَه
create policy volunteer_opportunity_periods_select on public.volunteer_opportunity_periods
  for select using (
    exists (
      select 1 from public.volunteer_opportunities o
      where o.id = opportunity_id
        and (check_user_permission((select auth.uid()), 'manage_volunteering')
             or (o.status <> 'draft' and is_active_volunteer((select auth.uid()))))
    )
  );

-- ٢) تواريخُ الفرصة تتبع فتراتِها ─────────────────────────────────────────
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
  select min(day), max(day) into v_min, v_max
  from volunteer_opportunity_periods where opportunity_id = v_opp;

  update volunteer_opportunities
  set starts_on = v_min,
      ends_on = case when v_max > v_min then v_max end,
      -- الساعاتُ والمقاعدُ على الفترات؛ وحقولُ الفرصة القديمة تُخلى فلا يُقرأ منها وقتٌ آخر
      daily_from = null, daily_to = null, duration_note = null, seats = null,
      updated_at = now()
  where id = v_opp;
  return null;
end;
$function$;

create trigger volunteer_opportunity_periods_sync_dates
  after insert or update or delete on public.volunteer_opportunity_periods
  for each row execute function public.sync_opportunity_dates_from_periods();

-- ٣) الطلبُ على فترة ────────────────────────────────────────────────────
alter table public.volunteer_applications add column period_id uuid;
alter table public.volunteer_applications
  add constraint volunteer_applications_period_fkey
  foreign key (period_id, opportunity_id)
  references public.volunteer_opportunity_periods (id, opportunity_id);
create index volunteer_applications_period_idx on public.volunteer_applications (period_id);

comment on column public.volunteer_applications.period_id is
  'الفترةُ المقدَّمُ عليها. `null` لطلبات الفرص القديمة التي لا فتراتَ لها.';

-- طلبٌ واحدٌ لكلّ متطوّعٍ في الفترة، وواحدٌ في الفرصة القديمة كما كان
alter table public.volunteer_applications drop constraint volunteer_applications_opportunity_id_user_id_key;
create unique index volunteer_applications_period_user_key
  on public.volunteer_applications (period_id, user_id) where period_id is not null;
create unique index volunteer_applications_legacy_user_key
  on public.volunteer_applications (opportunity_id, user_id) where period_id is null;

-- ٤) التقديمُ على الفرصة القديمة: كما كان، ولا يبلغ فرصةً ذاتَ فترات ───────────
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

-- ٥) التقديمُ على فترةٍ أو أكثر ─────────────────────────────────────────
create or replace function public.apply_for_periods(p_opportunity_id uuid, p_period_ids uuid[])
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user   uuid := auth.uid();
  v_today  date := (now() at time zone 'Asia/Riyadh')::date;
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
    if v_period.day < v_today then raise exception 'PERIOD_PASSED'; end if;
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

-- ٦) القبول: مقاعدُ الفترة، والتقديمُ ينتهي حين تمتلئ الفتراتُ كلُّها ─────────
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

  if p_accept then
    if v_app.period_id is not null then
      -- مقاعدُ الفترة لا الفرصة
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
      -- الفرصةُ القديمة: لا عدَّ لمفتوحة (`seats is null` يعني لا سقف)
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

    -- التقديمُ ينتهي في المعاملة نفسِها حين لا يبقى مقعدٌ في الفرصة كلِّها: في القديمة باكتمال عددها،
    -- وفي ذات الفترات حين تمتلئ فتراتُها كلُّها (وفترةٌ بلا سقفٍ لا تمتلئ أبدًا)
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

-- ٧) الحضورُ والتقييم: الشهادةُ للفرصة لا للطلب، فحارسُها يسأل عن شهادة المتطوّع في الفرصة ─────
create or replace function public.mark_volunteer_attendance(p_id uuid, p_attendance text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
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
        when p_attendance = 'absent' then coalesce(nullif(btrim(coalesce(denial_reason,'')), ''), 'لم يحضر الفرصة')
        else denial_reason end
  where id = p_id;

  return jsonb_build_object('ok', true, 'message',
    case when p_attendance = 'attended' then 'أُشِّر حاضرًا.' else 'أُشِّر غائبًا.' end);
end;
$function$;

create or replace function public.evaluate_volunteer(p_id uuid, p_deserves boolean, p_denial_reason text default null::text, p_admin_note text default null::text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
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
  if exists (
    select 1 from participation_certificates c
    join volunteer_applications a on a.id = c.application_id
    where a.user_id = v_app.user_id and a.opportunity_id = v_app.opportunity_id and c.status = 'active'
  ) then
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
$function$;

-- ٨) الشهادةُ: واحدةٌ للمتطوّع في الفرصة، بعد أن يُحسم كلُّ ما قُبل فيه ─────────
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
  -- واحدةٌ للفرصة: ولو صدرت على فترةٍ أخرى له
  if exists (
    select 1 from participation_certificates c
    join volunteer_applications a on a.id = c.application_id
    where a.user_id = v_app.user_id and a.opportunity_id = v_app.opportunity_id and c.status = 'active'
  ) then
    return jsonb_build_object('ok', false, 'code', 'ALREADY_ISSUED', 'message', 'صدرت شهادتُه من قبل.');
  end if;
  -- ولا تصدر وفي الفرصة فترةٌ له لم يُحسم حضورُها أو تقييمُها: لو صدرت لأُقفل ما بعدها
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

  -- المدّةُ: من أوّل فترةٍ حضرها واستحقّ إلى آخرها؛ والفرصةُ القديمةُ بتاريخيها كما كانت
  select min(p.day), max(p.day) into v_from, v_to
  from volunteer_applications a join volunteer_opportunity_periods p on p.id = a.period_id
  where a.user_id = v_app.user_id and a.opportunity_id = v_app.opportunity_id
    and a.status = 'accepted' and a.attendance = 'attended' and a.deserves_certificate is true;
  if v_from is null then
    v_from := coalesce(v_opp.starts_on, v_today);
    v_to := v_opp.ends_on;
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
