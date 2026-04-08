-- =============================================
-- نظام الأنشطة والبرامج - Activities & Programs
-- =============================================
-- الهدف:
--   1. عرض أنشطة وبرامج للزوار وإتاحة حجز مقاعد بها
--   2. جمع بيانات الزوار (اسم/جوال/بريد/جنس) للرسائل الترويجية
--   3. توزيع المقاعد بشكل صارم بين الذكور والإناث
--   4. فصل حسابات الزوار تمامًا عن أعضاء النادي (لا profiles ولا user_roles)

-- =============================================
-- 1. جدول الأنشطة والبرامج
-- =============================================
CREATE TABLE IF NOT EXISTS activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    activity_type TEXT NOT NULL DEFAULT 'activity'
        CHECK (activity_type IN ('activity','program','workshop')),
    location TEXT,
    activity_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    total_seats INTEGER NOT NULL CHECK (total_seats > 0),
    male_percentage INTEGER NOT NULL CHECK (male_percentage BETWEEN 0 AND 100),
    male_seats INTEGER NOT NULL CHECK (male_seats >= 0),
    female_seats INTEGER NOT NULL CHECK (female_seats >= 0),
    cover_image_url TEXT,
    is_published BOOLEAN NOT NULL DEFAULT false,
    is_cancelled BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT activities_seats_sum_check CHECK (male_seats + female_seats = total_seats)
);

CREATE INDEX IF NOT EXISTS idx_activities_published_date
    ON activities(is_published, activity_date);
CREATE INDEX IF NOT EXISTS idx_activities_created_by
    ON activities(created_by);

-- =============================================
-- 2. جدول الزوار (حسابات الحجز فقط)
-- =============================================
-- ملاحظة أمنية مهمة:
-- هذا الجدول مفصول كليًا عن profiles. لا يحصل صاحب الحساب على أي صلاحيات
-- في لوحة التحكم. AuthManager.protectPage() يرفض أي حساب لا يحوي صفًا في
-- profiles بحالة active وأدوارًا في user_roles.
CREATE TABLE IF NOT EXISTS visitors (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('male','female')),
    city TEXT,
    accepts_marketing BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visitors_phone ON visitors(phone);
CREATE INDEX IF NOT EXISTS idx_visitors_email ON visitors(email);

-- =============================================
-- 3. إضافة حقل الجنس لجدول profiles (للأعضاء الذين يحجزون)
-- =============================================
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS gender TEXT
    CHECK (gender IN ('male','female'));

-- =============================================
-- 4. جدول الحجوزات
-- =============================================
CREATE TABLE IF NOT EXISTS activity_reservations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
    member_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    gender_at_booking TEXT NOT NULL CHECK (gender_at_booking IN ('male','female')),
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')),
    reserved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    cancelled_at TIMESTAMPTZ,
    -- يجب أن يكون الحاجز إما زائرًا أو عضوًا (XOR)
    CONSTRAINT activity_reservations_owner_xor
        CHECK ((visitor_id IS NOT NULL)::int + (member_user_id IS NOT NULL)::int = 1)
);

-- منع الحجز المزدوج: شخص واحد لا يحجز نفس النشاط مرتين بحالة confirmed
CREATE UNIQUE INDEX IF NOT EXISTS uniq_activity_visitor_active
    ON activity_reservations(activity_id, visitor_id)
    WHERE status='confirmed' AND visitor_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_activity_member_active
    ON activity_reservations(activity_id, member_user_id)
    WHERE status='confirmed' AND member_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_activity_status
    ON activity_reservations(activity_id, status);
CREATE INDEX IF NOT EXISTS idx_reservations_visitor
    ON activity_reservations(visitor_id);
CREATE INDEX IF NOT EXISTS idx_reservations_member
    ON activity_reservations(member_user_id);

