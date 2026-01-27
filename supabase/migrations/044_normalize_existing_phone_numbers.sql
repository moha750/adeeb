-- ============================================================================
-- توحيد الأرقام المخزنة في قاعدة البيانات
-- Migration 044 - Normalize Existing Data
-- ============================================================================
-- 
-- الهدف: توحيد جميع أرقام الهاتف المخزنة في membership_applications
-- لضمان التوافق الكامل مع نظام الحجز
-- ============================================================================

-- ============================================================================
-- 1. تحديث جميع أرقام الهاتف الموجودة
-- ============================================================================

DO $$
DECLARE
    updated_count INTEGER := 0;
    total_count INTEGER := 0;
    app_record RECORD;
    normalized TEXT;
BEGIN
    -- عد إجمالي السجلات
    SELECT COUNT(*) INTO total_count
    FROM membership_applications
    WHERE phone IS NOT NULL;
    
    RAISE NOTICE '📊 إجمالي السجلات: %', total_count;
    RAISE NOTICE '🔄 بدء توحيد أرقام الهاتف...';
    RAISE NOTICE '';
    
    -- معالجة كل سجل
    FOR app_record IN 
        SELECT id, phone, full_name
        FROM membership_applications
        WHERE phone IS NOT NULL
    LOOP
        -- توحيد الرقم
        normalized := normalize_phone(app_record.phone);
        
        -- تحديث إذا كان الرقم مختلفاً
        IF normalized IS NOT NULL AND normalized != app_record.phone THEN
            UPDATE membership_applications
            SET phone = normalized
            WHERE id = app_record.id;
            
            updated_count := updated_count + 1;
            
            RAISE NOTICE '✓ تم تحديث: % | من: % → إلى: %', 
                app_record.full_name, 
                app_record.phone, 
                normalized;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ اكتمل التوحيد';
    RAISE NOTICE '📈 تم تحديث % من أصل % سجل', updated_count, total_count;
    
    IF updated_count = 0 THEN
        RAISE NOTICE '✨ جميع الأرقام موحدة بالفعل';
    END IF;
END $$;

-- ============================================================================
-- 2. إضافة قيد للتأكد من صحة الأرقام المستقبلية
-- ============================================================================

-- حذف القيد القديم إن وجد
ALTER TABLE membership_applications 
DROP CONSTRAINT IF EXISTS check_phone_format;

-- إضافة قيد جديد
ALTER TABLE membership_applications
ADD CONSTRAINT check_phone_format 
CHECK (
    phone IS NULL OR 
    (
        normalize_phone(phone) IS NOT NULL AND
        phone = normalize_phone(phone)
    )
);

-- ============================================================================
-- 3. إنشاء trigger لتوحيد الأرقام تلقائياً عند الإدخال
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_normalize_phone()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.phone IS NOT NULL THEN
        NEW.phone := normalize_phone(NEW.phone);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- حذف الـ trigger القديم إن وجد
DROP TRIGGER IF EXISTS trigger_auto_normalize_phone ON membership_applications;

-- إنشاء trigger جديد
CREATE TRIGGER trigger_auto_normalize_phone
    BEFORE INSERT OR UPDATE OF phone
    ON membership_applications
    FOR EACH ROW
    EXECUTE FUNCTION auto_normalize_phone();

-- ============================================================================
-- 4. التحقق من النتائج
-- ============================================================================

DO $$
DECLARE
    invalid_count INTEGER;
    valid_count INTEGER;
BEGIN
    -- عد الأرقام غير الصحيحة
    SELECT COUNT(*) INTO invalid_count
    FROM membership_applications
    WHERE phone IS NOT NULL 
    AND normalize_phone(phone) IS NULL;
    
    -- عد الأرقام الصحيحة
    SELECT COUNT(*) INTO valid_count
    FROM membership_applications
    WHERE phone IS NOT NULL 
    AND normalize_phone(phone) IS NOT NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 إحصائيات التحقق:';
    RAISE NOTICE '   ✅ أرقام صحيحة: %', valid_count;
    RAISE NOTICE '   ❌ أرقام غير صحيحة: %', invalid_count;
    
    IF invalid_count > 0 THEN
        RAISE WARNING '⚠️  يوجد % أرقام غير صحيحة تحتاج مراجعة يدوية', invalid_count;
    ELSE
        RAISE NOTICE '   ✨ جميع الأرقام صحيحة!';
    END IF;
END $$;

-- ============================================================================
-- 5. تعليقات توضيحية
-- ============================================================================

COMMENT ON CONSTRAINT check_phone_format ON membership_applications IS 
'التأكد من أن جميع أرقام الهاتف المخزنة بصيغة موحدة (0582077204)';

COMMENT ON FUNCTION auto_normalize_phone() IS 
'توحيد رقم الهاتف تلقائياً عند الإدخال أو التحديث';

COMMENT ON TRIGGER trigger_auto_normalize_phone ON membership_applications IS 
'يقوم بتوحيد رقم الهاتف تلقائياً قبل الحفظ في قاعدة البيانات';
