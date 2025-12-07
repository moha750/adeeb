-- =====================================================
-- 🔧 حل شامل: تحديث Triggers + تفعيل Super Admin
-- =====================================================
-- هذا الملف يحذف الـ Triggers القديمة ويعيد إنشاءها محدثة
-- ثم يفعّل حساب Super Admin
-- =====================================================

-- ═══════════════════════════════════════════════════
-- الجزء 1: حذف الـ Triggers القديمة
-- ═══════════════════════════════════════════════════

RAISE NOTICE '🗑️  حذف الـ Triggers القديمة...';

DROP TRIGGER IF EXISTS sync_member_admin_data_trigger ON public.members CASCADE;
DROP TRIGGER IF EXISTS sync_admin_data ON public.members CASCADE;
DROP TRIGGER IF EXISTS update_member_admin ON public.members CASCADE;
DROP TRIGGER IF EXISTS prevent_sensitive_fields_update ON public.members CASCADE;
DROP TRIGGER IF EXISTS prevent_sensitive_fields_update_trigger ON public.members CASCADE;

DROP FUNCTION IF EXISTS sync_member_admin_data() CASCADE;
DROP FUNCTION IF EXISTS sync_admin_data() CASCADE;
DROP FUNCTION IF EXISTS update_member_admin() CASCADE;
DROP FUNCTION IF EXISTS prevent_sensitive_fields_update() CASCADE;

RAISE NOTICE '✅ تم حذف الـ Triggers القديمة';
RAISE NOTICE '';

-- ═══════════════════════════════════════════════════
-- الجزء 2: إعادة إنشاء الـ Triggers المحدثة
-- ═══════════════════════════════════════════════════

RAISE NOTICE '🔧 إعادة إنشاء الـ Triggers المحدثة...';
RAISE NOTICE '';

-- ───────────────────────────────────────────────────
-- 2.1: دالة مزامنة user_id
-- ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sync_member_admin_data()
RETURNS TRIGGER AS $$
BEGIN
    -- تحديث admin_users عند تحديث user_id في members
    IF NEW.user_id IS NOT NULL AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
        UPDATE public.admin_users
        SET user_id = NEW.user_id,
            updated_at = NOW()
        WHERE member_id = NEW.id
        AND user_id != NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_member_admin_data_trigger
    AFTER UPDATE OF user_id ON public.members
    FOR EACH ROW
    WHEN (NEW.user_id IS DISTINCT FROM OLD.user_id)
    EXECUTE FUNCTION sync_member_admin_data();

RAISE NOTICE '   ✅ sync_member_admin_data_trigger';

-- ───────────────────────────────────────────────────
-- 2.2: دالة منع تحديث الحقول الحساسة (محدثة)
-- ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION prevent_sensitive_fields_update()
RETURNS TRIGGER AS $$
DECLARE
    is_admin BOOLEAN;
BEGIN
    -- التحقق من أن المستخدم الحالي هو super_admin
    SELECT EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE admin_users.user_id = auth.uid()
        AND admin_users.role = 'super_admin'
        AND admin_users.is_active = true
    ) INTO is_admin;
    
    -- إذا لم يكن super_admin، منع تحديث الحقول الحساسة
    IF NOT is_admin THEN
        IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
            RAISE EXCEPTION 'غير مصرح لك بتحديث user_id';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER prevent_sensitive_fields_update_trigger
    BEFORE UPDATE ON public.members
    FOR EACH ROW
    EXECUTE FUNCTION prevent_sensitive_fields_update();

RAISE NOTICE '   ✅ prevent_sensitive_fields_update_trigger';

-- ───────────────────────────────────────────────────
-- 2.3: دالة مزامنة بيانات الأعضاء
-- ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sync_admin_data()
RETURNS TRIGGER AS $$
BEGIN
    -- تحديث updated_at في admin_users
    IF EXISTS (SELECT 1 FROM public.admin_users WHERE member_id = NEW.id) THEN
        UPDATE public.admin_users
        SET updated_at = NOW()
        WHERE member_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_admin_data
    AFTER UPDATE ON public.members
    FOR EACH ROW
    EXECUTE FUNCTION sync_admin_data();

RAISE NOTICE '   ✅ sync_admin_data';
RAISE NOTICE '';
RAISE NOTICE '✅ تم إعادة إنشاء جميع الـ Triggers بنجاح!';
RAISE NOTICE '';

-- ═══════════════════════════════════════════════════
-- الجزء 3: تفعيل حساب Super Admin
-- ═══════════════════════════════════════════════════

DO $$
DECLARE
    v_email TEXT := 'your-email@example.com';  -- ← 🔴 غيّر هذا ببريدك
    v_user_id UUID;
    v_member_id UUID;
BEGIN
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '🔄 تفعيل حساب Super Admin...';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';
    
    -- 3.1: تأكيد البريد
    RAISE NOTICE '📧 تأكيد البريد الإلكتروني...';
    
    UPDATE auth.users
    SET email_confirmed_at = NOW()
    WHERE email = v_email
    AND email_confirmed_at IS NULL
    RETURNING id INTO v_user_id;
    
    IF v_user_id IS NOT NULL THEN
        RAISE NOTICE '   ✅ تم تأكيد البريد';
    ELSE
        SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
        IF v_user_id IS NULL THEN
            RAISE EXCEPTION '   ❌ لم يتم العثور على حساب بهذا البريد';
        END IF;
        RAISE NOTICE '   ℹ️  البريد مؤكد مسبقاً';
    END IF;
    
    RAISE NOTICE '';
    
    -- 3.2: ربط بـ members
    RAISE NOTICE '👤 ربط الحساب بجدول الأعضاء...';
    
    UPDATE public.members
    SET user_id = v_user_id
    WHERE email = v_email
    AND (user_id IS NULL OR user_id != v_user_id)
    RETURNING id INTO v_member_id;
    
    IF v_member_id IS NOT NULL THEN
        RAISE NOTICE '   ✅ تم ربط الحساب';
    ELSE
        SELECT id INTO v_member_id FROM public.members WHERE email = v_email;
        IF v_member_id IS NULL THEN
            RAISE EXCEPTION '   ❌ لم يتم العثور على عضو بهذا البريد';
        END IF;
        RAISE NOTICE '   ℹ️  الحساب مربوط مسبقاً';
    END IF;
    
    RAISE NOTICE '';
    
    -- 3.3: تفعيل Super Admin
    RAISE NOTICE '🔑 تفعيل صلاحيات Super Admin...';
    
    INSERT INTO public.admin_users (member_id, user_id, role, is_active)
    VALUES (v_member_id, v_user_id, 'super_admin', true)
    ON CONFLICT (member_id) 
    DO UPDATE SET 
        is_active = true, 
        role = 'super_admin', 
        user_id = EXCLUDED.user_id,
        updated_at = NOW();
    
    RAISE NOTICE '   ✅ تم تفعيل Super Admin';
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
END $$;

-- ═══════════════════════════════════════════════════
-- التحقق النهائي
-- ═══════════════════════════════════════════════════

RAISE NOTICE '';
RAISE NOTICE '📊 التحقق النهائي:';
RAISE NOTICE '';

SELECT 
    trigger_name as "Trigger المُنشأ",
    event_manipulation as "الحدث",
    action_timing as "التوقيت"
FROM information_schema.triggers
WHERE event_object_table = 'members'
AND trigger_schema = 'public'
ORDER BY trigger_name;