-- =============================================
-- 5. RPC: حالة المقاعد (آمنة للقراءة من الواجهة)
-- =============================================
CREATE OR REPLACE FUNCTION get_activity_seat_status(p_activity_id UUID)
RETURNS TABLE (
    activity_id UUID,
    male_seats INTEGER,
    female_seats INTEGER,
    male_booked INTEGER,
    female_booked INTEGER,
    male_remaining INTEGER,
    female_remaining INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.male_seats,
        a.female_seats,
        COALESCE(SUM(CASE WHEN r.gender_at_booking='male'   AND r.status='confirmed' THEN 1 ELSE 0 END), 0)::INTEGER AS male_booked,
        COALESCE(SUM(CASE WHEN r.gender_at_booking='female' AND r.status='confirmed' THEN 1 ELSE 0 END), 0)::INTEGER AS female_booked,
        (a.male_seats   - COALESCE(SUM(CASE WHEN r.gender_at_booking='male'   AND r.status='confirmed' THEN 1 ELSE 0 END), 0))::INTEGER AS male_remaining,
        (a.female_seats - COALESCE(SUM(CASE WHEN r.gender_at_booking='female' AND r.status='confirmed' THEN 1 ELSE 0 END), 0))::INTEGER AS female_remaining
    FROM activities a
    LEFT JOIN activity_reservations r ON r.activity_id = a.id
    WHERE a.id = p_activity_id
    GROUP BY a.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- نسخة مجمَّعة لجميع الأنشطة المنشورة (لتقليل الاستعلامات في الواجهة)
CREATE OR REPLACE FUNCTION get_published_activities_with_seats()
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
      AND a.activity_date >= CURRENT_DATE
    GROUP BY a.id
    ORDER BY a.activity_date, a.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================
-- 6. RPC: حجز مقعد (ذرّي مع قفل صف النشاط)
-- =============================================
CREATE OR REPLACE FUNCTION book_activity_seat(p_activity_id UUID)
RETURNS UUID AS $$
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
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'NOT_AUTHENTICATED';
    END IF;

    -- اقفل صف النشاط لمنع سباقات الحجز
    SELECT * INTO v_activity
    FROM activities
    WHERE id = p_activity_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ACTIVITY_NOT_FOUND';
    END IF;

    IF v_activity.is_published = false THEN
        RAISE EXCEPTION 'ACTIVITY_NOT_PUBLISHED';
    END IF;

    IF v_activity.is_cancelled = true THEN
        RAISE EXCEPTION 'ACTIVITY_CANCELLED';
    END IF;

    IF v_activity.activity_date < CURRENT_DATE THEN
        RAISE EXCEPTION 'ACTIVITY_PAST';
    END IF;

    -- حدد جنس الحاجز: ابحث في visitors ثم profiles
    SELECT gender INTO v_gender FROM visitors WHERE id = v_user_id;
    IF FOUND THEN
        v_is_visitor := true;
    ELSE
        SELECT gender INTO v_gender FROM profiles WHERE id = v_user_id;
        IF FOUND THEN
            v_is_member := true;
        END IF;
    END IF;

    IF v_gender IS NULL THEN
        RAISE EXCEPTION 'GENDER_REQUIRED';
    END IF;

    -- منع الحجز المكرر
    IF v_is_visitor THEN
        SELECT id INTO v_existing_id
        FROM activity_reservations
        WHERE activity_id = p_activity_id
          AND visitor_id  = v_user_id
          AND status = 'confirmed';
    ELSE
        SELECT id INTO v_existing_id
        FROM activity_reservations
        WHERE activity_id   = p_activity_id
          AND member_user_id = v_user_id
          AND status = 'confirmed';
    END IF;

    IF v_existing_id IS NOT NULL THEN
        RAISE EXCEPTION 'ALREADY_BOOKED';
    END IF;

    -- عُدّ الحجوزات النشطة لهذا الجنس وقارنها بالسعة (كوتا صارمة)
    SELECT COUNT(*) INTO v_booked_count
    FROM activity_reservations
    WHERE activity_id = p_activity_id
      AND gender_at_booking = v_gender
      AND status = 'confirmed';

    v_capacity := CASE WHEN v_gender = 'male' THEN v_activity.male_seats ELSE v_activity.female_seats END;

    IF v_booked_count >= v_capacity THEN
        RAISE EXCEPTION 'NO_SEATS_AVAILABLE_FOR_GENDER';
    END IF;

    -- أدخل الحجز
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 7. RPC: إلغاء حجز
-- =============================================
CREATE OR REPLACE FUNCTION cancel_activity_reservation(p_reservation_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_reservation activity_reservations%ROWTYPE;
    v_activity_date DATE;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'NOT_AUTHENTICATED';
    END IF;

    SELECT * INTO v_reservation
    FROM activity_reservations
    WHERE id = p_reservation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'RESERVATION_NOT_FOUND';
    END IF;

    -- التحقق من ملكية الحجز
    IF v_reservation.visitor_id IS DISTINCT FROM v_user_id
       AND v_reservation.member_user_id IS DISTINCT FROM v_user_id THEN
        RAISE EXCEPTION 'NOT_OWNER';
    END IF;

    IF v_reservation.status = 'cancelled' THEN
        RETURN true; -- ملغى مسبقًا
    END IF;

    -- منع الإلغاء بعد فوات النشاط
    SELECT activity_date INTO v_activity_date
    FROM activities
    WHERE id = v_reservation.activity_id;

    IF v_activity_date < CURRENT_DATE THEN
        RAISE EXCEPTION 'ACTIVITY_PAST';
    END IF;

    UPDATE activity_reservations
    SET status = 'cancelled',
        cancelled_at = now()
    WHERE id = p_reservation_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 8. Row Level Security
-- =============================================
ALTER TABLE activities             ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors               ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_reservations  ENABLE ROW LEVEL SECURITY;

-- ---------- activities ----------
-- قراءة عامة للأنشطة المنشورة
CREATE POLICY "activities_select_published" ON activities
    FOR SELECT TO anon, authenticated
    USING (is_published = true OR EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
          AND ur.is_active = true
          AND r.role_level >= 8
    ));

-- إدارة الأنشطة: لمن يملك دور role_level >= 8 (نتحقق من جدول الصلاحيات في الواجهة أيضًا)
CREATE POLICY "activities_admin_insert" ON activities
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND ur.is_active = true
              AND r.role_level >= 8
        )
    );

