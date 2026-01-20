-- =====================================================
-- نظام إدارة نادي أدِيب - البيانات الأولية
-- =====================================================
-- تاريخ الإنشاء: 2026-01-16
-- الوصف: إدخال البيانات الأساسية (الأدوار، اللجان، الصلاحيات)
-- =====================================================

-- =====================================================
-- 1. إدخال اللجان
-- =====================================================
INSERT INTO public.committees (committee_name_ar, description, is_active) VALUES
('لجنة الفعاليات', 'مسؤولة عن تنظيم وإدارة جميع فعاليات النادي', true),
('لجنة الرواة', 'مسؤولة عن رواية القصص والعروض الأدبية', true),
('لجنة التأليف', 'مسؤولة عن كتابة وتأليف المحتوى الأدبي', true),
('لجنة السفراء', 'مسؤولة عن التواصل مع الجهات الخارجية والعلاقات العامة', true),
('لجنة الإنتاج', 'مسؤولة عن إنتاج المحتوى المرئي والمسموع', true),
('لجنة التصميم', 'مسؤولة عن التصميم الجرافيكي والهوية البصرية', true),
('لجنة التسويق', 'مسؤولة عن التسويق والترويج لأنشطة النادي', true)
ON CONFLICT (committee_name_ar) DO NOTHING;

-- =====================================================
-- 2. إدخال الأدوار
-- =====================================================

-- المجلس الأعلى (Supreme Council) - المستوى 10-9
INSERT INTO public.roles (role_name, role_name_ar, role_level, role_category, description) VALUES
('club_president', 'رئيس نادي أدِيب', 10, 'supreme_council', 'أعلى منصب في النادي - صلاحيات كاملة'),
('hr_committee_leader', 'قائد لجنة الموارد البشرية', 9, 'supreme_council', 'مسؤول عن إدارة الموارد البشرية في جميع اللجان'),
('qa_committee_leader', 'قائد لجنة الضمان والجودة', 9, 'supreme_council', 'مسؤول عن ضمان جودة العمل في جميع اللجان'),
('hr_admin_member', 'عضو إداري - الموارد البشرية', 8, 'supreme_council', 'عضو إداري مسؤول عن الموارد البشرية في لجنة محددة'),
('qa_admin_member', 'عضو إداري - الضمان والجودة', 8, 'supreme_council', 'عضو إداري مسؤول عن الجودة في لجنة محددة')
ON CONFLICT (role_name) DO NOTHING;

-- المجلس الإداري (Administrative Council) - المستوى 8-7
INSERT INTO public.roles (role_name, role_name_ar, role_level, role_category, description) VALUES
('administrative_council_president', 'رئيس المجلس الإداري', 8, 'administrative_council', 'رئيس المجلس الإداري - يدير جميع اللجان التنفيذية'),
('committee_leader', 'قائد لجنة', 7, 'committee', 'قائد لجنة تنفيذية - مسؤول عن إدارة لجنته'),
('deputy_committee_leader', 'نائب قائد لجنة', 6, 'committee', 'نائب قائد اللجنة - يساعد القائد في إدارة اللجنة')
ON CONFLICT (role_name) DO NOTHING;

-- أعضاء اللجان (Committee Members) - المستوى 5
INSERT INTO public.roles (role_name, role_name_ar, role_level, role_category, description) VALUES
('committee_member', 'عضو لجنة', 5, 'committee', 'عضو في إحدى اللجان التنفيذية')
ON CONFLICT (role_name) DO NOTHING;

-- الأعضاء العاديون (Regular Members) - المستوى 1
INSERT INTO public.roles (role_name, role_name_ar, role_level, role_category, description) VALUES
('regular_member', 'عضو عادي', 1, 'member', 'عضو عادي في النادي')
ON CONFLICT (role_name) DO NOTHING;

-- =====================================================
-- 3. إدخال الصلاحيات
-- =====================================================

