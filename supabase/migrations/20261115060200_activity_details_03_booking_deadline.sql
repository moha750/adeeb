-- **آخرُ موعدٍ للتسجيل** (٢٠٢٦-١١-١٥): بعد `booking_closes_at` يُرفض الحجز (`BOOKING_CLOSED`) — والصفحةُ تقول «أُغلق التسجيل».
-- الدالّةُ كما كانت حرفًا، وزيد سطرٌ واحد بعد فحص الماضي.
CREATE OR REPLACE FUNCTION public.book_activity_seat(p_activity_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
    v_user_id      uuid := auth.uid();
    v_activity     activities%rowtype;
    v_gender       text;
    v_booked_count integer;
    v_capacity     integer;
    v_existing_id  uuid;
    v_new_id       uuid;
begin
    if v_user_id is null then raise exception 'NOT_AUTHENTICATED'; end if;

    select * into v_activity from activities where id = p_activity_id for update;
    if not found                               then raise exception 'ACTIVITY_NOT_FOUND';     end if;
    if v_activity.is_published = false         then raise exception 'ACTIVITY_NOT_PUBLISHED'; end if;
    if v_activity.is_cancelled = true          then raise exception 'ACTIVITY_CANCELLED';     end if;
    if v_activity.activity_date < current_date then raise exception 'ACTIVITY_PAST';          end if;
    if v_activity.booking_closes_at is not null and now() > v_activity.booking_closes_at then raise exception 'BOOKING_CLOSED'; end if;

    select gender into v_gender from profiles where id = v_user_id;
    if v_gender is null then raise exception 'GENDER_REQUIRED'; end if;

    if v_activity.target_gender is not null and v_activity.target_gender <> v_gender then
        raise exception 'WRONG_GENDER';
    end if;

    select id into v_existing_id from activity_reservations
    where activity_id = p_activity_id and user_id = v_user_id and status = 'confirmed';
    if v_existing_id is not null then raise exception 'ALREADY_BOOKED'; end if;

    if v_activity.total_seats is not null then
        if v_activity.male_seats is null then
            select count(*) into v_booked_count from activity_reservations
            where activity_id = p_activity_id and status = 'confirmed';
            if v_booked_count >= v_activity.total_seats then raise exception 'NO_SEATS_AVAILABLE'; end if;
        else
            select count(*) into v_booked_count from activity_reservations
            where activity_id = p_activity_id and gender_at_booking = v_gender and status = 'confirmed';
            v_capacity := case when v_gender = 'male' then v_activity.male_seats else v_activity.female_seats end;
            if v_booked_count >= v_capacity then raise exception 'NO_SEATS_AVAILABLE_FOR_GENDER'; end if;
        end if;
    end if;

    insert into activity_reservations (activity_id, user_id, gender_at_booking)
    values (p_activity_id, v_user_id, v_gender)
    returning id into v_new_id;

    return v_new_id;
end;
$function$;
