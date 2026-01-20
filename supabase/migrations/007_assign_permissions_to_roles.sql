-- =====================================================
-- ربط الصلاحيات بالأدوار حسب الهيكل التنظيمي
-- Assign Permissions to Roles
-- =====================================================
-- تاريخ الإنشاء: 2026-01-17
-- الوصف: توزيع الصلاحيات على الأدوار حسب المستويات الإدارية
-- =====================================================

-- =====================================================
-- 1. رئيس النادي (المستوى 10) - جميع الصلاحيات
-- =====================================================

INSERT INTO public.role_permissions (role_id, permission_id, scope)
SELECT 
    r.id,
    p.id,
    'all'
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'club_president'
ON CONFLICT (role_id, permission_id, scope) DO NOTHING;

-- =====================================================
-- 2. قائد لجنة الموارد البشرية (المستوى 9)
-- =====================================================

INSERT INTO public.role_permissions (role_id, permission_id, scope)
SELECT 
    r.id,
    p.id,
    'all'
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'hr_committee_leader'
    AND p.module IN ('users', 'evaluations', 'reports', 'meetings')
ON CONFLICT (role_id, permission_id, scope) DO NOTHING;

-- صلاحيات محدودة للجان
INSERT INTO public.role_permissions (role_id, permission_id, scope)
SELECT 
    r.id,
    p.id,
    'all'
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'hr_committee_leader'
    AND p.permission_key IN ('committees.view.all', 'committees.manage_members')
ON CONFLICT (role_id, permission_id, scope) DO NOTHING;

-- =====================================================
-- 3. قائد لجنة الضمان والجودة (المستوى 9)
-- =====================================================

INSERT INTO public.role_permissions (role_id, permission_id, scope)
SELECT 
    r.id,
    p.id,
    'all'
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'qa_committee_leader'
    AND p.module IN ('projects', 'evaluations', 'reports')
ON CONFLICT (role_id, permission_id, scope) DO NOTHING;

-- صلاحيات عرض للأقسام الأخرى
INSERT INTO public.role_permissions (role_id, permission_id, scope)
SELECT 
    r.id,
    p.id,
    'all'
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'qa_committee_leader'
    AND p.permission_key IN ('committees.view.all', 'users.view.all', 'tasks.view.all')
ON CONFLICT (role_id, permission_id, scope) DO NOTHING;

-- =====================================================
-- 4. الأعضاء الإداريون (المستوى 8)
-- =====================================================

INSERT INTO public.role_permissions (role_id, permission_id, scope)
SELECT 
    r.id,
    p.id,
    'committee'
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name IN ('hr_admin_member', 'qa_admin_member')
    AND p.module IN ('users', 'evaluations', 'meetings')
    AND p.permission_key NOT LIKE '%.delete'
ON CONFLICT (role_id, permission_id, scope) DO NOTHING;

-- صلاحيات عرض
INSERT INTO public.role_permissions (role_id, permission_id, scope)
SELECT 
    r.id,
    p.id,
    'all'
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name IN ('hr_admin_member', 'qa_admin_member')
    AND p.permission_key LIKE '%.view.%'
    AND p.module NOT IN ('system')
ON CONFLICT (role_id, permission_id, scope) DO NOTHING;

-- =====================================================
-- 5. رئيس المجلس الإداري (المستوى 8)
-- =====================================================

INSERT INTO public.role_permissions (role_id, permission_id, scope)
SELECT 
    r.id,
    p.id,
    'all'
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'administrative_council_president'
    AND p.module IN ('committees', 'projects', 'tasks', 'meetings', 'announcements', 'reports')
ON CONFLICT (role_id, permission_id, scope) DO NOTHING;

-- صلاحيات عرض المستخدمين
INSERT INTO public.role_permissions (role_id, permission_id, scope)
SELECT 
    r.id,
    p.id,
    'all'
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'administrative_council_president'
    AND p.permission_key IN ('users.view.all', 'users.view.committee')
ON CONFLICT (role_id, permission_id, scope) DO NOTHING;

-- =====================================================
-- 6. قائد اللجنة (المستوى 7)
-- =====================================================

-- صلاحيات اللجنة الخاصة
INSERT INTO public.role_permissions (role_id, permission_id, scope)
SELECT 
    r.id,
    p.id,
    'committee'
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'committee_leader'
    AND p.module IN ('projects', 'tasks', 'meetings', 'reports')
ON CONFLICT (role_id, permission_id, scope) DO NOTHING;

-- صلاحيات إدارة اللجنة
INSERT INTO public.role_permissions (role_id, permission_id, scope)
SELECT 
    r.id,
    p.id,
    'own'
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'committee_leader'
    AND p.permission_key IN ('committees.view.own', 'committees.update.own', 'committees.manage_members')