-- صلاحيات إدارة المستخدمين
INSERT INTO public.permissions (permission_name, permission_name_ar, description, category) VALUES
('manage_users', 'إدارة المستخدمين', 'إضافة وتعديل وحذف المستخدمين', 'users'),
('view_users', 'عرض المستخدمين', 'عرض قائمة المستخدمين ومعلوماتهم', 'users'),
('assign_roles', 'تعيين الأدوار', 'تعيين الأدوار للمستخدمين', 'users'),
('manage_profiles', 'إدارة الملفات الشخصية', 'تعديل الملفات الشخصية للمستخدمين', 'users')
ON CONFLICT (permission_name) DO NOTHING;

-- صلاحيات إدارة اللجان
INSERT INTO public.permissions (permission_name, permission_name_ar, description, category) VALUES
('manage_committees', 'إدارة اللجان', 'إنشاء وتعديل وحذف اللجان', 'committees'),
('view_committees', 'عرض اللجان', 'عرض معلومات اللجان', 'committees'),
('manage_committee_members', 'إدارة أعضاء اللجنة', 'إضافة وإزالة أعضاء اللجنة', 'committees')
ON CONFLICT (permission_name) DO NOTHING;

-- صلاحيات إدارة المشاريع
INSERT INTO public.permissions (permission_name, permission_name_ar, description, category) VALUES
('manage_projects', 'إدارة المشاريع', 'إنشاء وتعديل وحذف المشاريع', 'projects'),
('view_projects', 'عرض المشاريع', 'عرض معلومات المشاريع', 'projects'),
('approve_projects', 'الموافقة على المشاريع', 'الموافقة على المشاريع قبل النشر', 'projects')
ON CONFLICT (permission_name) DO NOTHING;

-- صلاحيات إدارة المهام
INSERT INTO public.permissions (permission_name, permission_name_ar, description, category) VALUES
('manage_tasks', 'إدارة المهام', 'إنشاء وتعديل وحذف المهام', 'tasks'),
('view_tasks', 'عرض المهام', 'عرض المهام المسندة', 'tasks'),
('assign_tasks', 'تعيين المهام', 'تعيين المهام للأعضاء', 'tasks'),
('update_task_status', 'تحديث حالة المهمة', 'تحديث حالة المهام', 'tasks')
ON CONFLICT (permission_name) DO NOTHING;

-- صلاحيات إدارة الاجتماعات
INSERT INTO public.permissions (permission_name, permission_name_ar, description, category) VALUES
('manage_meetings', 'إدارة الاجتماعات', 'إنشاء وتعديل وحذف الاجتماعات', 'meetings'),
('view_meetings', 'عرض الاجتماعات', 'عرض الاجتماعات المجدولة', 'meetings'),
('record_attendance', 'تسجيل الحضور', 'تسجيل حضور الأعضاء في الاجتماعات', 'meetings')
ON CONFLICT (permission_name) DO NOTHING;

-- صلاحيات التقارير
INSERT INTO public.permissions (permission_name, permission_name_ar, description, category) VALUES
('generate_reports', 'إنشاء التقارير', 'إنشاء تقارير الأداء والإحصائيات', 'reports'),
('view_reports', 'عرض التقارير', 'عرض التقارير المتاحة', 'reports'),
('view_all_reports', 'عرض جميع التقارير', 'عرض جميع تقارير النادي', 'reports')
ON CONFLICT (permission_name) DO NOTHING;

-- صلاحيات التقييمات
INSERT INTO public.permissions (permission_name, permission_name_ar, description, category) VALUES
('evaluate_members', 'تقييم الأعضاء', 'تقييم أداء أعضاء اللجنة', 'evaluations'),
('view_evaluations', 'عرض التقييمات', 'عرض تقييمات الأعضاء', 'evaluations')
ON CONFLICT (permission_name) DO NOTHING;

