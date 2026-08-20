-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260131213837   الاسم: fix_archive_membership_cycle_delete_statements


-- إصلاح دالة أرشفة دورة التسجيل
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
        gen_random_uuid(), id, full_name, phone, email, degree, college, major, 
        skills, preferred_committee, portfolio_url, social_twitter, 
        social_instagram, social_linkedin, about, status, admin_notes, 
        reviewed_by, reviewed_at, visitor_id, session_id, path, user_agent, 
        created_at, updated_at, approved_for_interview_at, 
        approved_for_interview_by, review_notes, cycle_id, 
        v_cycle_id, NOW()
    FROM membership_applications;
    
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
        gen_random_uuid(), id, application_id, interview_date, interview_location, 
        interview_type, meeting_link, interviewer_id, interviewer_notes, 
        status, result, result_notes, decided_by, decided_at, created_by, 
        created_at, updated_at, notes, migrated_to_user_id, migrated_at, 
        migration_notes, v_cycle_id, NOW()
    FROM membership_interviews;
    
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
        gen_random_uuid(), id, session_name, session_description, session_date, 
        start_time, end_time, slot_duration, interview_type, meeting_link, 
        location, is_active, public_link_token, max_bookings, 
        allow_cancellation, created_by, created_at, updated_at, 
        v_cycle_id, NOW()
    FROM interview_sessions;
    
    GET DIAGNOSTICS v_sessions_count = ROW_COUNT;
    
    -- أرشفة الفترات
    INSERT INTO archived_interview_slots (
        archive_id, id, session_id, slot_time, slot_end_time, is_booked, 
        booked_by, booked_at, interview_id, cancelled_at, 
        cancellation_reason, created_at, archived_cycle_id, archived_at
    )
    SELECT 
        gen_random_uuid(), id, session_id, slot_time, slot_end_time, is_booked, 
        booked_by, booked_at, interview_id, cancelled_at, 
        cancellation_reason, created_at, v_cycle_id, NOW()
    FROM interview_slots;
    
    GET DIAGNOSTICS v_slots_count = ROW_COUNT;
    
    -- أرشفة الدعوات المستخدمة في هذه الفترة (إذا كانت الدالة موجودة)
    BEGIN
        v_invitations_count := archive_invitations_with_cycle(v_cycle_id, v_start_date, v_end_date);
    EXCEPTION
        WHEN undefined_function THEN
            v_invitations_count := 0;
    END;
    
    -- حذف البيانات الأصلية (مع WHERE clause لتجنب الخطأ)
    DELETE FROM interview_slots WHERE id IS NOT NULL;
    DELETE FROM membership_interviews WHERE id IS NOT NULL;
    DELETE FROM interview_sessions WHERE id IS NOT NULL;
    DELETE FROM membership_applications WHERE id IS NOT NULL;
    
    -- تحديث إحصائيات الدورة
    UPDATE archived_membership_cycles
    SET 
        total_applications = v_applications_count,
        total_interviews = v_interviews_count,
        total_sessions = v_sessions_count
    WHERE id = v_cycle_id;
    
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

