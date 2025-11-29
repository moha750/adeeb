-- =====================================================
-- جدول المستخدمين الإداريين (Admin Users)
-- =====================================================
-- هذا الجدول يدير صلاحيات الوصول للوحة التحكم فقط
-- كل مستخدم إداري يجب أن يكون عضواً في جدول members
-- =====================================================

CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- الربط بالعضو وحساب Auth
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    -- معلومات الصلاحيات
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'moderator')),
    permissions JSONB DEFAULT '{}'::jsonb,
    
    -- حالة الحساب الإداري
    is_active BOOLEAN DEFAULT true,
    
    -- التواريخ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    
    -- ملاحظات
    notes TEXT
);

-- =====================================================
-- الفهارس (Indexes)
-- =====================================================

CREATE INDEX idx_admin_users_member ON public.admin_users(member_id);
CREATE INDEX idx_admin_users_user ON public.admin_users(user_id);
CREATE INDEX idx_admin_users_role ON public.admin_users(role);
CREATE INDEX idx_admin_users_active ON public.admin_users(is_active) WHERE is_active = true;

-- =====================================================
-- Trigger لتحديث updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_admin_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_admin_users_updated_at ON public.admin_users;

CREATE TRIGGER trigger_update_admin_users_updated_at
    BEFORE UPDATE ON public.admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_admin_users_updated_at();

-- =====================================================
-- دالة لتعيين الصلاحيات الافتراضية حسب الدور
-- =====================================================

CREATE OR REPLACE FUNCTION set_default_admin_permissions()
RETURNS TRIGGER AS $$
BEGIN
    -- إذا لم تكن هناك صلاحيات محددة، نعين صلاحيات افتراضية
    IF NEW.permissions = '{}'::jsonb OR NEW.permissions IS NULL THEN
        CASE NEW.role
            -- Super Admin: كل الصلاحيات
            WHEN 'super_admin' THEN
                NEW.permissions := '{
                    "dashboard": true,
                    "members": {"read": true, "create": true, "update": true, "delete": true},
                    "admin_users": {"read": true, "create": true, "update": true, "delete": true},
                    "board": {"read": true, "create": true, "update": true, "delete": true},
                    "news": {"read": true, "create": true, "update": true, "delete": true},
                    "events": {"read": true, "create": true, "update": true, "delete": true},
                    "forms": {"read": true, "create": true, "update": true, "delete": true},
                    "settings": true,
                    "statistics": true
                }'::jsonb;
            
            -- Admin: معظم الصلاحيات
            WHEN 'admin' THEN
                NEW.permissions := '{
                    "dashboard": true,
                    "members": {"read": true, "create": true, "update": true, "delete": false},
                    "admin_users": {"read": true, "create": false, "update": false, "delete": false},
                    "board": {"read": true, "create": true, "update": true, "delete": false},
                    "news": {"read": true, "create": true, "update": true, "delete": false},
                    "events": {"read": true, "create": true, "update": true, "delete": false},
                    "forms": {"read": true, "create": true, "update": true, "delete": false},
                    "settings": false,
                    "statistics": true
                }'::jsonb;
            
            -- Moderator: صلاحيات محدودة
            WHEN 'moderator' THEN
                NEW.permissions := '{
                    "dashboard": true,
                    "members": {"read": true, "create": false, "update": false, "delete": false},
                    "admin_users": {"read": false, "create": false, "update": false, "delete": false},
                    "board": {"read": true, "create": false, "update": false, "delete": false},
                    "news": {"read": true, "create": true, "update": true, "delete": false},
                    "events": {"read": true, "create": true, "update": true, "delete": false},
                    "forms": {"read": true, "create": false, "update": false, "delete": false},
                    "settings": false,
                    "statistics": false
                }'::jsonb;
            
            ELSE
                NEW.permissions := '{}'::jsonb;
        END CASE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_default_admin_permissions ON public.admin_users;

CREATE TRIGGER trigger_set_default_admin_permissions
    BEFORE INSERT OR UPDATE OF role ON public.admin_users
    FOR EACH ROW
    EXECUTE FUNCTION set_default_admin_permissions();

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- السماح للمستخدمين الإداريين بقراءة بياناتهم
DROP POLICY IF EXISTS "Admin users can read own data" ON public.admin_users;
CREATE POLICY "Admin users can read own data"
ON public.admin_users FOR SELECT
USING (auth.uid() = user_id);

-- السماح للـ Super Admins بقراءة كل البيانات
DROP POLICY IF EXISTS "Super admins can read all" ON public.admin_users;
CREATE POLICY "Super admins can read all"
ON public.admin_users FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE admin_users.user_id = auth.uid()
        AND admin_users.role = 'super_admin'
        AND admin_users.is_active = true
    )
);

-- السماح للـ Super Admins بإدارة المستخدمين الإداريين
DROP POLICY IF EXISTS "Super admins can manage admin users" ON public.admin_users;
CREATE POLICY "Super admins can manage admin users"
ON public.admin_users FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE admin_users.user_id = auth.uid()
        AND admin_users.role = 'super_admin'
        AND admin_users.is_active = true
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE admin_users.user_id = auth.uid()
        AND admin_users.role = 'super_admin'
        AND admin_users.is_active = true
    )
);

-- =====================================================
-- دالة مساعدة للتحقق من الصلاحيات
-- =====================================================

CREATE OR REPLACE FUNCTION check_admin_permission(
    p_user_id UUID,
    p_resource TEXT,
    p_action TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_permissions JSONB;
    v_is_active BOOLEAN;
BEGIN
    -- الحصول على صلاحيات المستخدم
    SELECT permissions, is_active INTO v_permissions, v_is_active
    FROM public.admin_users
    WHERE user_id = p_user_id;
    
    -- إذا لم يكن المستخدم إدارياً أو غير نشط
    IF v_permissions IS NULL OR NOT v_is_active THEN
        RETURN false;
    END IF;
    
    -- التحقق من الصلاحية
    IF v_permissions ? p_resource THEN
        IF jsonb_typeof(v_permissions->p_resource) = 'boolean' THEN
            RETURN (v_permissions->p_resource)::boolean;
        ELSIF jsonb_typeof(v_permissions->p_resource) = 'object' THEN
            RETURN COALESCE((v_permissions->p_resource->>p_action)::boolean, false);
        END IF;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- التعليقات التوضيحية
-- =====================================================

COMMENT ON TABLE public.admin_users IS 'جدول المستخدمين الإداريين - يدير صلاحيات الوصول للوحة التحكم';
COMMENT ON COLUMN public.admin_users.member_id IS 'معرف العضو في جدول members';
COMMENT ON COLUMN public.admin_users.user_id IS 'معرف المستخدم في Supabase Auth';
COMMENT ON COLUMN public.admin_users.role IS 'الدور الإداري: super_admin, admin, moderator';
COMMENT ON COLUMN public.admin_users.permissions IS 'صلاحيات المستخدم بصيغة JSON';
COMMENT ON COLUMN public.admin_users.is_active IS 'حالة الحساب الإداري';