-- صلاحيات الإعلانات
INSERT INTO public.permissions (permission_name, permission_name_ar, description, category) VALUES
('manage_announcements', 'إدارة الإعلانات', 'إنشاء وتعديل وحذف الإعلانات', 'announcements'),
('view_announcements', 'عرض الإعلانات', 'عرض الإعلانات المنشورة', 'announcements')
ON CONFLICT (permission_name) DO NOTHING;

-- صلاحيات النظام
INSERT INTO public.permissions (permission_name, permission_name_ar, description, category) VALUES
('manage_system_settings', 'إدارة إعدادات النظام', 'تعديل إعدادات النظام العامة', 'system'),
('view_activity_log', 'عرض سجل الأنشطة', 'عرض سجل أنشطة المستخدمين', 'system'),
('manage_permissions', 'إدارة الصلاحيات', 'إدارة صلاحيات الأدوار', 'system')
ON CONFLICT (permission_name) DO NOTHING;

-- =====================================================
-- 4. ربط الأدوار بالصلاحيات
-- =====================================================

-- صلاحيات رئيس النادي (المستوى 10) - جميع الصلاحيات
INSERT INTO public.role_permissions (role_id, permission_id, can_create, can_read, can_update, can_delete)
SELECT 
    r.id,
    p.id,
    true,
    true,
    true,
    true
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'club_president'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- صلاحيات قائد لجنة الموارد البشرية (المستوى 9)
INSERT INTO public.role_permissions (role_id, permission_id, can_create, can_read, can_update, can_delete)
SELECT 
    r.id,
    p.id,
    CASE 
        WHEN p.category IN ('users', 'committees', 'meetings', 'reports', 'evaluations') THEN true
        ELSE false
    END,
    true,
    CASE 
        WHEN p.category IN ('users', 'committees', 'meetings', 'evaluations') THEN true
        ELSE false
    END,
    CASE 
        WHEN p.category IN ('evaluations') THEN true
        ELSE false
    END
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'hr_committee_leader'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- صلاحيات قائد لجنة الضمان والجودة (المستوى 9)
INSERT INTO public.role_permissions (role_id, permission_id, can_create, can_read, can_update, can_delete)
SELECT 
    r.id,
    p.id,
    CASE 
        WHEN p.category IN ('projects', 'reports', 'evaluations') THEN true
        ELSE false
    END,
    true,
    CASE 
        WHEN p.category IN ('projects', 'reports', 'evaluations') THEN true
        ELSE false
    END,
    CASE 
        WHEN p.category IN ('evaluations') THEN true
        ELSE false
    END
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'qa_committee_leader'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- صلاحيات الأعضاء الإداريين (المستوى 8)
INSERT INTO public.role_permissions (role_id, permission_id, can_create, can_read, can_update, can_delete)
SELECT 
    r.id,
    p.id,
    CASE 
        WHEN p.category IN ('users', 'meetings', 'evaluations') THEN true
        ELSE false
    END,
    CASE 
        WHEN p.category NOT IN ('system') THEN true
        ELSE false
    END,
    CASE 
        WHEN p.category IN ('users', 'meetings', 'evaluations') THEN true
        ELSE false
    END,
    false
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name IN ('hr_admin_member', 'qa_admin_member')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- صلاحيات رئيس المجلس الإداري (المستوى 8)
INSERT INTO public.role_permissions (role_id, permission_id, can_create, can_read, can_update, can_delete)
SELECT 
    r.id,
    p.id,
    CASE 
        WHEN p.category IN ('committees', 'projects', 'tasks', 'meetings', 'reports', 'announcements') THEN true
        ELSE false
    END,
    CASE 
        WHEN p.category NOT IN ('system') THEN true
        ELSE false
    END,
    CASE 
        WHEN p.category IN ('committees', 'projects', 'tasks', 'meetings', 'announcements') THEN true
        ELSE false
    END,
    CASE 
        WHEN p.category IN ('tasks', 'meetings') THEN true
        ELSE false
    END
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'administrative_council_president'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- صلاحيات قائد اللجنة (المستوى 7)
INSERT INTO public.role_permissions (role_id, permission_id, can_create, can_read, can_update, can_delete)
SELECT 
    r.id,
    p.id,
    CASE 
        WHEN p.category IN ('projects', 'tasks', 'meetings', 'reports', 'announcements') THEN true
        WHEN p.permission_name = 'manage_committee_members' THEN true
        ELSE false
    END,
    CASE 
        WHEN p.category IN ('users', 'committees', 'projects', 'tasks', 'meetings', 'reports', 'evaluations', 'announcements') THEN true
        ELSE false
    END,
    CASE 
        WHEN p.category IN ('projects', 'tasks', 'meetings', 'announcements') THEN true
        WHEN p.permission_name = 'record_attendance' THEN true
        ELSE false
    END,
    CASE 
        WHEN p.category IN ('tasks', 'meetings') THEN true
        ELSE false
    END
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'committee_leader'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- صلاحيات نائب قائد اللجنة (المستوى 6)
INSERT INTO public.role_permissions (role_id, permission_id, can_create, can_read, can_update, can_delete)
SELECT 
    r.id,
    p.id,
    CASE 
        WHEN p.category IN ('tasks', 'meetings') THEN true
        ELSE false
    END,
    CASE 
        WHEN p.category IN ('users', 'committees', 'projects', 'tasks', 'meetings', 'reports', 'announcements') THEN true
        ELSE false
    END,
    CASE 
        WHEN p.category IN ('tasks', 'meetings') THEN true
        WHEN p.permission_name = 'record_attendance' THEN true
        ELSE false
    END,
    false
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'deputy_committee_leader'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- صلاحيات عضو اللجنة (المستوى 5)
INSERT INTO public.role_permissions (role_id, permission_id, can_create, can_read, can_update, can_delete)
SELECT 
    r.id,
    p.id,
    false,
    CASE 
        WHEN p.category IN ('committees', 'projects', 'tasks', 'meetings', 'announcements') THEN true
        WHEN p.permission_name IN ('view_users', 'view_evaluations') THEN true
        ELSE false
    END,
    CASE 
        WHEN p.permission_name = 'update_task_status' THEN true
        ELSE false
    END,
    false
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'committee_member'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- صلاحيات العضو العادي (المستوى 1)
INSERT INTO public.role_permissions (role_id, permission_id, can_create, can_read, can_update, can_delete)
SELECT 
    r.id,
    p.id,
    false,
    CASE 
        WHEN p.permission_name IN ('view_announcements') THEN true
        ELSE false
    END,
    false,
    false
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'regular_member'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- =====================================================
-- 5. إنشاء مستخدم تجريبي (للاختبار فقط)
-- =====================================================
-- ملاحظة: يجب إنشاء المستخدم في Supabase Auth أولاً
-- ثم إضافة ملفه الشخصي هنا باستخدام UUID الخاص به

-- مثال على إضافة ملف شخصي (استبدل UUID بالمعرف الحقيقي من Auth)
-- INSERT INTO public.profiles (id, username, full_name, email, account_status)
-- VALUES (
--     'UUID_FROM_AUTH',
--     'admin',
--     'مدير النظام',
--     'admin@adeeb.club',
--     'active'
-- );

-- مثال على تعيين دور رئيس النادي
-- INSERT INTO public.user_roles (user_id, role_id, is_active)
-- SELECT 
--     'UUID_FROM_AUTH',
--     id,
--     true
-- FROM public.roles
-- WHERE role_name = 'club_president';

-- =====================================================
-- تعليقات ختامية
-- =====================================================
-- تم إدخال البيانات الأولية بنجاح:
-- - 7 لجان تنفيذية
-- - 10 أدوار وظيفية
-- - 25+ صلاحية
-- - ربط الأدوار بالصلاحيات المناسبة
-- 
-- الخطوة التالية: إنشاء المستخدمين وتعيين الأدوار لهم
