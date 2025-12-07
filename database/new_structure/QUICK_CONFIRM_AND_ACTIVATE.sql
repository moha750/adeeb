-- =====================================================
-- حل سريع: تأكيد البريد + تفعيل Super Admin
-- =====================================================
-- قم بتشغيل هذا الكود مباشرة (غيّر البريد الإلكتروني فقط)
-- =====================================================

DO $$
DECLARE
    v_email TEXT := 'your-email@example.com';  -- ← غيّر هذا ببريدك
    v_user_id UUID;
    v_member_id UUID;
BEGIN
    RAISE NOTICE '🔄 بدء عملية التفعيل...';
    
    -- 1. تأكيد البريد في auth.users
    UPDATE auth.users
    SET email_confirmed_at = NOW()
    WHERE email = v_email
    AND email_confirmed_at IS NULL
    RETURNING id INTO v_user_id;
    
    IF v_user_id IS NOT NULL THEN
        RAISE NOTICE '✅ تم تأكيد البريد الإلكتروني';
    ELSE
        -- البحث عن user_id إذا كان مؤكد مسبقاً
        SELECT id INTO v_user_id
        FROM auth.users
        WHERE email = v_email;
        
        IF v_user_id IS NULL THEN
            RAISE EXCEPTION '❌ لم يتم العثور على حساب بهذا البريد في auth.users';
        END IF;
        
        RAISE NOTICE 'ℹ️ البريد مؤكد مسبقاً';
    END IF;
    
    -- 2. تحديث user_id في members
    UPDATE public.members
    SET user_id = v_user_id
    WHERE email = v_email
    AND (user_id IS NULL OR user_id != v_user_id)
    RETURNING id INTO v_member_id;
    
    IF v_member_id IS NOT NULL THEN
        RAISE NOTICE '✅ تم ربط الحساب بجدول members';
    ELSE
        -- البحث عن member_id
        SELECT id INTO v_member_id
        FROM public.members
        WHERE email = v_email;
        
        IF v_member_id IS NULL THEN
            RAISE EXCEPTION '❌ لم يتم العثور على عضو بهذا البريد في members';
        END IF;
        
        RAISE NOTICE 'ℹ️ الحساب مربوط مسبقاً';
    END IF;
    
    -- 3. تفعيل حساب admin_users
    UPDATE public.admin_users
    SET 
        is_active = true,
        user_id = v_user_id,
        role = 'super_admin',
        permissions = '{
            "dashboard": true,
            "members": {"read": true, "create": true, "update": true, "delete": true},
            "admin_users": {"read": true, "create": true, "update": true, "delete": true},
            "board": {"read": true, "create": true, "update": true, "delete": true},
            "works": {"read": true, "create": true, "update": true, "delete": true},
            "sponsors": {"read": true, "create": true, "update": true, "delete": true},
            "achievements": {"read": true, "create": true, "update": true, "delete": true},
            "news": {"read": true, "create": true, "update": true, "delete": true},
            "events": {"read": true, "create": true, "update": true, "delete": true},
            "forms": {"read": true, "create": true, "update": true, "delete": true},
            "faq": {"read": true, "create": true, "update": true, "delete": true},
            "testimonials": {"read": true, "create": true, "update": true, "delete": true},
            "settings": true,
            "statistics": true
        }'::jsonb
    WHERE member_id = v_member_id;
    
    IF FOUND THEN
        RAISE NOTICE '✅ تم تفعيل حساب Super Admin';
    ELSE
        RAISE WARNING '⚠️ لم يتم العثور على حساب في admin_users';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 اكتمل! يمكنك الآن تسجيل الدخول بـ: %', v_email;
    RAISE NOTICE '';
END $$;

-- =====================================================
-- التحقق النهائي
-- =====================================================

SELECT 
    '1. حالة المصادقة (auth.users)' as step,
    au.email,
    CASE 
        WHEN au.email_confirmed_at IS NOT NULL THEN '✅ مؤكد'
        ELSE '❌ غير مؤكد'
    END as status,
    au.email_confirmed_at as confirmed_at
FROM auth.users au
WHERE au.email = 'your-email@example.com'  -- ← غيّر هذا

UNION ALL

SELECT 
    '2. حالة العضوية (members)' as step,
    m.email,
    CASE 
        WHEN m.user_id IS NOT NULL THEN '✅ مربوط'
        ELSE '❌ غير مربوط'
    END as status,
    NULL as confirmed_at
FROM public.members m
WHERE m.email = 'your-email@example.com'  -- ← غيّر هذا

UNION ALL

SELECT 
    '3. حالة الصلاحيات (admin_users)' as step,
    m.email,
    CASE 
        WHEN ad.is_active THEN '✅ نشط - ' || ad.role
        ELSE '❌ معطل'
    END as status,
    ad.created_at as confirmed_at
FROM public.admin_users ad
JOIN public.members m ON m.id = ad.member_id
WHERE m.email = 'your-email@example.com'  -- ← غيّر هذا
ORDER BY step;