ON CONFLICT (role_id, permission_id, scope) DO NOTHING;

-- صلاحيات الإعلانات
INSERT INTO public.role_permissions (role_id, permission_id, scope)
SELECT 
    r.id,
    p.id,
    'committee'
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'committee_leader'
    AND p.module = 'announcements'
ON CONFLICT (role_id, permission_id, scope) DO NOTHING;

-- صلاحيات عرض المستخدمين والتقييمات
INSERT INTO public.role_permissions (role_id, permission_id, scope)
SELECT 
    r.id,
    p.id,
    'committee'
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'committee_leader'
    AND (p.permission_key LIKE 'users.view.%' OR p.permission_key LIKE 'evaluations.view.%')
ON CONFLICT (role_id, permission_id, scope) DO NOTHING;

-- =====================================================
-- 7. نائب قائد اللجنة (المستوى 6)
-- =====================================================

-- صلاحيات اللجنة
INSERT INTO public.role_permissions (role_id, permission_id, scope)
SELECT 
    r.id,
    p.id,
    'committee'
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'deputy_committee_leader'
    AND p.module IN ('tasks', 'meetings', 'projects')
    AND p.permission_key NOT LIKE '%.delete'
ON CONFLICT (role_id, permission_id, scope) DO NOTHING;

-- صلاحيات العرض
INSERT INTO public.role_permissions (role_id, permission_id, scope)
SELECT 
    r.id,
    p.id,
    'committee'
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'deputy_committee_leader'
    AND (
        p.permission_key LIKE '%.view.committee' 
        OR p.permission_key IN ('committees.view.own', 'announcements.view', 'reports.view.committee')
    )
ON CONFLICT (role_id, permission_id, scope) DO NOTHING;

-- صلاحية تسجيل الحضور
INSERT INTO public.role_permissions (role_id, permission_id, scope)
SELECT 
    r.id,
    p.id,
    'committee'
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'deputy_committee_leader'
    AND p.permission_key = 'meetings.record_attendance'
ON CONFLICT (role_id, permission_id, scope) DO NOTHING;

-- =====================================================
-- 8. عضو اللجنة (المستوى 5)
-- =====================================================

-- صلاحيات العرض
INSERT INTO public.role_permissions (role_id, permission_id, scope)
SELECT 
    r.id,
    p.id,
    'committee'
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'committee_member'
    AND p.permission_key IN (
        'committees.view.own',
        'projects.view.committee',
        'meetings.view.committee',
        'announcements.view',
        'users.view.committee'
    )
ON CONFLICT (role_id, permission_id, scope) DO NOTHING;

-- صلاحيات المهام المسندة
INSERT INTO public.role_permissions (role_id, permission_id, scope)
SELECT 
    r.id,
    p.id,
    'own'
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'committee_member'
    AND p.permission_key IN (
        'tasks.view.assigned',
        'tasks.update.assigned',
        'tasks.change_status',
        'tasks.comment'
    )
ON CONFLICT (role_id, permission_id, scope) DO NOTHING;

-- صلاحيات التقييمات الخاصة
INSERT INTO public.role_permissions (role_id, permission_id, scope)
SELECT 
    r.id,
    p.id,
    'own'
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'committee_member'
    AND p.permission_key = 'evaluations.view.own'
ON CONFLICT (role_id, permission_id, scope) DO NOTHING;

-- =====================================================
-- 9. العضو العادي (المستوى 1)
-- =====================================================

-- صلاحيات أساسية فقط
INSERT INTO public.role_permissions (role_id, permission_id, scope)
SELECT 
    r.id,
    p.id,
    'own'
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'regular_member'
    AND p.permission_key IN (
        'announcements.view',
        'users.view.own',
        'users.update.own',
        'notifications.view.own'
    )
ON CONFLICT (role_id, permission_id, scope) DO NOTHING;

-- =====================================================
-- 10. إحصائيات الصلاحيات الممنوحة
-- =====================================================

-- عرض ملخص الصلاحيات لكل دور
DO $$
DECLARE
    role_record RECORD;
    perm_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ملخص الصلاحيات الممنوحة لكل دور';
    RAISE NOTICE '========================================';
    
    FOR role_record IN 
        SELECT id, role_name_ar, role_level 
        FROM public.roles 
        ORDER BY role_level DESC
    LOOP
        SELECT COUNT(*) INTO perm_count
        FROM public.role_permissions
        WHERE role_id = role_record.id;
        
        RAISE NOTICE '% (المستوى %): % صلاحية', 
            role_record.role_name_ar, 
            role_record.role_level, 
            perm_count;
    END LOOP;
    
    RAISE NOTICE '========================================';
END $$;
