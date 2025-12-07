-- =====================================================
-- تفعيل حساب Super Admin
-- =====================================================
-- هذا السكريبت يفعّل الحساب في جدول admin_users
-- =====================================================

-- الطريقة 1: تفعيل بالبريد الإلكتروني
UPDATE public.admin_users
SET is_active = true,
    updated_at = NOW()
WHERE member_id IN (
    SELECT id FROM public.members 
    WHERE email = 'your-email@example.com'  -- ← غيّر هذا ببريدك
);

-- =====================================================
-- الطريقة 2: تفعيل جميع حسابات Super Admin
-- =====================================================

UPDATE public.admin_users
SET is_active = true,
    updated_at = NOW()
WHERE role = 'super_admin';

-- =====================================================
-- الطريقة 3: تفعيل حساب معين بـ member_id
-- =====================================================

-- استبدل MEMBER_ID_HERE بالـ ID الصحيح
/*
UPDATE public.admin_users
SET is_active = true,
    updated_at = NOW()
WHERE member_id = 'MEMBER_ID_HERE'::UUID;
*/

-- =====================================================
-- التحقق من التفعيل
-- =====================================================

SELECT 
    au.id,
    au.role,
    au.is_active,
    m.full_name,
    m.email,
    au.created_at,
    au.updated_at,
    CASE 
        WHEN au.is_active THEN '✅ نشط'
        ELSE '⏸️ معطل'
    END as status
FROM public.admin_users au
JOIN public.members m ON m.id = au.member_id
WHERE au.role = 'super_admin'
ORDER BY au.created_at DESC;

-- =====================================================
-- حل شامل: تفعيل + منح جميع الصلاحيات
-- =====================================================

DO $$
DECLARE
    v_member_id UUID;
    v_email TEXT;
BEGIN
    -- البحث عن العضو
    SELECT id, email INTO v_member_id, v_email
    FROM public.members
    WHERE email = 'your-email@example.com'  -- ← غيّر هذا
    LIMIT 1;
    
    IF v_member_id IS NULL THEN
        RAISE EXCEPTION 'لم يتم العثور على عضو بهذا البريد';
    END IF;
    
    -- تحديث الحساب: تفعيل + منح جميع الصلاحيات
    UPDATE public.admin_users
    SET 
        is_active = true,
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
    
    RAISE NOTICE '✅ تم تفعيل حساب % بنجاح!', v_email;
END $$;

-- =====================================================
-- التحقق النهائي
-- =====================================================

SELECT 
    m.email,
    au.role,
    au.is_active as active,
    au.permissions,
    au.updated_at
FROM public.admin_users au
JOIN public.members m ON m.id = au.member_id
WHERE au.role = 'super_admin'
AND au.is_active = true;
