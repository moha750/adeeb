-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260201023622   الاسم: fix_get_archived_cycle_details_function

-- إصلاح دالة get_archived_cycle_details لاستخدام أسماء الجداول الصحيحة
CREATE OR REPLACE FUNCTION public.get_archived_cycle_details(p_cycle_id uuid)
RETURNS TABLE(cycle_info jsonb, applications jsonb, interviews jsonb, sessions jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        -- معلومات الدورة من archived_membership_cycles
        to_jsonb(c.*) as cycle_info,
        
        -- الطلبات من archived_membership_applications
        (SELECT jsonb_agg(to_jsonb(a.*))
         FROM archived_membership_applications a
         WHERE a.archived_cycle_id = p_cycle_id) as applications,
        
        -- المقابلات من archived_membership_interviews
        (SELECT jsonb_agg(to_jsonb(i.*))
         FROM archived_membership_interviews i
         WHERE i.archived_cycle_id = p_cycle_id) as interviews,
        
        -- الجلسات من archived_interview_sessions
        (SELECT jsonb_agg(to_jsonb(s.*))
         FROM archived_interview_sessions s
         WHERE s.archived_cycle_id = p_cycle_id) as sessions
    FROM archived_membership_cycles c
    WHERE c.id = p_cycle_id;
END;
$function$;
