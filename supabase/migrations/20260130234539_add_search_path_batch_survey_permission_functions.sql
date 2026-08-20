-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260130234539   الاسم: add_search_path_batch_survey_permission_functions

-- Migration: إضافة search_path لـ survey و permission functions

-- إنشاء helper function لإضافة search_path بشكل جماعي
DO $$
DECLARE
    func_record RECORD;
    func_def TEXT;
BEGIN
    -- قائمة الـ functions التي نريد تحديثها
    FOR func_record IN 
        SELECT 
            p.oid,
            p.proname,
            pg_get_functiondef(p.oid) as definition
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.prosecdef = true
          AND p.proname IN (
            'can_access_survey',
            'can_respond_to_survey',
            'can_change_name',
            'can_manage_site_visits',
            'can_view_site_visits',
            'check_any_permission',
            'check_user_permission',
            'calculate_average_rating',
            'calculate_nps_score'
          )
          AND NOT (
            array_position(p.proconfig, 'search_path=public, pg_temp') IS NOT NULL 
            OR array_position(p.proconfig, 'search_path=public,pg_temp') IS NOT NULL
          )
    LOOP
        -- استبدال SECURITY DEFINER بـ SECURITY DEFINER مع search_path
        func_def := func_record.definition;
        
        -- إضافة SET search_path قبل AS
        func_def := regexp_replace(
            func_def,
            'SECURITY DEFINER\s+AS',
            'SECURITY DEFINER' || E'\n SET search_path = public, pg_temp\nAS',
            'i'
        );
        
        -- تنفيذ التعريف الجديد
        EXECUTE func_def;
        
        RAISE NOTICE 'Updated function: %', func_record.proname;
    END LOOP;
END $$;
