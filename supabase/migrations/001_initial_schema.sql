-- =====================================================
-- نظام إدارة نادي أدِيب - هيكل قاعدة البيانات
-- =====================================================
-- تاريخ الإنشاء: 2026-01-16
-- الوصف: البنية الأساسية للنظام الإداري الجديد
-- =====================================================

-- تفعيل الامتدادات المطلوبة
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. جدول الملفات الشخصية (profiles)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    bio TEXT,
    account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'inactive', 'suspended')),
    joined_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- إنشاء فهرس للبحث السريع
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_account_status ON public.profiles(account_status);

-- =====================================================
-- 2. جدول اللجان (committees)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.committees (
    id SERIAL PRIMARY KEY,
    committee_name_ar TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 3. جدول الأدوار (roles)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.roles (
    id SERIAL PRIMARY KEY,
    role_name TEXT UNIQUE NOT NULL,
    role_name_ar TEXT NOT NULL,
    role_level INTEGER NOT NULL CHECK (role_level BETWEEN 1 AND 10),
    role_category TEXT NOT NULL CHECK (role_category IN ('supreme_council', 'administrative_council', 'committee', 'member')),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- إنشاء فهرس للبحث حسب المستوى والفئة
CREATE INDEX idx_roles_level ON public.roles(role_level);
CREATE INDEX idx_roles_category ON public.roles(role_category);

-- =====================================================
-- 4. جدول ربط المستخدمين بالأدوار (user_roles)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    committee_id INTEGER REFERENCES public.committees(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    UNIQUE(user_id, role_id, committee_id)
);

-- إنشاء فهارس للأداء
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON public.user_roles(role_id);
CREATE INDEX idx_user_roles_committee_id ON public.user_roles(committee_id);
CREATE INDEX idx_user_roles_is_active ON public.user_roles(is_active);

-- =====================================================
-- 5. جدول الصلاحيات (permissions)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.permissions (
    id SERIAL PRIMARY KEY,
    permission_name TEXT UNIQUE NOT NULL,
    permission_name_ar TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 6. جدول ربط الأدوار بالصلاحيات (role_permissions)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    can_create BOOLEAN NOT NULL DEFAULT false,
    can_read BOOLEAN NOT NULL DEFAULT false,
    can_update BOOLEAN NOT NULL DEFAULT false,
    can_delete BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- إنشاء فهارس
CREATE INDEX idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON public.role_permissions(permission_id);

-- =====================================================
-- 7. جدول المشاريع (projects)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.projects (
    id SERIAL PRIMARY KEY,
    project_name TEXT NOT NULL,
    description TEXT,
    committee_id INTEGER REFERENCES public.committees(id) ON DELETE SET NULL,
    project_leader UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    start_date DATE,
    end_date DATE,
    budget NUMERIC(10, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- إنشاء فهارس
CREATE INDEX idx_projects_committee_id ON public.projects(committee_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_project_leader ON public.projects(project_leader);

-- =====================================================
-- 8. جدول المهام (tasks)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tasks (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    project_id INTEGER REFERENCES public.projects(id) ON DELETE CASCADE,
    committee_id INTEGER REFERENCES public.committees(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'review', 'completed', 'cancelled')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- إنشاء فهارس
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_committee_id ON public.tasks(committee_id);
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);

-- =====================================================
-- 9. جدول الاجتماعات (meetings)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.meetings (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    committee_id INTEGER REFERENCES public.committees(id) ON DELETE SET NULL,
    meeting_type TEXT NOT NULL CHECK (meeting_type IN ('general', 'committee', 'leadership', 'emergency')),
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    location TEXT,
    meeting_link TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- إنشاء فهارس
CREATE INDEX idx_meetings_committee_id ON public.meetings(committee_id);
CREATE INDEX idx_meetings_scheduled_at ON public.meetings(scheduled_at);
CREATE INDEX idx_meetings_status ON public.meetings(status);

-- =====================================================
-- 10. جدول الحضور (attendance)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.attendance (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    meeting_id INTEGER NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'excused', 'late')),
    notes TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    UNIQUE(user_id, meeting_id)
);

-- إنشاء فهارس
CREATE INDEX idx_attendance_user_id ON public.attendance(user_id);
CREATE INDEX idx_attendance_meeting_id ON public.attendance(meeting_id);
CREATE INDEX idx_attendance_status ON public.attendance(status);

-- =====================================================
-- 11. جدول الإشعارات (notifications)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('task', 'meeting', 'announcement', 'system', 'approval')),
    is_read BOOLEAN NOT NULL DEFAULT false,
    action_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- إنشاء فهارس
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- =====================================================
-- 12. جدول سجل الأنشطة (activity_log)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.activity_log (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- إنشاء فهارس
CREATE INDEX idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX idx_activity_log_action_type ON public.activity_log(action_type);
CREATE INDEX idx_activity_log_created_at ON public.activity_log(created_at DESC);

-- =====================================================
-- 13. جدول التقارير (reports)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.reports (
    id SERIAL PRIMARY KEY,
    report_title TEXT NOT NULL,
    report_type TEXT NOT NULL CHECK (report_type IN ('committee', 'user', 'project', 'general', 'attendance', 'quality')),
    committee_id INTEGER REFERENCES public.committees(id) ON DELETE SET NULL,
    generated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    report_data JSONB NOT NULL,
    period_start DATE,
    period_end DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- إنشاء فهارس
CREATE INDEX idx_reports_report_type ON public.reports(report_type);
CREATE INDEX idx_reports_committee_id ON public.reports(committee_id);
CREATE INDEX idx_reports_created_at ON public.reports(created_at DESC);

-- =====================================================
-- 14. جدول تعليقات المهام (task_comments)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.task_comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- إنشاء فهارس
CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX idx_task_comments_user_id ON public.task_comments(user_id);

-- =====================================================
-- 15. جدول مرفقات المهام (task_attachments)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.task_attachments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    file_type TEXT,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- إنشاء فهارس
CREATE INDEX idx_task_attachments_task_id ON public.task_attachments(task_id);

-- =====================================================
-- 16. جدول تقييمات الأعضاء (member_evaluations)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.member_evaluations (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    evaluator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    committee_id INTEGER REFERENCES public.committees(id) ON DELETE SET NULL,
    evaluation_period_start DATE NOT NULL,
    evaluation_period_end DATE NOT NULL,
    performance_score INTEGER CHECK (performance_score BETWEEN 1 AND 10),
    attendance_score INTEGER CHECK (attendance_score BETWEEN 1 AND 10),
    quality_score INTEGER CHECK (quality_score BETWEEN 1 AND 10),
    teamwork_score INTEGER CHECK (teamwork_score BETWEEN 1 AND 10),
    overall_score NUMERIC(4, 2),
    strengths TEXT,
    areas_for_improvement TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- إنشاء فهارس
CREATE INDEX idx_member_evaluations_user_id ON public.member_evaluations(user_id);
CREATE INDEX idx_member_evaluations_committee_id ON public.member_evaluations(committee_id);

-- =====================================================
-- 17. جدول الإعلانات (announcements)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.announcements (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    announcement_type TEXT NOT NULL CHECK (announcement_type IN ('general', 'committee', 'urgent', 'event')),
    target_audience TEXT NOT NULL CHECK (target_audience IN ('all', 'supreme_council', 'administrative_council', 'specific_committee')),
    committee_id INTEGER REFERENCES public.committees(id) ON DELETE SET NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    published_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- إنشاء فهارس
CREATE INDEX idx_announcements_target_audience ON public.announcements(target_audience);
CREATE INDEX idx_announcements_published_at ON public.announcements(published_at DESC);
CREATE INDEX idx_announcements_is_pinned ON public.announcements(is_pinned);

-- =====================================================
-- الدوال المساعدة (Helper Functions)
-- =====================================================

-- دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق الدالة على الجداول المطلوبة
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_committees_updated_at BEFORE UPDATE ON public.committees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON public.meetings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_comments_updated_at BEFORE UPDATE ON public.task_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- دالة للحصول على صلاحيات المستخدم
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_permissions(user_uuid UUID)
RETURNS TABLE (
    permission_name TEXT,
    can_create BOOLEAN,
    can_read BOOLEAN,
    can_update BOOLEAN,
    can_delete BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.permission_name,
        rp.can_create,
        rp.can_read,
        rp.can_update,
        rp.can_delete
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = user_uuid AND ur.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- دالة للحصول على أعلى مستوى دور للمستخدم
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_highest_role_level(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    highest_level INTEGER;
BEGIN
    SELECT MAX(r.role_level) INTO highest_level
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid AND ur.is_active = true;
    
    RETURN COALESCE(highest_level, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- دالة للتحقق من صلاحية معينة
-- =====================================================
CREATE OR REPLACE FUNCTION check_user_permission(
    user_uuid UUID,
    perm_name TEXT,
    action_type TEXT -- 'create', 'read', 'update', 'delete'
)
RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := false;
BEGIN
    SELECT 
        CASE action_type
            WHEN 'create' THEN rp.can_create
            WHEN 'read' THEN rp.can_read
            WHEN 'update' THEN rp.can_update
            WHEN 'delete' THEN rp.can_delete
            ELSE false
        END INTO has_permission
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = user_uuid 
        AND ur.is_active = true 
        AND p.permission_name = perm_name
    LIMIT 1;
    
    RETURN COALESCE(has_permission, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- دالة لتسجيل النشاط
-- =====================================================
CREATE OR REPLACE FUNCTION log_activity(
    p_user_id UUID,
    p_action_type TEXT,
    p_target_type TEXT,
    p_target_id TEXT,
    p_details JSONB DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.activity_log (user_id, action_type, target_type, target_id, details, ip_address)
    VALUES (p_user_id, p_action_type, p_target_type, p_target_id, p_details, p_ip_address);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Views (طرق العرض) للاستعلامات الشائعة
-- =====================================================

-- عرض لمعلومات المستخدمين مع أدوارهم
CREATE OR REPLACE VIEW user_roles_view AS
SELECT 
    p.id,
    p.username,
    p.full_name,
    p.email,
    p.account_status,
    r.role_name,
    r.role_name_ar,
    r.role_level,
    r.role_category,
    c.committee_name_ar,
    ur.is_active as role_is_active,
    ur.assigned_at
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
LEFT JOIN public.roles r ON ur.role_id = r.id
LEFT JOIN public.committees c ON ur.committee_id = c.id;

-- عرض للمهام مع معلومات كاملة
CREATE OR REPLACE VIEW tasks_detailed_view AS
SELECT 
    t.id,
    t.title,
    t.description,
    t.status,
    t.priority,
    t.due_date,
    t.completed_at,
    t.created_at,
    p1.full_name as assigned_to_name,
    p1.email as assigned_to_email,
    p2.full_name as assigned_by_name,
    c.committee_name_ar as committee_name,
    pr.project_name
FROM public.tasks t
LEFT JOIN public.profiles p1 ON t.assigned_to = p1.id
LEFT JOIN public.profiles p2 ON t.assigned_by = p2.id
LEFT JOIN public.committees c ON t.committee_id = c.id
LEFT JOIN public.projects pr ON t.project_id = pr.id;

-- عرض للمشاريع مع معلومات كاملة
CREATE OR REPLACE VIEW projects_detailed_view AS
SELECT 
    pr.id,
    pr.project_name,
    pr.description,
    pr.status,
    pr.priority,
    pr.start_date,
    pr.end_date,
    pr.budget,
    pr.created_at,
    p.full_name as project_leader_name,
    c.committee_name_ar as committee_name,
    COUNT(DISTINCT t.id) as tasks_count,
    COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks_count
FROM public.projects pr
LEFT JOIN public.profiles p ON pr.project_leader = p.id
LEFT JOIN public.committees c ON pr.committee_id = c.id
LEFT JOIN public.tasks t ON pr.id = t.project_id
GROUP BY pr.id, pr.project_name, pr.description, pr.status, pr.priority, 
         pr.start_date, pr.end_date, pr.budget, pr.created_at, 
         p.full_name, c.committee_name_ar;

-- =====================================================
-- تعليقات ختامية
-- =====================================================
COMMENT ON TABLE public.profiles IS 'جدول الملفات الشخصية للمستخدمين';
COMMENT ON TABLE public.committees IS 'جدول اللجان في نادي أدِيب';
COMMENT ON TABLE public.roles IS 'جدول الأدوار الوظيفية';
COMMENT ON TABLE public.user_roles IS 'جدول ربط المستخدمين بالأدوار واللجان';
COMMENT ON TABLE public.permissions IS 'جدول الصلاحيات';
COMMENT ON TABLE public.tasks IS 'جدول المهام';
COMMENT ON TABLE public.projects IS 'جدول المشاريع';
COMMENT ON TABLE public.meetings IS 'جدول الاجتماعات';
COMMENT ON TABLE public.attendance IS 'جدول الحضور';
COMMENT ON TABLE public.notifications IS 'جدول الإشعارات';
COMMENT ON TABLE public.activity_log IS 'سجل الأنشطة';
COMMENT ON TABLE public.reports IS 'جدول التقارير';
