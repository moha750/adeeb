-- ============================================================================
-- التحقق من قاعدة البيانات وإضافة بيانات اختبار
-- ============================================================================

-- ============================================================================
-- الخطوة 1: التحقق من الأرقام المطلوبة
-- ============================================================================

DO $$
DECLARE
    phone_record RECORD;
    phones_to_check TEXT[] := ARRAY['0570787919', '0565095542', '0576646958'];
    phone_num TEXT;
BEGIN
    RAISE NOTICE '🔍 ============================================';
    RAISE NOTICE '🔍 التحقق من الأرقام المطلوبة';
    RAISE NOTICE '🔍 ============================================';
    RAISE NOTICE '';
    
    FOREACH phone_num IN ARRAY phones_to_check
    LOOP
        RAISE NOTICE '📱 الرقم: %', phone_num;
        
        -- البحث عن الرقم في قاعدة البيانات
        SELECT 
            id,
            full_name,
            phone,
            status,
            preferred_committee
        INTO phone_record
        FROM membership_applications
        WHERE normalize_phone(phone) = normalize_phone(phone_num)
        LIMIT 1;
        
        IF phone_record.id IS NOT NULL THEN
            RAISE NOTICE '   ✅ موجود في قاعدة البيانات';
            RAISE NOTICE '      الاسم: %', phone_record.full_name;
            RAISE NOTICE '      الرقم المخزن: %', phone_record.phone;
            RAISE NOTICE '      الحالة: %', phone_record.status;
            RAISE NOTICE '      اللجنة: %', phone_record.preferred_committee;
            
            IF phone_record.status = 'approved_for_interview' THEN
                RAISE NOTICE '      ✅ الحالة صحيحة';
            ELSE
                RAISE NOTICE '      ❌ الحالة خاطئة - يجب أن تكون: approved_for_interview';
            END IF;
        ELSE
            RAISE NOTICE '   ❌ غير موجود في قاعدة البيانات';
        END IF;
        
        RAISE NOTICE '';
    END LOOP;
END $$;

-- ============================================================================
-- الخطوة 2: عرض إحصائيات الطلبات
-- ============================================================================

DO $$
DECLARE
    total_apps INTEGER;
    approved_apps INTEGER;
    status_record RECORD;
BEGIN
    RAISE NOTICE '📊 ============================================';
    RAISE NOTICE '📊 إحصائيات الطلبات';
    RAISE NOTICE '📊 ============================================';
    RAISE NOTICE '';
    
    SELECT COUNT(*) INTO total_apps FROM membership_applications;
    RAISE NOTICE 'إجمالي الطلبات: %', total_apps;
    
    SELECT COUNT(*) INTO approved_apps 
    FROM membership_applications 
    WHERE status = 'approved_for_interview';
    RAISE NOTICE 'الطلبات المقبولة للمقابلة: %', approved_apps;
    
    RAISE NOTICE '';
    RAISE NOTICE 'توزيع الحالات:';
    
    FOR status_record IN
        SELECT status, COUNT(*) as count
        FROM membership_applications
        GROUP BY status
        ORDER BY count DESC
    LOOP
        RAISE NOTICE '   - %: %', status_record.status, status_record.count;
    END LOOP;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- الخطوة 3: تحديث حالة الأرقام المطلوبة (إذا كانت موجودة)
-- ============================================================================

DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    RAISE NOTICE '🔧 ============================================';
    RAISE NOTICE '🔧 تحديث حالة الأرقام المطلوبة';
    RAISE NOTICE '🔧 ============================================';
    RAISE NOTICE '';
    
    -- تحديث حالة الطلبات
    UPDATE membership_applications
    SET 
        status = 'approved_for_interview',
        approved_for_interview_at = NOW(),
        approved_for_interview_by = (
            SELECT id FROM profiles 
            WHERE email LIKE '%admin%' OR email LIKE '%@%'
            LIMIT 1
        )
    WHERE normalize_phone(phone) IN (
        normalize_phone('0570787919'),
        normalize_phone('0565095542'),
        normalize_phone('0576646958')
    )
    AND status != 'approved_for_interview';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    IF updated_count > 0 THEN
        RAISE NOTICE '✅ تم تحديث % طلب/طلبات', updated_count;
    ELSE
        RAISE NOTICE '⚠️  لم يتم تحديث أي طلبات (إما غير موجودة أو محدثة مسبقاً)';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- الخطوة 4: إضافة بيانات اختبار (إذا لم تكن موجودة)
-- ============================================================================

