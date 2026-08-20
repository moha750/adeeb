-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260130234644   الاسم: add_search_path_trigger_functions

-- Migration: إضافة search_path لجميع trigger functions المتبقية

DO $$
DECLARE
    func_record RECORD;
    func_def TEXT;
    updated_count INTEGER := 0;
BEGIN
    -- معالجة جميع الـ trigger functions بدون search_path
    FOR func_record IN 
        SELECT 
            p.oid,
            p.proname,
            pg_get_functiondef(p.oid) as definition
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.prokind = 'f'
          AND (p.prorettype = 'trigger'::regtype::oid OR p.proname LIKE '%trigger%' OR p.proname LIKE 'update_%_updated_at')
          AND NOT (
            array_position(p.proconfig, 'search_path=public, pg_temp') IS NOT NULL 
            OR array_position(p.proconfig, 'search_path=public,pg_temp') IS NOT NULL
            OR array_position(p.proconfig, 'search_path=public') IS NOT NULL
          )
    LOOP
        func_def := func_record.definition;
        
        -- إضافة SET search_path
        IF func_def ~ 'LANGUAGE plpgsql' THEN
            func_def := regexp_replace(
                func_def,
                '(LANGUAGE plpgsql)',
                E'\\1\n SET search_path = public, pg_temp',
                'i'
            );
        ELSIF func_def ~ 'LANGUAGE sql' THEN
            func_def := regexp_replace(
                func_def,
                '(LANGUAGE sql)',
                E'\\1\n SET search_path = public, pg_temp',
                'i'
            );
        END IF;
        
        BEGIN
            EXECUTE func_def;
            updated_count := updated_count + 1;
            RAISE NOTICE 'Updated trigger function: %', func_record.proname;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to update function %: %', func_record.proname, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Total trigger functions updated: %', updated_count;
END $$;