CREATE POLICY "activities_admin_update" ON activities
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND ur.is_active = true
              AND r.role_level >= 8
        )
    );

CREATE POLICY "activities_admin_delete" ON activities
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND ur.is_active = true
              AND r.role_level >= 8
        )
    );

-- ---------- visitors ----------
-- الزائر يدير صفه فقط
CREATE POLICY "visitors_select_self" ON visitors
    FOR SELECT TO authenticated
    USING (auth.uid() = id OR EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
          AND ur.is_active = true
          AND r.role_level >= 8
    ));

CREATE POLICY "visitors_insert_self" ON visitors
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "visitors_update_self" ON visitors
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ---------- activity_reservations ----------
-- المستخدم يقرأ حجوزاته فقط، الإدارة تقرأ الكل
CREATE POLICY "reservations_select_own" ON activity_reservations
    FOR SELECT TO authenticated
    USING (
        visitor_id = auth.uid()
        OR member_user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
              AND ur.is_active = true
              AND r.role_level >= 8
        )
    );

-- لا سياسات INSERT/UPDATE/DELETE مباشرة — يجب أن تمر عبر الدوال (book/cancel)
-- الدوال SECURITY DEFINER تتجاوز RLS بأمان

-- =============================================
-- 9. Trigger: تحديث updated_at تلقائيًا
-- =============================================
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_activities_updated_at ON activities;
CREATE TRIGGER trg_activities_updated_at
    BEFORE UPDATE ON activities
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_visitors_updated_at ON visitors;
CREATE TRIGGER trg_visitors_updated_at
    BEFORE UPDATE ON visitors
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_timestamp();

-- =============================================
-- 10. تسجيل صلاحية manage_activities وربطها بالأدوار العليا
-- =============================================
INSERT INTO permissions (permission_key, permission_name_ar, category, description)
VALUES ('manage_activities', 'إدارة الأنشطة والبرامج', 'activities',
        'إنشاء وتعديل وإدارة الأنشطة والبرامج وحجوزات الزوار')
ON CONFLICT (permission_key) DO NOTHING;

-- ربط الصلاحية بالأدوار العليا (رئيس النادي + الرئيس التنفيذي + المستشار + قائد/عضو الموارد البشرية)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name IN (
        'club_president',
        'president_advisor',
        'executive_council_president',
        'hr_committee_leader',
        'hr_admin_member'
    )
  AND p.permission_key = 'manage_activities'
ON CONFLICT DO NOTHING;
