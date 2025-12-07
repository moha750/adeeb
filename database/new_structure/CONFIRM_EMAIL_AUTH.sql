-- =====================================================
-- تأكيد البريد الإلكتروني في Supabase Auth
-- =====================================================
-- المشكلة: الحساب في auth.users لم يتم تأكيد بريده (email_confirmed_at = NULL)
-- الحل: تأكيد البريد يدوياً من قاعدة البيانات
-- =====================================================

-- ⚠️ ملاحظة مهمة:
-- هذا الكود يعمل فقط إذا كان لديك صلاحيات الوصول لجدول auth.users
-- في بعض إعدادات Supabase، قد تحتاج استخدام Dashboard بدلاً من SQL

-- =====================================================
-- الطريقة 1: تأكيد البريد بالـ SQL (موصى بها)
-- =====================================================

-- تأكيد البريد الإلكتروني لحساب معين
UPDATE auth.users
SET 
    email_confirmed_at = NOW()
WHERE email = 'your-email@example.com'  -- ← غيّر هذا ببريدك
AND email_confirmed_at IS NULL;

-- =====================================================
-- الطريقة 2: تأكيد جميع الحسابات غير المؤكدة (حذر!)
-- =====================================================

/*
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;
*/

-- =====================================================
-- الطريقة 3: تأكيد بالـ user_id
-- =====================================================

/*
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE id = 'USER_ID_HERE'::UUID
AND email_confirmed_at IS NULL;
*/

-- =====================================================
-- التحقق من نجاح التأكيد
-- =====================================================

SELECT 
    id,
    email,
    email_confirmed_at,
    confirmed_at,
    created_at,
    CASE 
        WHEN email_confirmed_at IS NOT NULL THEN '✅ مؤكد'
        ELSE '⏸️ غير مؤكد'
    END as status
FROM auth.users
WHERE email = 'your-email@example.com';  -- ← غيّر هذا

-- =====================================================
-- حل شامل: تأكيد البريد + تفعيل Admin
-- =====================================================

DO $$
DECLARE
    v_email TEXT := 'your-email@example.com';  -- ← غيّر هذا
    v_user_id UUID;
    v_member_id UUID;
BEGIN
    -- 1. تأكيد البريد في auth.users
    UPDATE auth.users
    SET email_confirmed_at = NOW()
    WHERE email = v_email
    AND email_confirmed_at IS NULL
    RETURNING id INTO v_user_id;
    
    IF v_user_id IS NOT NULL THEN
        RAISE NOTICE '✅ تم تأكيد البريد الإلكتروني في auth.users';
    ELSE
        -- البحث عن user_id إذا كان مؤكد مسبقاً
        SELECT id INTO v_user_id
        FROM auth.users
        WHERE email = v_email;
        
        RAISE NOTICE 'ℹ️ البريد مؤكد مسبقاً';
    END IF;
    
    -- 2. تحديث user_id في members
    UPDATE public.members
    SET user_id = v_user_id
    WHERE email = v_email
    AND (user_id IS NULL OR user_id != v_user_id)
    RETURNING id INTO v_member_id;
    
    IF v_member_id IS NOT NULL THEN
        RAISE NOTICE '✅ تم تحديث user_id في members';
    ELSE
        SELECT id INTO v_member_id
        FROM public.members
        WHERE email = v_email;
    END IF;
    
    -- 3. تفعيل حساب admin_users
    UPDATE public.admin_users
    SET 
        is_active = true,
        user_id = v_user_id,
        updated_at = NOW()
    WHERE member_id = v_member_id;
    
    RAISE NOTICE '✅ تم تفعيل حساب admin_users';
    
    RAISE NOTICE '🎉 اكتمل! يمكنك الآن تسجيل الدخول';
END $$;

-- =====================================================
-- التحقق النهائي الشامل
-- =====================================================

SELECT 
    'auth.users' as table_name,
    au.email,
    au.email_confirmed_at,
    CASE 
        WHEN au.email_confirmed_at IS NOT NULL THEN '✅ مؤكد'
        ELSE '❌ غير مؤكد'
    END as auth_status
FROM auth.users au
WHERE au.email = 'your-email@example.com'  -- ← غيّر هذا

UNION ALL

SELECT 
    'admin_users' as table_name,
    m.email,
    NULL as email_confirmed_at,
    CASE 
        WHEN ad.is_active THEN '✅ نشط'
        ELSE '❌ معطل'
    END as auth_status
FROM public.admin_users ad
JOIN public.members m ON m.id = ad.member_id
WHERE m.email = 'your-email@example.com';  -- ← غيّر هذا

-- =====================================================
-- إذا لم يعمل SQL، استخدم Supabase Dashboard
-- =====================================================

-- اذهب إلى:
-- 1. Supabase Dashboard
-- 2. Authentication → Users
-- 3. ابحث عن بريدك الإلكتروني
-- 4. اضغط على النقاط الثلاث (...)
-- 5. اختر "Confirm email"
-- 6. تم! ✅
