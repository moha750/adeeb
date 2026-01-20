-- =====================================================
-- إصلاح سياسات RLS لتجنب infinite recursion
-- =====================================================

-- حذف السياسات القديمة من user_roles
DROP POLICY IF EXISTS "user_roles_select_own_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_admin_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete_policy" ON public.user_roles;

-- تعطيل RLS مؤقتاً
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- إنشاء دالة للتحقق من مستوى الصلاحية بدون recursion
CREATE OR REPLACE FUNCTION public.get_user_max_role_level(user_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT COALESCE(MAX(r.role_level), 0)
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid
    AND ur.is_active = true;
$$;

-- إعادة تفعيل RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- سياسات جديدة بدون infinite recursion
-- 1. يمكن للمستخدم قراءة أدواره الخاصة
CREATE POLICY "user_roles_select_own" ON public.user_roles
    FOR SELECT
    USING (user_id = auth.uid());

-- 2. يمكن للمستخدمين المصادق عليهم قراءة جميع الأدوار
-- (هذا آمن لأن البيانات الحساسة محمية في جداول أخرى)
CREATE POLICY "user_roles_select_all" ON public.user_roles
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- 3. يمكن للمستوى 9 وأعلى إضافة أدوار
CREATE POLICY "user_roles_insert" ON public.user_roles
    FOR INSERT
    WITH CHECK (
        public.get_user_max_role_level(auth.uid()) >= 9
    );

-- 4. يمكن للمستوى 9 وأعلى تحديث الأدوار
CREATE POLICY "user_roles_update" ON public.user_roles
    FOR UPDATE
    USING (
        public.get_user_max_role_level(auth.uid()) >= 9
    );

-- 5. يمكن لرئيس النادي فقط (المستوى 10) حذف الأدوار
CREATE POLICY "user_roles_delete" ON public.user_roles
    FOR DELETE
    USING (
        public.get_user_max_role_level(auth.uid()) = 10
    );

-- =====================================================
-- تحديث السياسات الأخرى لاستخدام الدالة الجديدة
-- =====================================================

-- حذف السياسات القديمة من profiles
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

-- سياسات profiles الجديدة
CREATE POLICY "profiles_select" ON public.profiles
    FOR SELECT
    USING (
        id = auth.uid() 
        OR public.get_user_max_role_level(auth.uid()) >= 5
    );

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE
    USING (id = auth.uid());

CREATE POLICY "profiles_update_admin" ON public.profiles
    FOR UPDATE
    USING (public.get_user_max_role_level(auth.uid()) >= 8);

CREATE POLICY "profiles_delete" ON public.profiles
    FOR DELETE
    USING (public.get_user_max_role_level(auth.uid()) = 10);

-- =====================================================
-- تحديث سياسات committees
-- =====================================================

DROP POLICY IF EXISTS "committees_select_policy" ON public.committees;
DROP POLICY IF EXISTS "committees_all_policy" ON public.committees;

CREATE POLICY "committees_select" ON public.committees
    FOR SELECT
    USING (is_active = true OR public.get_user_max_role_level(auth.uid()) >= 8);

CREATE POLICY "committees_modify" ON public.committees
    FOR ALL
    USING (public.get_user_max_role_level(auth.uid()) >= 8);

-- =====================================================
-- تحديث سياسات roles
-- =====================================================

DROP POLICY IF EXISTS "roles_select_policy" ON public.roles;
DROP POLICY IF EXISTS "roles_all_policy" ON public.roles;

CREATE POLICY "roles_select" ON public.roles
    FOR SELECT
    USING (true);

CREATE POLICY "roles_modify" ON public.roles
    FOR ALL
    USING (public.get_user_max_role_level(auth.uid()) = 10);

-- =====================================================
-- تحديث سياسات permissions
-- =====================================================

DROP POLICY IF EXISTS "permissions_select_policy" ON public.permissions;
DROP POLICY IF EXISTS "permissions_all_policy" ON public.permissions;

CREATE POLICY "permissions_select" ON public.permissions
    FOR SELECT
    USING (true);

CREATE POLICY "permissions_modify" ON public.permissions
    FOR ALL
    USING (public.get_user_max_role_level(auth.uid()) = 10);

-- =====================================================
-- تحديث سياسات role_permissions
-- =====================================================

DROP POLICY IF EXISTS "role_permissions_select_policy" ON public.role_permissions;
DROP POLICY IF EXISTS "role_permissions_all_policy" ON public.role_permissions;

CREATE POLICY "role_permissions_select" ON public.role_permissions
    FOR SELECT
    USING (true);

CREATE POLICY "role_permissions_modify" ON public.role_permissions
    FOR ALL
    USING (public.get_user_max_role_level(auth.uid()) = 10);

-- =====================================================
-- سياسات RLS لجدول announcements
-- =====================================================

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "announcements_select_policy" ON public.announcements;
DROP POLICY IF EXISTS "announcements_insert_policy" ON public.announcements;
DROP POLICY IF EXISTS "announcements_update_policy" ON public.announcements;
DROP POLICY IF EXISTS "announcements_delete_policy" ON public.announcements;

-- سياسة القراءة - يمكن للجميع قراءة الإعلانات المنشورة
CREATE POLICY "announcements_select_policy" ON public.announcements
FOR SELECT
USING (
    published_at IS NOT NULL 
    AND published_at <= NOW()
    AND (expires_at IS NULL OR expires_at > NOW())
);

-- سياسة الإدراج - يمكن للمستخدمين المصادق عليهم الذين لديهم دور نشط بمستوى 6+ إضافة إعلانات
CREATE POLICY "announcements_insert_policy" ON public.announcements
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 6
    )
);

-- سياسة التحديث - يمكن للمستخدمين الذين لديهم دور نشط بمستوى 6+ تحديث الإعلانات
CREATE POLICY "announcements_update_policy" ON public.announcements
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 6
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 6
    )
);

-- سياسة الحذف - يمكن للمستخدمين الذين لديهم دور نشط بمستوى 7+ حذف الإعلانات
CREATE POLICY "announcements_delete_policy" ON public.announcements
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 7
    )
);

-- =====================================================
-- منح الصلاحيات للدالة
-- =====================================================

GRANT EXECUTE ON FUNCTION public.get_user_max_role_level(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_max_role_level(UUID) TO anon;

-- =====================================================
-- تعليق توضيحي
-- =====================================================

COMMENT ON FUNCTION public.get_user_max_role_level IS 
'دالة آمنة للحصول على أعلى مستوى صلاحية للمستخدم بدون infinite recursion. 
تستخدم SECURITY DEFINER لتجاوز RLS عند التحقق من الصلاحيات.';
