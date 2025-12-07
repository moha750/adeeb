-- =====================================================
-- حل سريع: إصلاح Triggers + تعيين Super Admin
-- =====================================================
-- قم بتشغيل هذا الملف كاملاً في Supabase SQL Editor
-- =====================================================

-- الخطوة 1: حذف جميع الـ Triggers والدوال القديمة
DROP TRIGGER IF EXISTS sync_member_admin_data_trigger ON public.members CASCADE;
DROP TRIGGER IF EXISTS sync_admin_data ON public.members CASCADE;
DROP TRIGGER IF EXISTS update_member_admin ON public.members CASCADE;
DROP FUNCTION IF EXISTS sync_member_admin_data() CASCADE;
DROP FUNCTION IF EXISTS sync_admin_data() CASCADE;
DROP FUNCTION IF EXISTS update_member_admin() CASCADE;

RAISE NOTICE '✅ تم حذف الـ Triggers القديمة';

-- الخطوة 2: تعيين Super Admin بدون تحديث user_id (لتجنب تفعيل Trigger)
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
    
    -- استخدام member_id كـ user_id إذا كان NULL
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'تحذير: user_id = NULL، سيتم استخدام member_id';
        v_user_id := v_member_id;
    END IF;
    
    -- إضافة Super Admin مباشرة
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
    
    -- الآن تحديث user_id في members (بعد حذف الـ Trigger)
    IF (SELECT user_id FROM public.members WHERE id = v_member_id) IS NULL THEN
        UPDATE public.members
        SET user_id = v_user_id
        WHERE id = v_member_id;
        
        RAISE NOTICE '✅ تم تحديث user_id في جدول members';
    END IF;
END $$;

-- الخطوة 3: إنشاء Trigger جديد محدث (اختياري)
CREATE OR REPLACE FUNCTION sync_member_to_admin_users()
RETURNS TRIGGER AS $$
BEGIN
    -- تحديث admin_users عند تغيير user_id في members
    IF NEW.user_id IS NOT NULL AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
        UPDATE public.admin_users
        SET user_id = NEW.user_id,
            updated_at = NOW()
        WHERE member_id = NEW.id
        AND user_id != NEW.user_id;  -- فقط إذا كان مختلف
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_member_to_admin_users_trigger ON public.members;

CREATE TRIGGER sync_member_to_admin_users_trigger
    AFTER UPDATE OF user_id ON public.members
    FOR EACH ROW
    WHEN (NEW.user_id IS DISTINCT FROM OLD.user_id)
    EXECUTE FUNCTION sync_member_to_admin_users();

RAISE NOTICE '✅ تم إنشاء Trigger جديد';

-- الخطوة 4: التحقق من النتيجة
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.admin_users
    WHERE role = 'super_admin' AND is_active = true;
    
    IF v_count > 0 THEN
        RAISE NOTICE '✅ النجاح! يوجد % مستخدم Super Admin', v_count;
    ELSE
        RAISE WARNING '⚠️ لم يتم العثور على Super Admin!';
    END IF;
END $$;

-- عرض النتيجة النهائية
SELECT 
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
