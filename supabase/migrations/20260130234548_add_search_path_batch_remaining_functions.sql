-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260130234548   الاسم: add_search_path_batch_remaining_functions

-- Migration: إضافة search_path لجميع الـ functions المتبقية

DO $$
DECLARE
    func_record RECORD;
    func_def TEXT;
    updated_count INTEGER := 0;
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
          AND NOT (
            array_position(p.proconfig, 'search_path=public, pg_temp') IS NOT NULL 
            OR array_position(p.proconfig, 'search_path=public,pg_temp') IS NOT NULL
            OR array_position(p.proconfig, 'search_path=public') IS NOT NULL
          )
    LOOP
        func_def := func_record.definition;
        
        -- إضافة SET search_path قبل AS
        func_def := regexp_replace(
            func_def,
            'SECURITY DEFINER\s+AS',
            'SECURITY DEFINER' || E'\n SET search_path = public, pg_temp\nAS',
            'i'
        );
        
        -- تنفيذ التعريف الجديد
        BEGIN
            EXECUTE func_def;
            updated_count := updated_count + 1;
            RAISE NOTICE 'Updated function: %', func_record.proname;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to update function %: %', func_record.proname, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Total functions updated: %', updated_count;
END $$;
