-- ============================================================================
-- Migration: نظام حجز مواعيد المقابلات الذاتي
-- الوصف: يسمح للمتقدمين بحجز مواعيد المقابلات بأنفسهم من خلال رابط عام
-- التاريخ: 2026-01-23
-- ============================================================================

-- جدول جلسات المقابلات
CREATE TABLE IF NOT EXISTS interview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_name TEXT NOT NULL,
    session_description TEXT,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration INTEGER DEFAULT 10 CHECK (slot_duration > 0),
    interview_type TEXT DEFAULT 'online' CHECK (interview_type IN ('online', 'in_person', 'phone')),
    meeting_link TEXT,
    location TEXT,
    is_active BOOLEAN DEFAULT true,
    public_link_token TEXT UNIQUE NOT NULL,
    max_bookings INTEGER,
    allow_cancellation BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول الفترات الزمنية
CREATE TABLE IF NOT EXISTS interview_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
    slot_time TIMESTAMPTZ NOT NULL,
    slot_end_time TIMESTAMPTZ NOT NULL,
    is_booked BOOLEAN DEFAULT false,
    booked_by UUID REFERENCES membership_applications(id) ON DELETE SET NULL,
    booked_at TIMESTAMPTZ,
    interview_id UUID REFERENCES membership_interviews(id) ON DELETE SET NULL,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, slot_time)
);

-- فهارس لتحسين الأداء
CREATE INDEX idx_interview_sessions_token ON interview_sessions(public_link_token);
CREATE INDEX idx_interview_sessions_date ON interview_sessions(session_date);
CREATE INDEX idx_interview_sessions_active ON interview_sessions(is_active);
CREATE INDEX idx_interview_slots_session ON interview_slots(session_id);
CREATE INDEX idx_interview_slots_booked ON interview_slots(is_booked);
CREATE INDEX idx_interview_slots_time ON interview_slots(slot_time);

-- ============================================================================
-- دالة توليد رمز فريد للرابط العام
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_session_token()
RETURNS TEXT AS $$
DECLARE
    token TEXT;
    exists BOOLEAN;
