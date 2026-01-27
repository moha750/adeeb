-- ============================================================================
-- تشخيص مشكلة التحقق من رقم الهاتف
-- ============================================================================

-- ============================================================================
-- 1. التحقق من الأرقام المُدخلة مقابل الأرقام الموجودة
-- ============================================================================

-- الأرقام التي تم اختبارها:
-- 0570787919
-- 0565095542

DO $$
BEGIN
    RAISE NOTICE '🔍 ============================================';
    RAISE NOTICE '🔍 تشخيص الأرقام المُدخلة';
    RAISE NOTICE '🔍 ============================================';
    RAISE NOTICE '';
    
    -- اختبار الرقم الأول: 0570787919
    RAISE NOTICE '📱 الرقم الأول: 0570787919';
    RAISE NOTICE '   الرقم الموحد: %', normalize_phone('0570787919');
    
    -- البحث عن الرقم في قاعدة البيانات
    IF EXISTS (
        SELECT 1 FROM membership_applications 
        WHERE normalize_phone(phone) = normalize_phone('0570787919')
    ) THEN
        RAISE NOTICE '   ✅ الرقم موجود في قاعدة البيانات';
        
        -- عرض تفاصيل الطلب
        DECLARE
            app RECORD;
        BEGIN
            SELECT * INTO app
            FROM membership_applications
            WHERE normalize_phone(phone) = normalize_phone('0570787919')
            LIMIT 1;
            
            RAISE NOTICE '   📋 الاسم: %', app.full_name;
            RAISE NOTICE '   📋 الحالة: %', app.status;
            RAISE NOTICE '   📋 الرقم المخزن: %', app.phone;
            RAISE NOTICE '   📋 اللجنة المفضلة: %', app.preferred_committee;
        END;
    ELSE
        RAISE NOTICE '   ❌ الرقم غير موجود في قاعدة البيانات';
    END IF;
    
    RAISE NOTICE '';
    
    -- اختبار الرقم الثاني: 0565095542
    RAISE NOTICE '📱 الرقم الثاني: 0565095542';
    RAISE NOTICE '   الرقم الموحد: %', normalize_phone('0565095542');
    
    IF EXISTS (
        SELECT 1 FROM membership_applications 
        WHERE normalize_phone(phone) = normalize_phone('0565095542')
    ) THEN
        RAISE NOTICE '   ✅ الرقم موجود في قاعدة البيانات';
        
        DECLARE
            app RECORD;
        BEGIN
            SELECT * INTO app
            FROM membership_applications
            WHERE normalize_phone(phone) = normalize_phone('0565095542')
            LIMIT 1;
            
            RAISE NOTICE '   📋 الاسم: %', app.full_name;
            RAISE NOTICE '   📋 الحالة: %', app.status;
            RAISE NOTICE '   📋 الرقم المخزن: %', app.phone;
            RAISE NOTICE '   📋 اللجنة المفضلة: %', app.preferred_committee;
        END;
    ELSE
        RAISE NOTICE '   ❌ الرقم غير موجود في قاعدة البيانات';
    END IF;
END $$;

-- ============================================================================
-- 2. عرض جميع الطلبات وحالاتها
-- ============================================================================

DO $$
DECLARE
    app RECORD;
    total_count INTEGER;
    approved_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📊 ============================================';
    RAISE NOTICE '📊 إحصائيات الطلبات';
    RAISE NOTICE '📊 ============================================';
    
    -- إجمالي الطلبات
    SELECT COUNT(*) INTO total_count FROM membership_applications;
    RAISE NOTICE 'إجمالي الطلبات: %', total_count;
    
    -- الطلبات المقبولة للمقابلة
    SELECT COUNT(*) INTO approved_count 
    FROM membership_applications 
    WHERE status = 'approved_for_interview';
    RAISE NOTICE 'الطلبات المقبولة للمقابلة: %', approved_count;
    
    RAISE NOTICE '';
    
    -- عرض حالات الطلبات
    RAISE NOTICE '📋 توزيع الحالات:';
    FOR app IN 
        SELECT status, COUNT(*) as count
        FROM membership_applications
        GROUP BY status
        ORDER BY count DESC
    LOOP
        RAISE NOTICE '   - %: %', app.status, app.count;
    END LOOP;
    
    RAISE NOTICE '';
    
    -- عرض عينة من الطلبات المقبولة للمقابلة
    IF approved_count > 0 THEN
        RAISE NOTICE '📋 عينة من الطلبات المقبولة للمقابلة:';
        FOR app IN 
            SELECT full_name, phone, normalize_phone(phone) as normalized, preferred_committee
            FROM membership_applications
            WHERE status = 'approved_for_interview'
            LIMIT 10
        LOOP
            RAISE NOTICE '   - % | % → % | %', 
                app.full_name, 
                app.phone, 
                app.normalized,
                app.preferred_committee;
        END LOOP;
    ELSE
        RAISE WARNING '⚠️  لا توجد طلبات بحالة "approved_for_interview"';
        RAISE NOTICE '';
        RAISE NOTICE '💡 الحل:';
        RAISE NOTICE '   1. تأكد من وجود طلبات في جدول membership_applications';
        RAISE NOTICE '   2. قم بتغيير حالة بعض الطلبات إلى "approved_for_interview"';
        RAISE NOTICE '   3. استخدم هذا الاستعلام:';
        RAISE NOTICE '      UPDATE membership_applications';
        RAISE NOTICE '      SET status = ''approved_for_interview''';
        RAISE NOTICE '      WHERE phone IN (''0570787919'', ''0565095542'');';
    END IF;
END $$;

-- ============================================================================
-- 3. اختبار الدالة مباشرة
-- ============================================================================

DO $$
DECLARE
    result RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🧪 ============================================';
    RAISE NOTICE '🧪 اختبار الدالة validate_phone_for_booking';
    RAISE NOTICE '🧪 ============================================';
    RAISE NOTICE '';
    
    -- اختبار مع رقم وهمي لجلسة وهمية
    RAISE NOTICE '🧪 اختبار 1: رقم 0570787919';
    
    FOR result IN 
        SELECT * FROM validate_phone_for_booking(
            '0570787919',
            '00000000-0000-0000-0000-000000000000'::UUID
        )
    LOOP
        RAISE NOTICE '   is_valid: %', result.is_valid;
        RAISE NOTICE '   application_id: %', result.application_id;
        RAISE NOTICE '   full_name: %', result.full_name;
        RAISE NOTICE '   error_message: %', result.error_message;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '🧪 اختبار 2: رقم 0565095542';
    
    FOR result IN 
        SELECT * FROM validate_phone_for_booking(
            '0565095542',
            '00000000-0000-0000-0000-000000000000'::UUID
        )
    LOOP
        RAISE NOTICE '   is_valid: %', result.is_valid;
        RAISE NOTICE '   application_id: %', result.application_id;
        RAISE NOTICE '   full_name: %', result.full_name;
        RAISE NOTICE '   error_message: %', result.error_message;
    END LOOP;
END $$;
