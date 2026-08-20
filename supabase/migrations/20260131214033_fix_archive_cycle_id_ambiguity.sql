-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260131214033   الاسم: fix_archive_cycle_id_ambiguity


-- إصلاح الغموض في cycle_id
CREATE OR REPLACE FUNCTION archive_membership_cycle(
    p_cycle_name TEXT,
    p_cycle_year INTEGER,
    p_cycle_season TEXT,
    p_description TEXT DEFAULT NULL,
    p_archived_by UUID DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT, cycle_id UUID, stats JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_cycle_id UUID;
    v_applications_count INT;
    v_interviews_count INT;
    v_sessions_count INT;
    v_slots_count INT;
    v_invitations_count INT;
    v_start_date TIMESTAMPTZ;
    v_end_date TIMESTAMPTZ;
BEGIN
    -- تحديد نطاق التواريخ (آخر 6 أشهر)
    v_end_date := NOW();
    v_start_date := v_end_date - INTERVAL '6 months';
    
    -- إنشاء سجل الدورة
    INSERT INTO archived_membership_cycles (
        cycle_name, cycle_year, cycle_season, description, archived_by
    ) VALUES (
        p_cycle_name, p_cycle_year, p_cycle_season, 
        COALESCE(p_description, 'أرشفة تلقائية'), 
        COALESCE(p_archived_by, auth.uid())
    ) RETURNING id INTO v_cycle_id;
    
    -- أرشفة الطلبات
    INSERT INTO archived_membership_applications (
        archive_id, id, full_name, phone, email, degree, college, major, 
        skills, preferred_committee, portfolio_url, social_twitter, 
        social_instagram, social_linkedin, about, status, admin_notes, 
        reviewed_by, reviewed_at, visitor_id, session_id, path, user_agent, 
        created_at, updated_at, approved_for_interview_at, 
        approved_for_interview_by, review_notes, cycle_id, 
        archived_cycle_id, archived_at
    )
    SELECT 
        gen_random_uuid(), a.id, a.full_name, a.phone, a.email, a.degree, a.college, a.major, 
        a.skills, a.preferred_committee, a.portfolio_url, a.social_twitter, 
        a.social_instagram, a.social_linkedin, a.about, a.status, a.admin_notes, 
        a.reviewed_by, a.reviewed_at, a.visitor_id, a.session_id, a.path, a.user_agent, 
        a.created_at, a.updated_at, a.approved_for_interview_at, 
        a.approved_for_interview_by, a.review_notes, a.cycle_id, 
        v_cycle_id, NOW()
    FROM membership_applications a;
    
    GET DIAGNOSTICS v_applications_count = ROW_COUNT;
    
    -- أرشفة المقابلات
    INSERT INTO archived_membership_interviews (
        archive_id, id, application_id, interview_date, interview_location, 
        interview_type, meeting_link, interviewer_id, interviewer_notes, 
        status, result, result_notes, decided_by, decided_at, created_by, 
        created_at, updated_at, notes, migrated_to_user_id, migrated_at, 
        migration_notes, archived_cycle_id, archived_at
    )
    SELECT 
        gen_random_uuid(), i.id, i.application_id, i.interview_date, i.interview_location, 
        i.interview_type, i.meeting_link, i.interviewer_id, i.interviewer_notes, 
        i.status, i.result, i.result_notes, i.decided_by, i.decided_at, i.created_by, 
        i.created_at, i.updated_at, i.notes, i.migrated_to_user_id, i.migrated_at, 
        i.migration_notes, v_cycle_id, NOW()
    FROM membership_interviews i;
    
    GET DIAGNOSTICS v_interviews_count = ROW_COUNT;
    
    -- أرشفة الجلسات
    INSERT INTO archived_interview_sessions (
        archive_id, id, session_name, session_description, session_date, 
        start_time, end_time, slot_duration, interview_type, meeting_link, 
        location, is_active, public_link_token, max_bookings, 
        allow_cancellation, created_by, created_at, updated_at, 
        archived_cycle_id, archived_at
    )
    SELECT 
        gen_random_uuid(), s.id, s.session_name, s.session_description, s.session_date, 
        s.start_time, s.end_time, s.slot_duration, s.interview_type, s.meeting_link, 
        s.location, s.is_active, s.public_link_token, s.max_bookings, 
        s.allow_cancellation, s.created_by, s.created_at, s.updated_at, 
        v_cycle_id, NOW()
    FROM interview_sessions s;
    
    GET DIAGNOSTICS v_sessions_count = ROW_COUNT;
    
    -- أرشفة الفترات
    INSERT INTO archived_interview_slots (
        archive_id, id, session_id, slot_time, slot_end_time, is_booked, 
        booked_by, booked_at, interview_id, cancelled_at, 
        cancellation_reason, created_at, archived_cycle_id, archived_at
    )
    SELECT 
        gen_random_uuid(), sl.id, sl.session_id, sl.slot_time, sl.slot_end_time, sl.is_booked, 
        sl.booked_by, sl.booked_at, sl.interview_id, sl.cancelled_at, 
        sl.cancellation_reason, sl.created_at, v_cycle_id, NOW()
    FROM interview_slots sl;
    
    GET DIAGNOSTICS v_slots_count = ROW_COUNT;
    
    -- أرشفة الدعوات المستخدمة في هذه الفترة (إذا كانت الدالة موجودة)
    BEGIN
        v_invitations_count := archive_invitations_with_cycle(v_cycle_id, v_start_date, v_end_date);
    EXCEPTION
        WHEN undefined_function THEN
            v_invitations_count := 0;
    END;
    
    -- حذف البيانات الأصلية (مع WHERE clause لتجنب الخطأ)
    DELETE FROM interview_slots WHERE interview_slots.id IS NOT NULL;
    DELETE FROM membership_interviews WHERE membership_interviews.id IS NOT NULL;
    DELETE FROM interview_sessions WHERE interview_sessions.id IS NOT NULL;
    DELETE FROM membership_applications WHERE membership_applications.id IS NOT NULL;
    
    -- تحديث إحصائيات الدورة
    UPDATE archived_membership_cycles
    SET 
        total_applications = v_applications_count,
        total_interviews = v_interviews_count,
        total_sessions = v_sessions_count
    WHERE archived_membership_cycles.id = v_cycle_id;
    
    RETURN QUERY SELECT 
        TRUE,
        format('تم أرشفة %s طلب، %s مقابلة، %s جلسة، %s فترة، %s دعوة',
            v_applications_count, v_interviews_count, v_sessions_count, 
            v_slots_count, v_invitations_count),
        v_cycle_id,
        jsonb_build_object(
            'applications', v_applications_count,
            'interviews', v_interviews_count,
            'sessions', v_sessions_count,
            'slots', v_slots_count,
            'invitations', v_invitations_count
        );
END;
$$;

