-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260722181900   الاسم: unlimited_activity_capacity


-- الإجمالي يصير اختياريًّا: NULL = تسجيل غير محدود (متاح للجميع)
ALTER TABLE public.activities ALTER COLUMN total_seats DROP NOT NULL;
ALTER TABLE public.activities DROP CONSTRAINT activities_total_seats_check;
ALTER TABLE public.activities ADD CONSTRAINT activities_total_seats_check CHECK (total_seats IS NULL OR total_seats > 0);
-- (قيد الجمع القائم يكفي: مع total NULL يُقبَل الجنسان NULL فقط — لا تقسيم بلا إجمالي)

-- الحجز: total NULL ⟵ لا فحص سعة (غير محدود)؛ وإلّا مخزون مشترك أو تقسيم كما هو
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
            -- مخزون مشترك: أيّ جنسٍ حتى يمتلئ الإجمالي
            SELECT COUNT(*) INTO v_booked_count FROM activity_reservations
            WHERE activity_id = p_activity_id AND status = 'confirmed';
            IF v_booked_count >= v_activity.total_seats THEN
                RAISE EXCEPTION 'NO_SEATS_AVAILABLE';
            END IF;
        ELSE
            -- تقسيم بالنوع (كوتا صارمة لكلّ جنس)
            SELECT COUNT(*) INTO v_booked_count FROM activity_reservations
            WHERE activity_id = p_activity_id AND gender_at_booking = v_gender AND status = 'confirmed';
            v_capacity := CASE WHEN v_gender = 'male' THEN v_activity.male_seats ELSE v_activity.female_seats END;
            IF v_booked_count >= v_capacity THEN
                RAISE EXCEPTION 'NO_SEATS_AVAILABLE_FOR_GENDER';
            END IF;
        END IF;
    END IF;
    -- total_seats NULL ⟵ غير محدود، بلا فحص سعة

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

