-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260722182731   الاسم: activity_target_gender


-- توجيه الفعاليّة: NULL = للجنسين · 'male' = للرجال · 'female' = للنساء
ALTER TABLE public.activities ADD COLUMN target_gender text;
ALTER TABLE public.activities ADD CONSTRAINT activities_target_gender_check
  CHECK (target_gender IS NULL OR target_gender = ANY (ARRAY['male'::text, 'female'::text]));
COMMENT ON COLUMN public.activities.target_gender IS 'الجنس الموجَّهة له الفعاليّة: NULL=للجنسين · male=للرجال · female=للنساء. يُرفَض حجز الجنس المخالف.';

-- الحجز: يرفض الجنس المخالف للتوجيه (WRONG_GENDER)
CREATE OR REPLACE FUNCTION public.book_activity_seat(p_activity_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_activity activities%ROWTYPE;
    v_gender TEXT;
    v_is_visitor BOOLEAN := false;
    v_is_member BOOLEAN := false;
    v_booked_count INTEGER;
    v_capacity INTEGER;
    v_existing_id UUID;
    v_new_id UUID;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

    SELECT * INTO v_activity FROM activities WHERE id = p_activity_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'ACTIVITY_NOT_FOUND'; END IF;
    IF v_activity.is_published = false THEN RAISE EXCEPTION 'ACTIVITY_NOT_PUBLISHED'; END IF;
    IF v_activity.is_cancelled = true THEN RAISE EXCEPTION 'ACTIVITY_CANCELLED'; END IF;
    IF v_activity.activity_date < CURRENT_DATE THEN RAISE EXCEPTION 'ACTIVITY_PAST'; END IF;

    SELECT gender INTO v_gender FROM visitors WHERE id = v_user_id;
    IF FOUND THEN
        v_is_visitor := true;
    ELSE
        SELECT gender INTO v_gender FROM profiles WHERE id = v_user_id;
        IF FOUND THEN v_is_member := true; END IF;
    END IF;
    IF v_gender IS NULL THEN RAISE EXCEPTION 'GENDER_REQUIRED'; END IF;

    IF v_activity.target_gender IS NOT NULL AND v_activity.target_gender <> v_gender THEN
        RAISE EXCEPTION 'WRONG_GENDER';
    END IF;

    IF v_is_visitor THEN
        SELECT id INTO v_existing_id FROM activity_reservations
        WHERE activity_id = p_activity_id AND visitor_id = v_user_id AND status = 'confirmed';
    ELSE
        SELECT id INTO v_existing_id FROM activity_reservations
        WHERE activity_id = p_activity_id AND member_user_id = v_user_id AND status = 'confirmed';
    END IF;
    IF v_existing_id IS NOT NULL THEN RAISE EXCEPTION 'ALREADY_BOOKED'; END IF;

    IF v_activity.total_seats IS NOT NULL THEN
        IF v_activity.male_seats IS NULL THEN
            SELECT COUNT(*) INTO v_booked_count FROM activity_reservations
            WHERE activity_id = p_activity_id AND status = 'confirmed';
            IF v_booked_count >= v_activity.total_seats THEN RAISE EXCEPTION 'NO_SEATS_AVAILABLE'; END IF;
        ELSE
            SELECT COUNT(*) INTO v_booked_count FROM activity_reservations
            WHERE activity_id = p_activity_id AND gender_at_booking = v_gender AND status = 'confirmed';
            v_capacity := CASE WHEN v_gender = 'male' THEN v_activity.male_seats ELSE v_activity.female_seats END;
            IF v_booked_count >= v_capacity THEN RAISE EXCEPTION 'NO_SEATS_AVAILABLE_FOR_GENDER'; END IF;
        END IF;
    END IF;

    INSERT INTO activity_reservations (activity_id, visitor_id, member_user_id, gender_at_booking)
    VALUES (
        p_activity_id,
        CASE WHEN v_is_visitor THEN v_user_id ELSE NULL END,
        CASE WHEN v_is_member  THEN v_user_id ELSE NULL END,
        v_gender
    )
    RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$function$;

-- القائمة العامّة: تُضاف target_gender
DROP FUNCTION IF EXISTS public.get_published_activities_with_seats();
CREATE FUNCTION public.get_published_activities_with_seats()
 RETURNS TABLE(id uuid, name text, description text, activity_type text, location text, activity_date date, start_time time without time zone, end_time time without time zone, cover_image_url text, male_seats integer, female_seats integer, male_remaining integer, female_remaining integer, is_cancelled boolean, total_seats integer, total_remaining integer, target_gender text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
    v_now_riyadh TIMESTAMP := (NOW() AT TIME ZONE 'Asia/Riyadh');
    v_today_riyadh DATE := v_now_riyadh::DATE;
    v_time_riyadh TIME := v_now_riyadh::TIME;
BEGIN
    RETURN QUERY
    SELECT
        a.id, a.name, a.description, a.activity_type, a.location, a.activity_date, a.start_time, a.end_time, a.cover_image_url,
        a.male_seats, a.female_seats,
        (a.male_seats   - COALESCE(SUM(CASE WHEN r.gender_at_booking='male'   AND r.status='confirmed' THEN 1 ELSE 0 END), 0))::INTEGER,
        (a.female_seats - COALESCE(SUM(CASE WHEN r.gender_at_booking='female' AND r.status='confirmed' THEN 1 ELSE 0 END), 0))::INTEGER,
        a.is_cancelled,
        a.total_seats,
        (a.total_seats - COALESCE(SUM(CASE WHEN r.status='confirmed' THEN 1 ELSE 0 END), 0))::INTEGER,
        a.target_gender
    FROM activities a
    LEFT JOIN activity_reservations r ON r.activity_id = a.id
    WHERE a.is_published = true
      AND (a.activity_date > v_today_riyadh OR (a.activity_date = v_today_riyadh AND COALESCE(a.end_time, TIME '23:59:59') > v_time_riyadh))
    GROUP BY a.id
    ORDER BY a.activity_date, a.start_time;
END;
$function$;

