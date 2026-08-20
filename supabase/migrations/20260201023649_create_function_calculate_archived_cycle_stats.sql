-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260201023649   الاسم: create_function_calculate_archived_cycle_stats

-- دالة لحساب الإحصائيات التفصيلية من البيانات المؤرشفة
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
BEGIN
    -- إحصائيات باب التسجيل
    SELECT jsonb_build_object(
        'total_applications', COUNT(*),
        'pending_review', COUNT(*) FILTER (WHERE status = 'pending'),
        'withdrawn', COUNT(*) FILTER (WHERE status = 'withdrawn')
    ) INTO v_registration
    FROM archived_membership_applications
    WHERE archived_cycle_id = p_cycle_id;
    
    -- إحصائيات الفرز المبدئي
    SELECT jsonb_build_object(
        'approved_for_interview', COUNT(*) FILTER (WHERE status = 'approved_for_interview'),
        'rejected_in_review', COUNT(*) FILTER (WHERE status = 'rejected')
    ) INTO v_review
    FROM archived_membership_applications
    WHERE archived_cycle_id = p_cycle_id;
    
    -- إحصائيات المقابلات
    SELECT jsonb_build_object(
        'total_interviews', COUNT(*),
        'completed_interviews', COUNT(*) FILTER (WHERE status = 'completed'),
        'in_barzakh', COUNT(*) FILTER (WHERE result = 'pending' AND status = 'completed'),
        'total_sessions', (SELECT COUNT(DISTINCT id) FROM archived_interview_sessions WHERE archived_cycle_id = p_cycle_id)
    ) INTO v_interviews
    FROM archived_membership_interviews
    WHERE archived_cycle_id = p_cycle_id;
    
    -- إحصائيات النتائج
    SELECT jsonb_build_object(
        'accepted', COUNT(*) FILTER (WHERE result = 'accepted'),
        'rejected', COUNT(*) FILTER (WHERE result = 'rejected')
    ) INTO v_results
    FROM archived_membership_interviews
    WHERE archived_cycle_id = p_cycle_id;
    
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
