-- =====================================================
-- تعيين أول Super Admin (رئيس النادي)
-- =====================================================
-- هذا السكريبت يمنح صلاحيات Super Admin لأول عضو
-- =====================================================

-- الطريقة 1: تعيين Super Admin بناءً على البريد الإلكتروني
-- استبدل 'your-email@example.com' ببريدك الإلكتروني

DO $$
DECLARE
    v_member_id UUID;
    v_user_id UUID;
    v_email TEXT;
BEGIN
    -- البحث عن العضو بالبريد الإلكتروني
    SELECT id, user_id, email INTO v_member_id, v_user_id, v_email
    FROM public.members
    WHERE email = 'your-email@example.com'  -- ← غيّر هذا ببريدك
    LIMIT 1;
    
    IF v_member_id IS NULL THEN
        RAISE EXCEPTION 'لم يتم العثور على عضو بهذا البريد الإلكتروني';
    END IF;
    
    -- التحقق من وجود user_id
    IF v_user_id IS NULL THEN
        -- البحث عن user_id من جدول auth.users
        SELECT id INTO v_user_id
        FROM auth.users
        WHERE email = v_email
        LIMIT 1;
        
        -- إذا لم يوجد، استخدم member_id كبديل مؤقت
        IF v_user_id IS NULL THEN
            RAISE NOTICE 'تحذير: العضو % لم يسجل دخول بعد. سيتم استخدام member_id كـ user_id مؤقتاً.', v_email;
            v_user_id := v_member_id;
            
            -- تحديث جدول members بـ user_id
            UPDATE public.members
            SET user_id = v_user_id
            WHERE id = v_member_id;
        ELSE
            -- تحديث جدول members بـ user_id الصحيح
            UPDATE public.members
            SET user_id = v_user_id
            WHERE id = v_member_id;
            
            RAISE NOTICE 'تم ربط العضو % بحساب المصادقة', v_email;
        END IF;
    END IF;
    
    -- إضافة أو تحديث صلاحيات Super Admin
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
        role = 'super_admin',
        is_active = true,
        permissions = EXCLUDED.permissions,
        updated_at = NOW();
    
    RAISE NOTICE '✅ تم تعيين % (%) كـ Super Admin بنجاح!', v_email, v_member_id;
END $$;

-- =====================================================
-- الطريقة 2: تعيين أول عضو في الجدول كـ Super Admin
-- (استخدم هذه إذا كنت لا تعرف البريد الإلكتروني)
-- =====================================================

-- قم بإلغاء التعليق عن الكود التالي لاستخدام هذه الطريقة:

/*
DO $$
DECLARE
    v_member_id UUID;
    v_user_id UUID;
    v_email TEXT;
BEGIN
    -- اختيار أول عضو في الجدول
    SELECT id, user_id, email INTO v_member_id, v_user_id, v_email
    FROM public.members
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF v_member_id IS NULL THEN
        RAISE EXCEPTION 'لا يوجد أعضاء في الجدول';
    END IF;
    
    -- إضافة صلاحيات Super Admin
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
        role = 'super_admin',
        is_active = true,
        permissions = EXCLUDED.permissions,
        updated_at = NOW();
    
    RAISE NOTICE 'تم تعيين العضو % (%) كـ Super Admin بنجاح!', v_email, v_member_id;
END $$;
*/

-- =====================================================
-- الطريقة 3: عرض جميع الأعضاء لاختيار واحد منهم
-- =====================================================

-- قم بتشغيل هذا الاستعلام لعرض جميع الأعضاء:

SELECT 
    id,
    full_name,
    email,
    phone,
    created_at,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.member_id = members.id 
            AND admin_users.is_active = true
        ) THEN '✅ إداري'
        ELSE '❌ ليس إداري'
    END as admin_status
FROM public.members
ORDER BY created_at ASC;

-- بعد معرفة البريد الإلكتروني، استخدم الطريقة 1 أعلاه

-- =====================================================
-- الطريقة 4: حل سريع - تعيين Super Admin مباشرة بدون التحقق من user_id
-- =====================================================
-- استخدم هذه الطريقة إذا كانت الطرق السابقة لا تعمل

/*
-- الخطوة 1: ابحث عن member_id
SELECT id, email, user_id FROM public.members WHERE email = 'your-email@example.com';

-- الخطوة 2: استبدل MEMBER_ID_HERE بالـ ID من الخطوة 1
INSERT INTO public.admin_users (
    member_id,
    user_id,
    role,
    is_active
) VALUES (
    'MEMBER_ID_HERE'::UUID,  -- ← ضع member_id هنا
    'MEMBER_ID_HERE'::UUID,  -- ← نفس member_id (مؤقتاً)
    'super_admin',
    true
)
ON CONFLICT (member_id) 
DO UPDATE SET
    role = 'super_admin',
    is_active = true,
    updated_at = NOW();
*/

-- =====================================================
-- التحقق من نجاح العملية
-- =====================================================

-- تشغيل هذا الاستعلام للتحقق:
SELECT 
    au.id,
    au.role,
    au.is_active,
    m.full_name,
    m.email,
    m.user_id as member_user_id,
    au.user_id as admin_user_id,
    au.created_at
FROM public.admin_users au
JOIN public.members m ON m.id = au.member_id
WHERE au.role = 'super_admin'
AND au.is_active = true;
