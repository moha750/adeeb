-- =============================================
-- إضافة: قسم الأنشطة المنتهية في صفحة activities.html
-- =============================================
-- RPC مرآة لـ get_published_activities_with_seats لكنه يُرجِع
-- الأنشطة التي انقضى وقتها فعلًا (نفس منطق الزمن في 20260427).
-- يستثني الأنشطة الملغاة لأنها لا تُمثّل نشاطًا فعليًّا حدث.

CREATE OR REPLACE FUNCTION get_ended_activities_with_seats(p_limit INTEGER DEFAULT 30)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    activity_type TEXT,
    location TEXT,
    activity_date DATE,
    start_time TIME,
    end_time TIME,
    cover_image_url TEXT,
    male_seats INTEGER,
    female_seats INTEGER,
    male_remaining INTEGER,
    female_remaining INTEGER,
    is_cancelled BOOLEAN
) AS $$
DECLARE
    v_now_riyadh TIMESTAMP := (NOW() AT TIME ZONE 'Asia/Riyadh');
    v_today_riyadh DATE := v_now_riyadh::DATE;
    v_time_riyadh TIME := v_now_riyadh::TIME;
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.name,
        a.description,
        a.activity_type,
        a.location,
        a.activity_date,
        a.start_time,
        a.end_time,
        a.cover_image_url,
        a.male_seats,
        a.female_seats,
        (a.male_seats   - COALESCE(SUM(CASE WHEN r.gender_at_booking='male'   AND r.status='confirmed' THEN 1 ELSE 0 END), 0))::INTEGER AS male_remaining,
        (a.female_seats - COALESCE(SUM(CASE WHEN r.gender_at_booking='female' AND r.status='confirmed' THEN 1 ELSE 0 END), 0))::INTEGER AS female_remaining,
        a.is_cancelled
    FROM activities a
    LEFT JOIN activity_reservations r ON r.activity_id = a.id
    WHERE a.is_published = true
      AND a.is_cancelled = false
      AND (
            a.activity_date < v_today_riyadh
         OR (
                a.activity_date = v_today_riyadh
            AND COALESCE(a.end_time, TIME '23:59:59') <= v_time_riyadh
            )
          )
    GROUP BY a.id
    ORDER BY a.activity_date DESC, a.start_time DESC
    LIMIT GREATEST(COALESCE(p_limit, 30), 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
