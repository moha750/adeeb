-- منزلةُ صاحب الحساب في أدِيب — المصدرُ الواحد في القاعدة (قرار المالك ٢٠٢٦-١٠-٠٨).
-- كانت ثلاثُ دوالّ تحسبها بـ`joined_date` وحده: فالمتطوّعُ يُقرأ «صديق أدِيب» لأنّه لم ينضمّ،
-- والعضوُ السابقُ يُقرأ «عضو» لأنّ تاريخَ انضمامه باقٍ أرشيفًا (خلافًا لقرار ٢٠٢٦-١٠-٠٣).
-- فالحدُّ هنا هو حدُّ `is_adeeb_member` نفسُه، ثمّ التطوّعُ القائم كما يقرؤه `lib/deebo/viewer.ts`.
-- والمفتاحُ `visitor` باقٍ لصديق أدِيب كي لا يتبدّل عقدُ الدوالّ مع قارئيها؛ والجديدُ `volunteer`.
-- طُبّق حيًّا ٢٠٢٦-١٠-٠٨: من حجزوا ١٥٥ = ٢٣ عضوًا + ٢ متطوّعان + ١٣٠ صديقًا
-- (كانت القاعدةُ القديمة تقول ٢٦ عضوًا: ثلاثةٌ منهم أعضاءٌ سابقون).
create or replace function public.adeeb_standing(p_user uuid)
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select case
    when public.is_adeeb_member(p_user) then 'member'
    when exists (
      select 1 from public.volunteers v where v.user_id = p_user and v.status = 'active'
    ) then 'volunteer'
    else 'visitor'
  end;
$$;

-- لا تُنادى من المتصفّح: تكشف منزلةَ أيّ شخصٍ بمعرّفه. تناديها الدوالُّ المفوَّضة وحدَها.
revoke all on function public.adeeb_standing(uuid) from public, anon, authenticated;

create or replace function public.get_activity_attendance_list(p_activity_id uuid)
returns table(reservation_id uuid, full_name text, phone text, gender text, account_type text, attendance_status text, attended_at timestamp with time zone, whatsapp_confirmed_at timestamp with time zone)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare v_user_id uuid := auth.uid();
begin
    if v_user_id is null then raise exception 'NOT_AUTHENTICATED'; end if;
    if not check_user_permission(v_user_id, 'manage_activities') then raise exception 'NOT_AUTHORIZED'; end if;

    return query
    select r.id, p.full_name, p.phone, r.gender_at_booking,
           adeeb_standing(p.id),
           r.attendance_status, r.attended_at, r.whatsapp_confirmed_at
    from activity_reservations r
    join profiles p on p.id = r.user_id
    where r.activity_id = p_activity_id and r.status = 'confirmed'
    order by p.full_name;
end;
$function$;

create or replace function public.get_activity_full_details(p_activity_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
    v_user_id       uuid := auth.uid();
    v_is_admin      boolean;
    v_activity      activities%rowtype;
    v_window_close  timestamptz;
    v_activity_json jsonb;
    v_stats         jsonb;
    v_reservations  jsonb;
begin
    if v_user_id is null then raise exception 'NOT_AUTHENTICATED'; end if;
    v_is_admin := check_user_permission(v_user_id, 'manage_activities');
    if not v_is_admin then raise exception 'NOT_AUTHORIZED'; end if;

    select * into v_activity from activities where id = p_activity_id;
    if v_activity.id is null then raise exception 'ACTIVITY_NOT_FOUND'; end if;

    v_window_close := (v_activity.activity_date
                       + coalesce(v_activity.end_time, v_activity.start_time + interval '1 hour')
                      )::timestamptz + interval '1 hour';

    select to_jsonb(a) into v_activity_json from activities a where a.id = p_activity_id;

    select jsonb_build_object(
        'registered_count',          count(*) filter (where r.status = 'confirmed'),
        'whatsapp_confirmed_count',  count(*) filter (where r.status = 'confirmed' and r.whatsapp_confirmed_at is not null),
        'attended_count',            count(*) filter (where r.attendance_status = 'attended'),
        'no_show_count',             count(*) filter (
            where r.status = 'confirmed' and r.attendance_status = 'registered'
              and not v_activity.is_cancelled and now() > v_window_close),
        'pending_attendance_count',  count(*) filter (
            where r.status = 'confirmed' and r.attendance_status = 'registered'
              and (v_activity.is_cancelled or now() <= v_window_close)),
        'certificates_issued_count', count(*) filter (where r.certificate_serial is not null),
        'certificates_sent_count',   count(*) filter (where r.certificate_sent_at is not null),
        'cancelled_count',           count(*) filter (where r.status = 'cancelled'),
        'attendance_rate',           case
            when count(*) filter (where r.status = 'confirmed') = 0 then 0
            else round(count(*) filter (where r.attendance_status = 'attended')::numeric
                 / count(*) filter (where r.status = 'confirmed')::numeric, 4) end
    ) into v_stats from activity_reservations r where r.activity_id = p_activity_id;

    select coalesce(jsonb_agg(row_data order by row_data->>'reserved_at' desc), '[]'::jsonb)
    into v_reservations from (
        select jsonb_build_object(
            'id', r.id,
            'full_name', p.full_name,
            'phone', p.phone,
            'email', p.email,
            'gender_at_booking', r.gender_at_booking,
            'account_type', adeeb_standing(p.id),
            'status', r.status,
            'reserved_at', r.reserved_at,
            'cancelled_at', r.cancelled_at,
            'whatsapp_confirmed_at', r.whatsapp_confirmed_at,
            'attendance_status', case
                when r.attendance_status = 'attended' then 'attended'
                when r.status = 'confirmed' and not v_activity.is_cancelled and now() > v_window_close then 'no_show'
                else 'registered' end,
            'attended_at', r.attended_at,
            'certificate_serial', r.certificate_serial,
            'certificate_sent_at', r.certificate_sent_at
        ) as row_data
        from activity_reservations r
        join profiles p on p.id = r.user_id
        where r.activity_id = p_activity_id
    ) t;

    return jsonb_build_object('activity', v_activity_json, 'stats', v_stats, 'reservations', v_reservations);
end;
$function$;

create or replace function public.list_certificates_for_send()
returns jsonb
language plpgsql
stable security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
    v_user_id  uuid := auth.uid();
    v_is_admin boolean;
    v_rows     jsonb;
begin
    if v_user_id is null then raise exception 'NOT_AUTHENTICATED'; end if;
    v_is_admin := check_user_permission(v_user_id, 'manage_activities');
    if not v_is_admin then raise exception 'NOT_AUTHORIZED'; end if;

    select coalesce(jsonb_agg(row_data order by row_data->>'attended_at' desc nulls last), '[]'::jsonb)
    into v_rows from (
        select jsonb_build_object(
            'id', r.id,
            'full_name', p.full_name,
            'phone', p.phone,
            'gender_at_booking', r.gender_at_booking,
            'account_type', adeeb_standing(p.id),
            'certificate_serial', r.certificate_serial,
            'attended_at', r.attended_at,
            'certificate_sent_at', r.certificate_sent_at,
            'activity_id', a.id,
            'activity_name', a.name,
            'activity_date', a.activity_date,
            'activity_type', a.activity_type
        ) as row_data
        from activity_reservations r
        join activities a on a.id = r.activity_id
        join profiles   p on p.id = r.user_id
        where r.certificate_serial is not null and r.attendance_status = 'attended'
    ) t;

    return v_rows;
end;
$function$;
