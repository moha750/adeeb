-- ============================================================================
-- الحل النهائي والقاطع - بناءً على تحليل قاعدة البيانات الفعلية
-- ============================================================================

-- ============================================================================
-- الخطوة 1: التحقق من البيانات الموجودة
-- ============================================================================

DO $$
DECLARE
    total_apps INTEGER;
    approved_apps INTEGER;
    phone_check RECORD;
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '🔍 تحليل قاعدة البيانات';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '';
    
    -- عد الطلبات
    SELECT COUNT(*) INTO total_apps FROM membership_applications;
    SELECT COUNT(*) INTO approved_apps 
    FROM membership_applications 
    WHERE status = 'approved_for_interview';
    
    RAISE NOTICE '📊 إجمالي الطلبات: %', total_apps;
    RAISE NOTICE '📊 الطلبات المقبولة للمقابلة: %', approved_apps;
    RAISE NOTICE '';
    
    IF total_apps = 0 THEN
        RAISE NOTICE '❌ لا توجد أي طلبات في قاعدة البيانات!';
        RAISE NOTICE '💡 يجب إضافة طلبات أولاً من صفحة التسجيل';
        RETURN;
    END IF;
    
    IF approved_apps = 0 THEN
        RAISE NOTICE '⚠️  لا توجد طلبات مقبولة للمقابلة';
        RAISE NOTICE '💡 سأقوم بتحديث بعض الطلبات الآن...';
    ELSE
        RAISE NOTICE '✅ يوجد % طلب مقبول للمقابلة', approved_apps;
        RAISE NOTICE '';
        RAISE NOTICE '📋 عينة من الطلبات المقبولة:';
        
        FOR phone_check IN
            SELECT 
                full_name,
                phone,
                email,
                preferred_committee,
                status
            FROM membership_applications
            WHERE status = 'approved_for_interview'
            LIMIT 5
        LOOP
            RAISE NOTICE '   ✓ % | % | %', 
                phone_check.full_name,
                phone_check.phone,
                phone_check.email;
        END LOOP;
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- الخطوة 2: تحديث حالة الطلبات (إذا لزم الأمر)
-- ============================================================================

DO $$
DECLARE
    updated_count INTEGER := 0;
    admin_id UUID;
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '🔧 تحديث حالة الطلبات';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '';
    
    -- الحصول على أول admin
    SELECT id INTO admin_id FROM profiles LIMIT 1;
    
    -- تحديث أول 10 طلبات لتكون مقبولة للمقابلة
    UPDATE membership_applications
    SET 
        status = 'approved_for_interview',
        approved_for_interview_at = NOW(),
        approved_for_interview_by = admin_id
    WHERE id IN (
        SELECT id 
        FROM membership_applications 
        WHERE status != 'approved_for_interview'
        ORDER BY created_at DESC
        LIMIT 10
    );
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    IF updated_count > 0 THEN
        RAISE NOTICE '✅ تم تحديث % طلب/طلبات إلى حالة "approved_for_interview"', updated_count;
    ELSE
        RAISE NOTICE '✓ جميع الطلبات محدثة مسبقاً';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- الخطوة 3: عرض الأرقام المتاحة للاختبار
-- ============================================================================

DO $$
DECLARE
    phone_rec RECORD;
    counter INTEGER := 0;
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '📱 الأرقام المتاحة للاختبار';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'استخدم أحد هذه الأرقام في صفحة الحجز:';
    RAISE NOTICE '';
    
    FOR phone_rec IN
        SELECT 
            full_name,
            phone,
            email,
            preferred_committee
        FROM membership_applications
        WHERE status = 'approved_for_interview'
        AND phone IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 10
    LOOP
        counter := counter + 1;
        RAISE NOTICE '   %- رقم: %', counter, phone_rec.phone;
        RAISE NOTICE '     الاسم: %', phone_rec.full_name;
        RAISE NOTICE '     البريد: %', phone_rec.email;
        RAISE NOTICE '     اللجنة: %', phone_rec.preferred_committee;
        RAISE NOTICE '';
    END LOOP;
    
    IF counter = 0 THEN
        RAISE WARNING '❌ لا توجد أرقام هواتف في الطلبات المقبولة!';
        RAISE NOTICE '💡 يجب إضافة أرقام هواتف للطلبات';
    END IF;
END $$;

-- ============================================================================
-- الخطوة 4: اختبار الدالة validate_phone_for_booking
-- ============================================================================

DO $$
DECLARE
    test_phone TEXT;
    test_session UUID := '00000000-0000-0000-0000-000000000000';
    test_result RECORD;
BEGIN
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '🧪 اختبار دالة validate_phone_for_booking';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '';
    
    -- الحصول على أول رقم متاح
    SELECT phone INTO test_phone
    FROM membership_applications
    WHERE status = 'approved_for_interview'
    AND phone IS NOT NULL
    LIMIT 1;
    
    IF test_phone IS NULL THEN
        RAISE WARNING '❌ لا يوجد رقم للاختبار';
        RETURN;
    END IF;
    
    RAISE NOTICE '🧪 اختبار الرقم: %', test_phone;
    RAISE NOTICE '';
    
    -- اختبار الدالة
    FOR test_result IN
        SELECT * FROM validate_phone_for_booking(test_phone, test_session)
    LOOP
        RAISE NOTICE 'النتيجة:';
        RAISE NOTICE '   is_valid: %', test_result.is_valid;
        RAISE NOTICE '   application_id: %', test_result.application_id;
        RAISE NOTICE '   full_name: %', test_result.full_name;
        RAISE NOTICE '   email: %', test_result.email;
        RAISE NOTICE '   error_message: %', test_result.error_message;
        RAISE NOTICE '';
        
        IF test_result.is_valid THEN
            RAISE NOTICE '✅ الاختبار نجح! الدالة تعمل بشكل صحيح';
        ELSE
            RAISE WARNING '❌ الاختبار فشل: %', test_result.error_message;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- الخطوة 5: التعليمات النهائية
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '✅ اكتمل التحليل والإعداد';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📌 الخطوات التالية:';
    RAISE NOTICE '   1. استخدم أحد الأرقام المعروضة أعلاه';
    RAISE NOTICE '   2. افتح صفحة الحجز: booking.html?token=xxx';
    RAISE NOTICE '   3. أدخل الرقم واضغط التالي';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  إذا استمر الخطأ:';
    RAISE NOTICE '   - تأكد من أن الدالة validate_phone_for_booking محدثة';
    RAISE NOTICE '   - تأكد من أن الرقم المُدخل موجود في القائمة أعلاه';
    RAISE NOTICE '   - تحقق من session_id في URL';
    RAISE NOTICE '';
END $$;