DO $$
DECLARE
    test_phones TEXT[] := ARRAY['0570787919', '0565095542', '0576646958'];
    test_names TEXT[] := ARRAY['محمد أحمد', 'فاطمة علي', 'عبدالله سعيد'];
    test_committees TEXT[] := ARRAY['الإعلام', 'التصميم', 'البرمجة'];
    i INTEGER;
    phone_exists BOOLEAN;
BEGIN
    RAISE NOTICE '➕ ============================================';
    RAISE NOTICE '➕ إضافة بيانات اختبار (إذا لزم الأمر)';
    RAISE NOTICE '➕ ============================================';
    RAISE NOTICE '';
    
    FOR i IN 1..array_length(test_phones, 1)
    LOOP
        -- التحقق من وجود الرقم
        SELECT EXISTS (
            SELECT 1 FROM membership_applications
            WHERE normalize_phone(phone) = normalize_phone(test_phones[i])
        ) INTO phone_exists;
        
        IF NOT phone_exists THEN
            RAISE NOTICE '➕ إضافة طلب جديد: % - %', test_names[i], test_phones[i];
            
            INSERT INTO membership_applications (
                full_name,
                phone,
                email,
                degree,
                college,
                major,
                skills,
                preferred_committee,
                about,
                status,
                approved_for_interview_at,
                approved_for_interview_by
            ) VALUES (
                test_names[i],
                test_phones[i],
                LOWER(REPLACE(test_names[i], ' ', '.')) || '@test.com',
                'بكالوريوس',
                'كلية الحاسب',
                'علوم الحاسب',
                'مهارات متنوعة',
                test_committees[i],
                'طلب اختبار للنظام',
                'approved_for_interview',
                NOW(),
                (SELECT id FROM profiles LIMIT 1)
            );
            
            RAISE NOTICE '   ✅ تم إضافة الطلب بنجاح';
        ELSE
            RAISE NOTICE '⏭️  الرقم % موجود مسبقاً', test_phones[i];
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- الخطوة 5: التحقق النهائي
-- ============================================================================

DO $$
DECLARE
    final_record RECORD;
BEGIN
    RAISE NOTICE '✅ ============================================';
    RAISE NOTICE '✅ التحقق النهائي من البيانات';
    RAISE NOTICE '✅ ============================================';
    RAISE NOTICE '';
    
    RAISE NOTICE '📋 الطلبات المقبولة للمقابلة:';
    RAISE NOTICE '';
    
    FOR final_record IN
        SELECT 
            full_name,
            phone,
            normalize_phone(phone) as normalized,
            email,
            preferred_committee,
            status
        FROM membership_applications
        WHERE status = 'approved_for_interview'
        ORDER BY created_at DESC
        LIMIT 10
    LOOP
        RAISE NOTICE '   ✓ % | % → %', 
            final_record.full_name,
            final_record.phone,
            final_record.normalized;
        RAISE NOTICE '     البريد: % | اللجنة: %',
            final_record.email,
            final_record.preferred_committee;
        RAISE NOTICE '';
    END LOOP;
    
    RAISE NOTICE '✅ اكتمل الإعداد - يمكنك الآن اختبار نظام الحجز';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 للاختبار، استخدم أحد الأرقام التالية:';
    RAISE NOTICE '   - 0570787919';
    RAISE NOTICE '   - 0565095542';
    RAISE NOTICE '   - 0576646958';
END $$;

-- ============================================================================
-- الخطوة 6: اختبار الدالة مباشرة
-- ============================================================================

DO $$
DECLARE
    test_result RECORD;
    test_session_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🧪 ============================================';
    RAISE NOTICE '🧪 اختبار دالة validate_phone_for_booking';
    RAISE NOTICE '🧪 ============================================';
    RAISE NOTICE '';
    
    -- اختبار الرقم 0570787919
    RAISE NOTICE '🧪 اختبار الرقم: 0570787919';
    
    FOR test_result IN
        SELECT * FROM validate_phone_for_booking('0570787919', test_session_id)
    LOOP
        RAISE NOTICE '   is_valid: %', test_result.is_valid;
        RAISE NOTICE '   application_id: %', test_result.application_id;
        RAISE NOTICE '   full_name: %', test_result.full_name;
        RAISE NOTICE '   email: %', test_result.email;
        RAISE NOTICE '   preferred_committee: %', test_result.preferred_committee;
        RAISE NOTICE '   error_message: %', test_result.error_message;
        
        IF test_result.is_valid THEN
            RAISE NOTICE '   ✅ الاختبار نجح!';
        ELSE
            RAISE NOTICE '   ❌ الاختبار فشل: %', test_result.error_message;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
END $$;
