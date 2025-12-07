-- =====================================================
-- 🚀 شغّل هذا الكود الآن لتفعيل حسابك
-- =====================================================
-- غيّر البريد الإلكتروني فقط ثم شغّل الكود كاملاً
-- =====================================================

DO $$
DECLARE
    v_email TEXT := 'your-email@example.com';  -- ← 🔴 غيّر هذا ببريدك الإلكتروني
    v_user_id UUID;
    v_member_id UUID;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '🔄 بدء عملية تفعيل الحساب...';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';
    
    -- ═══════════════════════════════════════════════════
    -- الخطوة 1: تأكيد البريد الإلكتروني في auth.users
    -- ═══════════════════════════════════════════════════
    
    RAISE NOTICE '📧 الخطوة 1/3: تأكيد البريد الإلكتروني...';
    
    UPDATE auth.users
    SET email_confirmed_at = NOW()
    WHERE email = v_email
    AND email_confirmed_at IS NULL
    RETURNING id INTO v_user_id;
    
    IF v_user_id IS NOT NULL THEN
        RAISE NOTICE '   ✅ تم تأكيد البريد الإلكتروني بنجاح';
    ELSE
        -- البحث عن user_id إذا كان مؤكد مسبقاً
        SELECT id INTO v_user_id
        FROM auth.users
        WHERE email = v_email;
        
        IF v_user_id IS NULL THEN
            RAISE EXCEPTION '   ❌ خطأ: لم يتم العثور على حساب بهذا البريد في auth.users';
        END IF;
        
        RAISE NOTICE '   ℹ️  البريد مؤكد مسبقاً';
    END IF;
    
    RAISE NOTICE '';
    
    -- ═══════════════════════════════════════════════════
    -- الخطوة 2: ربط الحساب بجدول members
    -- ═══════════════════════════════════════════════════
    
    RAISE NOTICE '👤 الخطوة 2/3: ربط الحساب بجدول الأعضاء...';
    
    UPDATE public.members
    SET user_id = v_user_id
    WHERE email = v_email
    AND (user_id IS NULL OR user_id != v_user_id)
    RETURNING id INTO v_member_id;
    
    IF v_member_id IS NOT NULL THEN
        RAISE NOTICE '   ✅ تم ربط الحساب بجدول members';
    ELSE
        -- البحث عن member_id
        SELECT id INTO v_member_id
        FROM public.members
        WHERE email = v_email;
        
        IF v_member_id IS NULL THEN
            RAISE EXCEPTION '   ❌ خطأ: لم يتم العثور على عضو بهذا البريد في members';
        END IF;
        
        RAISE NOTICE '   ℹ️  الحساب مربوط مسبقاً';
    END IF;
    
    RAISE NOTICE '';
    
    -- ═══════════════════════════════════════════════════
    -- الخطوة 3: تفعيل صلاحيات Super Admin
    -- ═══════════════════════════════════════════════════
    
    RAISE NOTICE '🔑 الخطوة 3/3: تفعيل صلاحيات Super Admin...';
    
    -- أولاً: التحقق من وجود السجل
    IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE member_id = v_member_id) THEN
        -- إنشاء سجل جديد
        INSERT INTO public.admin_users (
            member_id,
            user_id,
            role,
            is_active,
            permissions
        ) VALUES (
            v_member_id,
            v_user_id,
            'super_admin',
            true,
            '{
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
        );
        RAISE NOTICE '   ✅ تم إنشاء حساب Super Admin جديد';
    ELSE
        -- تحديث السجل الموجود
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
            }'::jsonb,
            updated_at = NOW()
        WHERE member_id = v_member_id;
        
        RAISE NOTICE '   ✅ تم تفعيل حساب Super Admin';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '🎉 اكتمل بنجاح!';
    RAISE NOTICE '';
    RAISE NOTICE '📧 البريد: %', v_email;
    RAISE NOTICE '🔑 الدور: Super Admin';
    RAISE NOTICE '✅ الحالة: نشط';
    RAISE NOTICE '';
    RAISE NOTICE '👉 يمكنك الآن تسجيل الدخول!';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';
END $$;

-- ═══════════════════════════════════════════════════
-- التحقق النهائي من جميع الخطوات
-- ═══════════════════════════════════════════════════

SELECT 
    'نتيجة التفعيل' as "━━━━━━━━━━━━━━━━━━━━━━",
    '' as " ";

SELECT 
    CASE 
        WHEN step = 1 THEN '📧 1. حالة المصادقة'
        WHEN step = 2 THEN '👤 2. حالة العضوية'
        WHEN step = 3 THEN '🔑 3. حالة الصلاحيات'
    END as "الخطوة",
    email as "البريد الإلكتروني",
    status as "الحالة",
    details as "التفاصيل"
FROM (
    SELECT 
        1 as step,
        au.email,
        CASE 
            WHEN au.email_confirmed_at IS NOT NULL THEN '✅ مؤكد'
            ELSE '❌ غير مؤكد'
        END as status,
        to_char(au.email_confirmed_at, 'YYYY-MM-DD HH24:MI:SS') as details
    FROM auth.users au
    WHERE au.email = 'your-email@example.com'  -- ← غيّر هذا
    
    UNION ALL
    
    SELECT 
        2 as step,
        m.email,
        CASE 
            WHEN m.user_id IS NOT NULL THEN '✅ مربوط'
            ELSE '❌ غير مربوط'
        END as status,
        COALESCE(m.user_id::TEXT, 'NULL') as details
    FROM public.members m
    WHERE m.email = 'your-email@example.com'  -- ← غيّر هذا
    
    UNION ALL
    
    SELECT 
        3 as step,
        m.email,
        CASE 
            WHEN ad.is_active THEN '✅ نشط'
            ELSE '❌ معطل'
        END as status,
        ad.role || ' - ' || to_char(ad.updated_at, 'YYYY-MM-DD HH24:MI:SS') as details
    FROM public.admin_users ad
    JOIN public.members m ON m.id = ad.member_id
    WHERE m.email = 'your-email@example.com'  -- ← غيّر هذا
) as results
ORDER BY step;
