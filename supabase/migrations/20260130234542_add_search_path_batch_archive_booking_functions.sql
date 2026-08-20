-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260130234542   الاسم: add_search_path_batch_archive_booking_functions

-- Migration: إضافة search_path لباقي archive و booking functions

DO $$
DECLARE
    func_record RECORD;
    func_def TEXT;
BEGIN
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
            'archive_invitations_with_cycle',
            'archive_membership_cycle',
            'delete_archived_cycle',
            'get_archived_cycle_details',
            'create_membership_archive',
            'cancel_interview_admin',
            'capture_visit_ip'
          )
          AND NOT (
            array_position(p.proconfig, 'search_path=public, pg_temp') IS NOT NULL 
            OR array_position(p.proconfig, 'search_path=public,pg_temp') IS NOT NULL
          )
    LOOP
        func_def := func_record.definition;
        
        func_def := regexp_replace(
            func_def,
            'SECURITY DEFINER\s+AS',
            'SECURITY DEFINER' || E'\n SET search_path = public, pg_temp\nAS',
            'i'
        );
        
        EXECUTE func_def;
        
        RAISE NOTICE 'Updated function: %', func_record.proname;
    END LOOP;
END $$;
