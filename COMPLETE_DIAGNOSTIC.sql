-- ============================================================================
-- فحص شامل ودقيق لنظام الحجز
-- ============================================================================

-- ============================================================================
-- 1. فحص الدالة validate_phone_for_booking
-- ============================================================================

SELECT 
    'الدالة validate_phone_for_booking' as check_name,
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_name = 'validate_phone_for_booking';

-- ============================================================================
-- 2. فحص دالة normalize_phone
-- ============================================================================

SELECT 
    'الدالة normalize_phone' as check_name,
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name = 'normalize_phone';

-- ============================================================================
-- 3. فحص الرقم 0550912444
-- ============================================================================

SELECT 
    '=== فحص الرقم 0550912444 ===' as section,
    id,
    full_name,
    phone,
    status,
    approved_for_interview_at,
    created_at
FROM membership_applications
WHERE phone = '0550912444'
   OR phone LIKE '%550912444%'
   OR normalize_phone(phone) = normalize_phone('0550912444');

-- ============================================================================
-- 4. فحص جميع الأرقام المقبولة للمقابلة
-- ============================================================================

SELECT 
    '=== جميع الأرقام المقبولة ===' as section,
    id,
    full_name,
    phone,
    normalize_phone(phone) as normalized_phone,
    email,
    preferred_committee,
    status
FROM membership_applications
WHERE status = 'approved_for_interview'
ORDER BY created_at DESC
LIMIT 20;

-- ============================================================================
-- 5. اختبار دالة normalize_phone
-- ============================================================================

SELECT 
    '=== اختبار normalize_phone ===' as section,
    '0550912444' as input,
    normalize_phone('0550912444') as normalized;

SELECT 
    '=== اختبار normalize_phone ===' as section,
    '0570787919' as input,
    normalize_phone('0570787919') as normalized;

-- ============================================================================
-- 6. اختبار validate_phone_for_booking مباشرة
-- ============================================================================

SELECT 
    '=== اختبار validate_phone_for_booking مع 0550912444 ===' as section,
    *
FROM validate_phone_for_booking(
    '0550912444',
    '00000000-0000-0000-0000-000000000000'::UUID
);

SELECT 
    '=== اختبار validate_phone_for_booking مع 0570787919 ===' as section,
    *
FROM validate_phone_for_booking(
    '0570787919',
    '00000000-0000-0000-0000-000000000000'::UUID
);

-- ============================================================================
-- 7. فحص RLS Policies على جدول membership_applications
-- ============================================================================

SELECT 
    '=== RLS Policies ===' as section,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'membership_applications';

-- ============================================================================
-- 8. فحص الصلاحيات على الدالة
-- ============================================================================

SELECT 
    '=== صلاحيات الدالة ===' as section,
    routine_name,
    routine_schema,
    security_type,
    is_deterministic
FROM information_schema.routines
WHERE routine_name = 'validate_phone_for_booking';

-- ============================================================================
-- 9. عرض كود الدالة الفعلي
-- ============================================================================

SELECT 
    '=== كود الدالة validate_phone_for_booking ===' as section,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'validate_phone_for_booking';

-- ============================================================================
-- 10. فحص الـ session_id المستخدم
-- ============================================================================

SELECT 
    '=== فحص session_id ===' as section,
    id,
    session_name,
    public_link_token,
    is_active,
    session_date
FROM interview_sessions
WHERE public_link_token = '7439eba4c930';
