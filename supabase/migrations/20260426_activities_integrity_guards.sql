-- =============================================
-- حماية سلامة بيانات الأنشطة (Defense in Depth)
-- =============================================
-- الهدف: ضمان سلامة جدول activities على مستوى قاعدة البيانات حتى لو تم
-- تجاوز التحققات الأمامية (مثل تعديل مباشر عبر Supabase REST من الكونسول).
--
-- يعالج المشاكل التالية:
--   1. تخفيض المقاعد تحت الحجوزات المؤكدة (سعة سالبة)
--   2. سباق التزامن بين تعديل المسؤول وحجز الزائر
--   3. end_time ≤ start_time
--   4. is_cancelled = true مع is_published = true في نفس الوقت

-- =============================================
-- 1. CHECK constraints (قواعد على الصف الواحد)
-- =============================================

-- تسلسل الوقت: الانتهاء بعد البدء (مع السماح بـ NULL لأنه اختياري)
ALTER TABLE activities
    DROP CONSTRAINT IF EXISTS activities_time_order_check;
ALTER TABLE activities
    ADD CONSTRAINT activities_time_order_check
    CHECK (end_time IS NULL OR end_time > start_time);

-- لا يمكن أن يكون النشاط ملغيًا ومنشورًا في نفس الوقت
ALTER TABLE activities
    DROP CONSTRAINT IF EXISTS activities_cancel_publish_exclusive;
ALTER TABLE activities
    ADD CONSTRAINT activities_cancel_publish_exclusive
    CHECK (NOT (is_cancelled = true AND is_published = true));

-- =============================================
-- 2. Trigger: منع تخفيض المقاعد تحت الحجوزات المؤكدة
-- =============================================
-- يُشغَّل قبل كل UPDATE على activities. القفل على activity_reservations
-- يضمن رؤية أحدث عدد للحجوزات حتى تحت ضغط متزامن.
--
-- ملاحظة: في PostgreSQL، الـ BEFORE UPDATE trigger يعمل ضمن نفس
-- المعاملة (transaction) للتحديث، فأي حجز جديد يحاول الإدراج في
-- activity_reservations بعد هذا الفحص سيتعارض على قفل الصف
-- (الذي تأخذه دالة book_activity_seat عبر FOR UPDATE).
CREATE OR REPLACE FUNCTION enforce_activity_seats_vs_bookings()
RETURNS TRIGGER AS $$
DECLARE
    v_male_booked   INTEGER;
    v_female_booked INTEGER;
BEGIN
    -- نفحص فقط حين يتغير male_seats أو female_seats
    IF NEW.male_seats = OLD.male_seats AND NEW.female_seats = OLD.female_seats THEN
        RETURN NEW;
    END IF;

    SELECT
        COUNT(*) FILTER (WHERE gender_at_booking = 'male'),
        COUNT(*) FILTER (WHERE gender_at_booking = 'female')
    INTO v_male_booked, v_female_booked
    FROM activity_reservations
    WHERE activity_id = NEW.id
      AND status = 'confirmed';

    IF NEW.male_seats < v_male_booked THEN
        RAISE EXCEPTION
            'لا يمكن تخفيض كوتا الرجال إلى % لأن هناك % حجزًا مؤكدًا فعلًا',
            NEW.male_seats, v_male_booked
            USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.female_seats < v_female_booked THEN
        RAISE EXCEPTION
            'لا يمكن تخفيض كوتا النساء إلى % لأن هناك % حجزًا مؤكدًا فعلًا',
            NEW.female_seats, v_female_booked
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_activities_seats_vs_bookings ON activities;
CREATE TRIGGER trg_activities_seats_vs_bookings
    BEFORE UPDATE ON activities
    FOR EACH ROW
    EXECUTE FUNCTION enforce_activity_seats_vs_bookings();

-- =============================================
-- 3. ملاحظة حول سباق التزامن (Race Condition)
-- =============================================
-- دالة book_activity_seat تأخذ FOR UPDATE على صف activities قبل الحجز.
-- هذا يعني أن أي UPDATE على نفس الصف ينتظر حتى ينتهي الحجز، وأي حجز
-- ينتظر حتى ينتهي الـ UPDATE. النتيجة: التريغر أعلاه يرى دائمًا
-- العدد الفعلي للحجوزات، ولا يمكن أن يحدث "تخفيض مقاعد + حجز جديد"
-- بشكل متداخل ينتج عنه male_booked > male_seats.
