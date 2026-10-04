-- ════════════════════════════════════════════════════════════════════════
-- النسخة: 20261002224443   الاسم: volunteer_excuse
--
-- **اعتذارُ المتطوّع المقبول** (أمرُ المالك ٢٠٢٦-١٠-٠٣، البند ٧ من جرد الخلل). كان السحبُ للمعلّق وحدَه، فمن قُبل ثمّ
-- عرض له ما يمنعه لم يجد بابًا إلّا الغياب، فيُسجَّل «غاب» ويُحرم الشهادة. فصار له أن **يعتذر** ما دامت فترتُه لم تبدأ:
--   · حالٌ جديدةٌ للطلب `excused` («اعتذر»)، **وسببُها إلزاميّ** (أمرُه: «اجعل كتابة السبب إلزاميًّا») يقرؤه المشرف.
--   · **مقعدُه يعود**: فرصةٌ أغلقها اكتمالُ العدد تُفتح ثانيةً ما دام في نافذتها وقت. ولا تُفتح ما أغلقه المشرفُ بيده
--     ولا ما أغلقه الوقت، فيُكتب لكلّ إغلاقٍ سببُه (`closed_reason`): اكتمالٌ · يدٌ · وقتٌ · إنهاء. والقديمُ بلا سبب
--     يُعامَل كإغلاق اليد (لا يُفتح).
-- ════════════════════════════════════════════════════════════════════════

-- ١) الاعتذارُ وسببُه
alter table public.volunteer_applications add column excuse_reason text, add column excused_at timestamptz;
alter table public.volunteer_applications drop constraint volunteer_applications_status_check;
alter table public.volunteer_applications add constraint volunteer_applications_status_check
  check (status = any (array['pending','accepted','rejected','withdrawn','expired','excused']));
alter table public.volunteer_applications add constraint application_excuse_reason
  check (status <> 'excused' or btrim(coalesce(excuse_reason, '')) <> '');
comment on column public.volunteer_applications.excuse_reason is
  'سببُ اعتذار المقبول قبل بداية فترته (إلزاميّ، ٢٠٢٦-١٠-٠٣). يقرؤه المشرفُ في سجلّ الفرصة.';

-- ٢) سببُ الإغلاق: الاكتمالُ وحدَه يُفتح ثانيةً إذا عاد مقعد
alter table public.volunteer_opportunities add column closed_reason text
  check (closed_reason is null or closed_reason in ('full','manual','time','ended'));
comment on column public.volunteer_opportunities.closed_reason is
  'لماذا انتهى التقديم: full اكتمالُ العدد · manual يدُ المشرف · time انتهاءُ النافذة · ended إنهاءُ المرنة. واعتذارُ مقبولٍ يفتح ما أغلقه full وحده.';

-- ٣) الاعتذار
create or replace function public.excuse_my_application(p_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user   uuid := auth.uid();
  v_app    volunteer_applications%rowtype;
  v_opp    volunteer_opportunities%rowtype;
  v_start  timestamptz;
  v_reopen boolean := false;
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if btrim(coalesce(p_reason, '')) = '' then raise exception 'REASON_REQUIRED'; end if;

  select * into v_app from volunteer_applications where id = p_id and user_id = v_user for update;
  if not found or v_app.status <> 'accepted' or v_app.attendance is not null then
    raise exception 'NOT_EXCUSABLE';
  end if;

  select * into v_opp from volunteer_opportunities where id = v_app.opportunity_id for update;
  if v_app.period_id is not null then
    select volunteer_period_starts(p) into v_start from volunteer_opportunity_periods p where p.id = v_app.period_id;
  else
    v_start := volunteer_opportunity_starts(v_opp);
  end if;
  -- بدأت فترتُه (أو موعدُ الفرصة القديمة)، أو انتهت المرنة: فات وقتُ الاعتذار
  if (v_start is not null and v_start <= now()) or volunteer_application_over(v_app) then
    raise exception 'ALREADY_STARTED';
  end if;

  update volunteer_applications
     set status = 'excused', excuse_reason = btrim(p_reason), excused_at = now()
   where id = p_id;

  -- مقعدُه يعود: ما أغلقه الاكتمالُ يُفتح ما دام في نافذته وقت
  if v_opp.status = 'closed' and v_opp.closed_reason = 'full' and v_opp.ended_at is null
     and coalesce(volunteer_apply_ends(v_opp) > now(), true) then
    update volunteer_opportunities
       set status = 'open', closed_at = null, closed_reason = null, updated_at = now()
     where id = v_opp.id;
    v_reopen := true;
  end if;

  return jsonb_build_object('ok', true, 'reopened', v_reopen);
end;
$function$;

revoke all on function public.excuse_my_application(uuid, text) from anon;

-- ٤) القبولُ يكتب «اكتمال» حين يُغلق (والباقي كما في volunteer_time_windows)
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
        set status = 'closed', closed_at = now(), closed_reason = 'full', updated_at = now()
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

-- ٥) الكنّاسُ يكتب «وقت» حين يُغلق
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
     set status = 'closed', closed_at = now(), closed_reason = 'time', updated_at = now()
   where o.status = 'open' and volunteer_apply_ends(o) <= now();
  get diagnostics v_closed = row_count;

  return v_expired + v_closed;
end;
$function$;

revoke all on function public.sweep_volunteer_windows() from public, anon, authenticated;