BEGIN
    LOOP
        -- توليد رمز عشوائي من 12 حرف/رقم
        token := lower(substring(md5(random()::text || clock_timestamp()::text) from 1 for 12));
        
        -- التحقق من عدم وجوده
        SELECT EXISTS(SELECT 1 FROM interview_sessions WHERE public_link_token = token) INTO exists;
        
        EXIT WHEN NOT exists;
    END LOOP;
    
    RETURN token;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- دالة توليد الفترات الزمنية تلقائياً
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_interview_slots(
    p_session_id UUID,
    p_session_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_slot_duration INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    current_slot_time TIMESTAMPTZ;
    end_datetime TIMESTAMPTZ;
    slot_count INTEGER := 0;
BEGIN
    -- تحويل التاريخ والوقت إلى timestamptz مع المنطقة الزمنية السعودية
    current_slot_time := ((p_session_date || ' ' || p_start_time)::TIMESTAMP AT TIME ZONE 'Asia/Riyadh');
    end_datetime := ((p_session_date || ' ' || p_end_time)::TIMESTAMP AT TIME ZONE 'Asia/Riyadh');
    
    -- حذف الفترات القديمة إن وجدت
    DELETE FROM interview_slots WHERE session_id = p_session_id;
    
    -- توليد الفترات
    WHILE current_slot_time < end_datetime LOOP
        INSERT INTO interview_slots (
            session_id,
            slot_time,
            slot_end_time,
            is_booked
        ) VALUES (
            p_session_id,
            current_slot_time,
            current_slot_time + (p_slot_duration || ' minutes')::INTERVAL,
            false
        );
        
        slot_count := slot_count + 1;
        current_slot_time := current_slot_time + (p_slot_duration || ' minutes')::INTERVAL;
    END LOOP;
    
    RETURN slot_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Trigger: توليد الفترات تلقائياً عند إنشاء جلسة
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_generate_slots()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM generate_interview_slots(
        NEW.id,
        NEW.session_date,
        NEW.start_time,
        NEW.end_time,
        NEW.slot_duration
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_generate_slots
AFTER INSERT ON interview_sessions
FOR EACH ROW
EXECUTE FUNCTION trigger_generate_slots();

-- ============================================================================
-- Trigger: توليد رمز الرابط تلقائياً
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_generate_token()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.public_link_token IS NULL OR NEW.public_link_token = '' THEN
        NEW.public_link_token := generate_session_token();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_generate_token
BEFORE INSERT ON interview_sessions
FOR EACH ROW
EXECUTE FUNCTION trigger_generate_token();

-- ============================================================================
-- Trigger: إنشاء مقابلة تلقائياً عند حجز فترة
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_create_interview_on_booking()
RETURNS TRIGGER AS $$
DECLARE
    session_record RECORD;
    app_record RECORD;
BEGIN
    -- التحقق من أن الفترة تم حجزها (وليس إلغاؤها)
    IF NEW.is_booked = true AND NEW.booked_by IS NOT NULL AND NEW.interview_id IS NULL THEN
        -- الحصول على بيانات الجلسة
        SELECT * INTO session_record FROM interview_sessions WHERE id = NEW.session_id;
        
        -- الحصول على بيانات الطلب
        SELECT * INTO app_record FROM membership_applications WHERE id = NEW.booked_by;
        
        -- إنشاء المقابلة
        INSERT INTO membership_interviews (
            application_id,
            interview_date,
            interview_type,
            interview_location,
            meeting_link,
            status,
            result,
            created_at
        ) VALUES (
            NEW.booked_by,
            NEW.slot_time,
            session_record.interview_type,
            session_record.location,
            session_record.meeting_link,
            'scheduled',
            'pending',
            NOW()
        ) RETURNING id INTO NEW.interview_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_interview
BEFORE UPDATE ON interview_slots
FOR EACH ROW
WHEN (OLD.is_booked = false AND NEW.is_booked = true)
EXECUTE FUNCTION trigger_create_interview_on_booking();

-- ============================================================================
-- Trigger: تحديث updated_at تلقائياً
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_interview_sessions_updated_at
BEFORE UPDATE ON interview_sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- دالة: الحصول على إحصائيات الجلسة
-- ============================================================================
CREATE OR REPLACE FUNCTION get_session_statistics(p_session_id UUID)
RETURNS TABLE (
    total_slots INTEGER,
    booked_slots INTEGER,
    available_slots INTEGER,
    cancelled_slots INTEGER,
    booking_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER AS total_slots,
        COUNT(*) FILTER (WHERE is_booked = true AND cancelled_at IS NULL)::INTEGER AS booked_slots,
        COUNT(*) FILTER (WHERE is_booked = false AND cancelled_at IS NULL)::INTEGER AS available_slots,
        COUNT(*) FILTER (WHERE cancelled_at IS NOT NULL)::INTEGER AS cancelled_slots,
        ROUND(
            (COUNT(*) FILTER (WHERE is_booked = true AND cancelled_at IS NULL)::NUMERIC / 
            NULLIF(COUNT(*)::NUMERIC, 0)) * 100, 
            2
        ) AS booking_rate
    FROM interview_slots
    WHERE session_id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- دالة: التحقق من صلاحية رقم الهاتف للحجز
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_phone_for_booking(
    p_phone TEXT,
    p_session_id UUID
)
RETURNS TABLE (
    is_valid BOOLEAN,
    application_id UUID,
    full_name TEXT,
    email TEXT,
    preferred_committee TEXT,
    error_message TEXT
) AS $$
DECLARE
    app_record RECORD;
    existing_booking RECORD;
BEGIN
    -- البحث عن الطلب بناءً على رقم الهاتف
    SELECT * INTO app_record
    FROM membership_applications
    WHERE phone = p_phone
    AND status = 'approved_for_interview'
    LIMIT 1;
    
    -- إذا لم يتم العثور على الطلب
    IF app_record IS NULL THEN
        RETURN QUERY SELECT 
            false,
            NULL::UUID,
            NULL::TEXT,
            NULL::TEXT,
            NULL::TEXT,
            'رقم الهاتف غير مسجل أو الطلب غير مقبول للمقابلة'::TEXT;
        RETURN;
    END IF;
    
    -- التحقق من عدم وجود حجز مسبق في نفس الجلسة
    SELECT * INTO existing_booking
    FROM interview_slots
    WHERE session_id = p_session_id
    AND booked_by = app_record.id
    AND cancelled_at IS NULL
    LIMIT 1;
    
    IF existing_booking IS NOT NULL THEN
        RETURN QUERY SELECT 
            false,
            app_record.id,
            app_record.full_name,
            app_record.email,
            app_record.preferred_committee,
            'لقد قمت بحجز موعد مسبقاً في هذه الجلسة'::TEXT;
        RETURN;
    END IF;
    
    -- الطلب صالح للحجز
    RETURN QUERY SELECT 
        true,
        app_record.id,
        app_record.full_name,
        app_record.email,
        app_record.preferred_committee,
        NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- دالة: حجز فترة
-- ============================================================================
CREATE OR REPLACE FUNCTION book_interview_slot(
    p_slot_id UUID,
    p_application_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    interview_id UUID
) AS $$
DECLARE
    slot_record RECORD;
    new_interview_id UUID;
BEGIN
    -- الحصول على بيانات الفترة
    SELECT * INTO slot_record
    FROM interview_slots
    WHERE id = p_slot_id
    FOR UPDATE;
    
    -- التحقق من أن الفترة متاحة
    IF slot_record IS NULL THEN
        RETURN QUERY SELECT false, 'الفترة غير موجودة'::TEXT, NULL::UUID;
        RETURN;
    END IF;
    
    IF slot_record.is_booked = true THEN
        RETURN QUERY SELECT false, 'الفترة محجوزة بالفعل'::TEXT, NULL::UUID;
        RETURN;
    END IF;
    
    -- حجز الفترة
    UPDATE interview_slots
    SET 
        is_booked = true,
        booked_by = p_application_id,
        booked_at = NOW()
    WHERE id = p_slot_id
    RETURNING interview_slots.interview_id INTO new_interview_id;
    
    RETURN QUERY SELECT true, 'تم حجز الموعد بنجاح'::TEXT, new_interview_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- دالة: إلغاء حجز فترة
-- ============================================================================
CREATE OR REPLACE FUNCTION cancel_interview_slot(
    p_slot_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
BEGIN
    UPDATE interview_slots
    SET 
        is_booked = false,
        cancelled_at = NOW(),
        cancellation_reason = p_reason
    WHERE id = p_slot_id
    AND is_booked = true;
    
    IF FOUND THEN
        RETURN QUERY SELECT true, 'تم إلغاء الحجز بنجاح'::TEXT;
    ELSE
        RETURN QUERY SELECT false, 'الفترة غير محجوزة'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- تفعيل RLS
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_slots ENABLE ROW LEVEL SECURITY;

-- سياسة: قراءة الجلسات النشطة (للجميع)
CREATE POLICY "Allow public read active sessions"
ON interview_sessions
FOR SELECT
USING (is_active = true);

-- سياسة: قراءة جميع الجلسات (للمسؤولين)
CREATE POLICY "Allow admin read all sessions"
ON interview_sessions
FOR SELECT
TO authenticated
USING (
    get_user_highest_role_level(auth.uid()) >= 7
);

-- سياسة: إنشاء جلسات (للمسؤولين)
CREATE POLICY "Allow admin create sessions"
ON interview_sessions
FOR INSERT
TO authenticated
WITH CHECK (
    get_user_highest_role_level(auth.uid()) >= 7
);

-- سياسة: تحديث الجلسات (للمسؤولين)
CREATE POLICY "Allow admin update sessions"
ON interview_sessions
FOR UPDATE
TO authenticated
USING (
    get_user_highest_role_level(auth.uid()) >= 7
);

-- سياسة: حذف الجلسات (للمسؤولين)
CREATE POLICY "Allow admin delete sessions"
ON interview_sessions
FOR DELETE
TO authenticated
USING (
    get_user_highest_role_level(auth.uid()) >= 10
);

-- سياسة: قراءة الفترات (للجميع للجلسات النشطة)
CREATE POLICY "Allow public read slots"
ON interview_slots
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM interview_sessions
        WHERE interview_sessions.id = interview_slots.session_id
        AND interview_sessions.is_active = true
    )
);

-- سياسة: قراءة جميع الفترات (للمسؤولين)
CREATE POLICY "Allow admin read all slots"
ON interview_slots
FOR SELECT
TO authenticated
USING (
    get_user_highest_role_level(auth.uid()) >= 7
);

-- سياسة: تحديث الفترات (للحجز العام)
CREATE POLICY "Allow public book slots"
ON interview_slots
FOR UPDATE
USING (
    is_booked = false
    AND EXISTS (
        SELECT 1 FROM interview_sessions
        WHERE interview_sessions.id = interview_slots.session_id
        AND interview_sessions.is_active = true
    )
);

-- سياسة: إنشاء فترات (للمسؤولين والـ triggers)
CREATE POLICY "Allow admin insert slots"
ON interview_slots
FOR INSERT
TO authenticated
WITH CHECK (
    get_user_highest_role_level(auth.uid()) >= 7
);

-- سياسة: تحديث الفترات (للمسؤولين)
CREATE POLICY "Allow admin update slots"
ON interview_slots
FOR UPDATE
TO authenticated
USING (
    get_user_highest_role_level(auth.uid()) >= 7
);

-- ============================================================================
-- بيانات تجريبية (اختياري - يمكن حذفها في الإنتاج)
-- ============================================================================

-- إدراج جلسة تجريبية
-- INSERT INTO interview_sessions (
--     session_name,
--     session_description,
--     session_date,
--     start_time,
--     end_time,
--     slot_duration,
--     interview_type,
--     meeting_link,
--     is_active
-- ) VALUES (
--     'مقابلات لجنة الإعلام',
--     'مقابلات المتقدمين للانضمام إلى لجنة الإعلام',
--     CURRENT_DATE + INTERVAL '2 days',
--     '09:00:00',
--     '15:00:00',
--     10,
--     'online',
--     'https://meet.google.com/example',
--     true
-- );

-- ============================================================================
-- ملاحظات
-- ============================================================================
-- 1. الفترات يتم توليدها تلقائياً عند إنشاء جلسة
-- 2. رمز الرابط العام يتم توليده تلقائياً
-- 3. المقابلة يتم إنشاؤها تلقائياً عند حجز فترة
-- 4. RLS Policies تسمح بالقراءة العامة والتحديث للحجز
-- 5. المسؤولون (مستوى 7+) لديهم صلاحيات كاملة
