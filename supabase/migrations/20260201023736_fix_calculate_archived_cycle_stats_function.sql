-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260201023736   الاسم: fix_calculate_archived_cycle_stats_function

-- إصلاح دالة حساب الإحصائيات التفصيلية
CREATE OR REPLACE FUNCTION calculate_archived_cycle_stats(p_cycle_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
    v_stats jsonb;
    v_registration jsonb;
    v_review jsonb;
    v_interviews jsonb;
    v_results jsonb;
    v_total_apps integer;
    v_pending integer;
    v_withdrawn integer;
    v_approved integer;
    v_rejected_review integer;
    v_total_interviews integer;
    v_completed integer;
    v_in_barzakh integer;
    v_total_sessions integer;
    v_accepted integer;
    v_rejected_final integer;
BEGIN
    -- إحصائيات باب التسجيل
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'pending'),
        COUNT(*) FILTER (WHERE status = 'withdrawn')
    INTO v_total_apps, v_pending, v_withdrawn
    FROM archived_membership_applications
    WHERE archived_cycle_id = p_cycle_id;
    
    v_registration := jsonb_build_object(
        'total_applications', COALESCE(v_total_apps, 0),
        'pending_review', COALESCE(v_pending, 0),
        'withdrawn', COALESCE(v_withdrawn, 0)
    );
    
    -- إحصائيات الفرز المبدئي
    SELECT 
        COUNT(*) FILTER (WHERE status = 'approved_for_interview'),
        COUNT(*) FILTER (WHERE status = 'rejected')
    INTO v_approved, v_rejected_review
    FROM archived_membership_applications
    WHERE archived_cycle_id = p_cycle_id;
    
    v_review := jsonb_build_object(
        'approved_for_interview', COALESCE(v_approved, 0),
        'rejected_in_review', COALESCE(v_rejected_review, 0)
    );
    
    -- إحصائيات المقابلات
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'completed'),
        COUNT(*) FILTER (WHERE result = 'pending' AND status = 'completed')
    INTO v_total_interviews, v_completed, v_in_barzakh
    FROM archived_membership_interviews
    WHERE archived_cycle_id = p_cycle_id;
    
    SELECT COUNT(DISTINCT id) 
    INTO v_total_sessions
    FROM archived_interview_sessions 
    WHERE archived_cycle_id = p_cycle_id;
    
    v_interviews := jsonb_build_object(
        'total_interviews', COALESCE(v_total_interviews, 0),
        'completed_interviews', COALESCE(v_completed, 0),
        'in_barzakh', COALESCE(v_in_barzakh, 0),
        'total_sessions', COALESCE(v_total_sessions, 0)
    );
    
    -- إحصائيات النتائج
    SELECT 
        COUNT(*) FILTER (WHERE result = 'accepted'),
        COUNT(*) FILTER (WHERE result = 'rejected')
    INTO v_accepted, v_rejected_final
    FROM archived_membership_interviews
    WHERE archived_cycle_id = p_cycle_id;
    
    v_results := jsonb_build_object(
        'accepted', COALESCE(v_accepted, 0),
        'rejected', COALESCE(v_rejected_final, 0)
    );
    
    -- دمج جميع الإحصائيات
    v_stats := jsonb_build_object(
        'registration', v_registration,
        'review', v_review,
        'interviews', v_interviews,
        'results', v_results
    );
    
    RETURN v_stats;
END;
$function$;
