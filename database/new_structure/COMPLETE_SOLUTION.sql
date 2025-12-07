-- =====================================================
-- 🔧 الحل الكامل: حذف Triggers + تفعيل Super Admin
-- =====================================================
-- شغّل هذا الملف كاملاً مرة واحدة
-- =====================================================

-- ═══════════════════════════════════════════════════
-- الجزء 1: حذف جميع الـ Triggers القديمة
-- ═══════════════════════════════════════════════════

RAISE NOTICE '';
RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
RAISE NOTICE '🗑️  الخطوة 1: حذف الـ Triggers القديمة...';
RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
RAISE NOTICE '';

-- حذف جميع الـ Triggers
DROP TRIGGER IF EXISTS sync_member_admin_data_trigger ON public.members CASCADE;
DROP TRIGGER IF EXISTS sync_admin_data ON public.members CASCADE;
DROP TRIGGER IF EXISTS update_member_admin ON public.members CASCADE;
DROP TRIGGER IF EXISTS prevent_sensitive_fields_update ON public.members CASCADE;
DROP TRIGGER IF EXISTS prevent_sensitive_fields_update_trigger ON public.members CASCADE;
DROP TRIGGER IF EXISTS check_admin_permission ON public.members CASCADE;
DROP TRIGGER IF EXISTS validate_admin ON public.members CASCADE;
DROP TRIGGER IF EXISTS sync_admins ON public.members CASCADE;

-- حذف جميع الدوال القديمة
DROP FUNCTION IF EXISTS sync_member_admin_data() CASCADE;
DROP FUNCTION IF EXISTS sync_admin_data() CASCADE;
DROP FUNCTION IF EXISTS update_member_admin() CASCADE;
DROP FUNCTION IF EXISTS prevent_sensitive_fields_update() CASCADE;
DROP FUNCTION IF EXISTS check_is_admin() CASCADE;
DROP FUNCTION IF EXISTS check_admin_exists() CASCADE;
DROP FUNCTION IF EXISTS validate_admin_user() CASCADE;
DROP FUNCTION IF EXISTS sync_admin_member() CASCADE;

RAISE NOTICE '✅ تم حذف جميع الـ Triggers والدوال القديمة';
RAISE NOTICE '';

-- ═══════════════════════════════════════════════════
-- الجزء 2: تفعيل حساب Super Admin
-- ═══════════════════════════════════════════════════

DO $$
DECLARE
    v_email TEXT := 'your-email@example.com';  -- ← 🔴 غيّر هذا ببريدك الإلكتروني
    v_user_id UUID;
    v_member_id UUID;
BEGIN
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '🔄 الخطوة 2: تفعيل حساب Super Admin...';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';
    
    -- ───────────────────────────────────────────────
    -- 2.1: تأكيد البريد الإلكتروني
    -- ───────────────────────────────────────────────
    
    RAISE NOTICE '📧 2.1: تأكيد البريد الإلكتروني...';
    
    UPDATE auth.users
    SET email_confirmed_at = NOW()
    WHERE email = v_email
    AND email_confirmed_at IS NULL
    RETURNING id INTO v_user_id;
    
    IF v_user_id IS NOT NULL THEN
        RAISE NOTICE '   ✅ تم تأكيد البريد الإلكتروني';
    ELSE
        SELECT id INTO v_user_id
        FROM auth.users
        WHERE email = v_email;
        
        IF v_user_id IS NULL THEN
            RAISE EXCEPTION '   ❌ لم يتم العثور على حساب بهذا البريد في auth.users';
        END IF;
        
        RAISE NOTICE '   ℹ️  البريد مؤكد مسبقاً';
    END IF;
    
    RAISE NOTICE '';
    
    -- ───────────────────────────────────────────────
    -- 2.2: ربط الحساب بجدول members
    -- ───────────────────────────────────────────────
    
    RAISE NOTICE '👤 2.2: ربط الحساب بجدول الأعضاء...';
    
    -- الآن يمكن التحديث بدون مشاكل (تم حذف الـ Triggers)
    UPDATE public.members
    SET user_id = v_user_id
    WHERE email = v_email
    AND (user_id IS NULL OR user_id != v_user_id)
    RETURNING id INTO v_member_id;
    
    IF v_member_id IS NOT NULL THEN
        RAISE NOTICE '   ✅ تم ربط الحساب بجدول members';
    ELSE
        SELECT id INTO v_member_id
        FROM public.members
        WHERE email = v_email;
        
        IF v_member_id IS NULL THEN
            RAISE EXCEPTION '   ❌ لم يتم العثور على عضو بهذا البريد في members';
        END IF;
        
        RAISE NOTICE '   ℹ️  الحساب مربوط مسبقاً';
    END IF;
    
    RAISE NOTICE '';
    
    -- ───────────────────────────────────────────────
    -- 2.3: تفعيل صلاحيات Super Admin
    -- ───────────────────────────────────────────────
    
    RAISE NOTICE '🔑 2.3: تفعيل صلاحيات Super Admin...';
    
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
    )
    ON CONFLICT (member_id) 
    DO UPDATE SET
        is_active = true,
        user_id = EXCLUDED.user_id,
        role = 'super_admin',
        permissions = EXCLUDED.permissions,
        updated_at = NOW();
    
    RAISE NOTICE '   ✅ تم تفعيل حساب Super Admin';
    RAISE NOTICE '';
    
    -- ───────────────────────────────────────────────
    -- النتيجة النهائية
    -- ───────────────────────────────────────────────
    
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '🎉 اكتمل بنجاح!';
    RAISE NOTICE '';
    RAISE NOTICE '📧 البريد: %', v_email;
    RAISE NOTICE '🆔 User ID: %', v_user_id;
    RAISE NOTICE '👤 Member ID: %', v_member_id;
    RAISE NOTICE '🔑 الدور: Super Admin';
    RAISE NOTICE '✅ الحالة: نشط';
    RAISE NOTICE '';
    RAISE NOTICE '👉 يمكنك الآن تسجيل الدخول!';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';
END $$;

-- ═══════════════════════════════════════════════════
-- الجزء 3: التحقق النهائي
-- ═══════════════════════════════════════════════════

RAISE NOTICE '';
RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
RAISE NOTICE '📊 التحقق النهائي من جميع الخطوات';
RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
RAISE NOTICE '';

SELECT 
    CASE 
        WHEN step = 1 THEN '📧 1. حالة المصادقة (auth.users)'
        WHEN step = 2 THEN '👤 2. حالة العضوية (members)'
        WHEN step = 3 THEN '🔑 3. حالة الصلاحيات (admin_users)'
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
            WHEN ad.is_active THEN '✅ نشط - ' || ad.role
            ELSE '❌ معطل'
        END as status,
        to_char(ad.updated_at, 'YYYY-MM-DD HH24:MI:SS') as details
    FROM public.admin_users ad
    JOIN public.members m ON m.id = ad.member_id
    WHERE m.email = 'your-email@example.com'  -- ← غيّر هذا
) as results
ORDER BY step;

-- ═══════════════════════════════════════════════════
-- التحقق من عدم وجود Triggers متبقية
-- ═══════════════════════════════════════════════════

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM information_schema.triggers
    WHERE event_object_table = 'members'
    AND trigger_schema = 'public';
    
    RAISE NOTICE '';
    IF v_count = 0 THEN
        RAISE NOTICE '✅ لا توجد triggers متبقية على جدول members';
    ELSE
        RAISE WARNING '⚠️ يوجد % triggers متبقية على جدول members', v_count;
    END IF;
    RAISE NOTICE '';
END $$;
