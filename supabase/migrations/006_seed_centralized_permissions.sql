-- =====================================================
-- إدخال الصلاحيات الأساسية للنظام المركزي
-- Seed Centralized Permissions Data
-- =====================================================
-- تاريخ الإنشاء: 2026-01-17
-- الوصف: إدخال جميع الصلاحيات المطلوبة حسب الأقسام
-- =====================================================

-- =====================================================
-- 1. صلاحيات إدارة المستخدمين (Users Management)
-- =====================================================

INSERT INTO public.permissions (permission_key, permission_name_ar, permission_name_en, description, module, resource_type, is_system) VALUES
('users.view.all', 'عرض جميع المستخدمين', 'View All Users', 'عرض قائمة جميع المستخدمين في النظام', 'users', 'user', false),
('users.view.committee', 'عرض مستخدمي اللجنة', 'View Committee Users', 'عرض المستخدمين في اللجنة المحددة فقط', 'users', 'user', false),
('users.view.own', 'عرض الملف الشخصي', 'View Own Profile', 'عرض الملف الشخصي الخاص', 'users', 'user', true),
('users.create', 'إضافة مستخدمين', 'Create Users', 'إضافة مستخدمين جدد للنظام', 'users', 'user', false),
('users.update.all', 'تعديل أي مستخدم', 'Update Any User', 'تعديل معلومات أي مستخدم', 'users', 'user', false),
('users.update.committee', 'تعديل مستخدمي اللجنة', 'Update Committee Users', 'تعديل مستخدمي اللجنة فقط', 'users', 'user', false),
('users.update.own', 'تعديل الملف الشخصي', 'Update Own Profile', 'تعديل الملف الشخصي الخاص', 'users', 'user', true),
('users.delete', 'حذف مستخدمين', 'Delete Users', 'حذف مستخدمين من النظام', 'users', 'user', false),
('users.activate', 'تفعيل/تعطيل الحسابات', 'Activate/Deactivate Accounts', 'تفعيل أو تعطيل حسابات المستخدمين', 'users', 'user', false),
('users.assign_roles', 'تعيين الأدوار', 'Assign Roles', 'تعيين الأدوار للمستخدمين', 'users', 'user', false),
('users.export', 'تصدير بيانات المستخدمين', 'Export Users Data', 'تصدير بيانات المستخدمين', 'users', 'user', false)
ON CONFLICT (permission_key) DO NOTHING;

-- =====================================================
-- 2. صلاحيات إدارة اللجان (Committees Management)
-- =====================================================

INSERT INTO public.permissions (permission_key, permission_name_ar, permission_name_en, description, module, resource_type, is_system) VALUES
('committees.view.all', 'عرض جميع اللجان', 'View All Committees', 'عرض معلومات جميع اللجان', 'committees', 'committee', false),
('committees.view.own', 'عرض اللجنة الخاصة', 'View Own Committee', 'عرض معلومات اللجنة الخاصة فقط', 'committees', 'committee', true),
('committees.create', 'إنشاء لجان', 'Create Committees', 'إنشاء لجان جديدة', 'committees', 'committee', false),
('committees.update.all', 'تعديل أي لجنة', 'Update Any Committee', 'تعديل معلومات أي لجنة', 'committees', 'committee', false),
('committees.update.own', 'تعديل اللجنة الخاصة', 'Update Own Committee', 'تعديل معلومات اللجنة الخاصة', 'committees', 'committee', false),
('committees.delete', 'حذف لجان', 'Delete Committees', 'حذف لجان من النظام', 'committees', 'committee', false),
('committees.manage_members', 'إدارة أعضاء اللجنة', 'Manage Committee Members', 'إضافة وإزالة أعضاء اللجنة', 'committees', 'committee', false),
('committees.activate', 'تفعيل/تعطيل اللجان', 'Activate/Deactivate Committees', 'تفعيل أو تعطيل اللجان', 'committees', 'committee', false)
ON CONFLICT (permission_key) DO NOTHING;

-- =====================================================
-- 3. صلاحيات إدارة المشاريع (Projects Management)
-- =====================================================

INSERT INTO public.permissions (permission_key, permission_name_ar, permission_name_en, description, module, resource_type, is_system) VALUES
('projects.view.all', 'عرض جميع المشاريع', 'View All Projects', 'عرض جميع المشاريع في النظام', 'projects', 'project', false),
('projects.view.committee', 'عرض مشاريع اللجنة', 'View Committee Projects', 'عرض مشاريع اللجنة فقط', 'projects', 'project', false),
('projects.view.own', 'عرض المشاريع الخاصة', 'View Own Projects', 'عرض المشاريع التي يقودها المستخدم', 'projects', 'project', true),
('projects.create', 'إنشاء مشاريع', 'Create Projects', 'إنشاء مشاريع جديدة', 'projects', 'project', false),
('projects.update.all', 'تعديل أي مشروع', 'Update Any Project', 'تعديل أي مشروع في النظام', 'projects', 'project', false),
('projects.update.committee', 'تعديل مشاريع اللجنة', 'Update Committee Projects', 'تعديل مشاريع اللجنة فقط', 'projects', 'project', false),
('projects.update.own', 'تعديل المشاريع الخاصة', 'Update Own Projects', 'تعديل المشاريع الخاصة فقط', 'projects', 'project', false),
('projects.delete', 'حذف مشاريع', 'Delete Projects', 'حذف مشاريع من النظام', 'projects', 'project', false),
('projects.approve', 'الموافقة على المشاريع', 'Approve Projects', 'الموافقة على المشاريع قبل النشر', 'projects', 'project', false),
('projects.change_status', 'تغيير حالة المشروع', 'Change Project Status', 'تغيير حالة المشروع', 'projects', 'project', false)
ON CONFLICT (permission_key) DO NOTHING;

-- =====================================================
-- 4. صلاحيات إدارة المهام (Tasks Management)
-- =====================================================

INSERT INTO public.permissions (permission_key, permission_name_ar, permission_name_en, description, module, resource_type, is_system) VALUES
('tasks.view.all', 'عرض جميع المهام', 'View All Tasks', 'عرض جميع المهام في النظام', 'tasks', 'task', false),
('tasks.view.committee', 'عرض مهام اللجنة', 'View Committee Tasks', 'عرض مهام اللجنة فقط', 'tasks', 'task', false),
('tasks.view.assigned', 'عرض المهام المسندة', 'View Assigned Tasks', 'عرض المهام المسندة للمستخدم', 'tasks', 'task', true),
('tasks.create', 'إنشاء مهام', 'Create Tasks', 'إنشاء مهام جديدة', 'tasks', 'task', false),
('tasks.assign', 'تعيين مهام', 'Assign Tasks', 'تعيين مهام للمستخدمين', 'tasks', 'task', false),
('tasks.update.all', 'تعديل أي مهمة', 'Update Any Task', 'تعديل أي مهمة في النظام', 'tasks', 'task', false),
('tasks.update.committee', 'تعديل مهام اللجنة', 'Update Committee Tasks', 'تعديل مهام اللجنة فقط', 'tasks', 'task', false),
('tasks.update.assigned', 'تعديل المهام المسندة', 'Update Assigned Tasks', 'تعديل المهام المسندة فقط', 'tasks', 'task', false),
('tasks.delete', 'حذف مهام', 'Delete Tasks', 'حذف مهام من النظام', 'tasks', 'task', false),
('tasks.change_status', 'تغيير حالة المهمة', 'Change Task Status', 'تغيير حالة المهمة', 'tasks', 'task', false),
('tasks.comment', 'التعليق على المهام', 'Comment on Tasks', 'إضافة تعليقات على المهام', 'tasks', 'task', true)
ON CONFLICT (permission_key) DO NOTHING;

-- =====================================================
-- 5. صلاحيات إدارة الاجتماعات (Meetings Management)
-- =====================================================

INSERT INTO public.permissions (permission_key, permission_name_ar, permission_name_en, description, module, resource_type, is_system) VALUES
('meetings.view.all', 'عرض جميع الاجتماعات', 'View All Meetings', 'عرض جميع الاجتماعات', 'meetings', 'meeting', false),
('meetings.view.committee', 'عرض اجتماعات اللجنة', 'View Committee Meetings', 'عرض اجتماعات اللجنة فقط', 'meetings', 'meeting', true),
('meetings.create', 'إنشاء اجتماعات', 'Create Meetings', 'إنشاء اجتماعات جديدة', 'meetings', 'meeting', false),
('meetings.update', 'تعديل اجتماعات', 'Update Meetings', 'تعديل معلومات الاجتماعات', 'meetings', 'meeting', false),
('meetings.delete', 'حذف اجتماعات', 'Delete Meetings', 'حذف اجتماعات', 'meetings', 'meeting', false),
('meetings.record_attendance', 'تسجيل الحضور', 'Record Attendance', 'تسجيل حضور الأعضاء', 'meetings', 'meeting', false),
('meetings.cancel', 'إلغاء اجتماعات', 'Cancel Meetings', 'إلغاء اجتماعات مجدولة', 'meetings', 'meeting', false)
ON CONFLICT (permission_key) DO NOTHING;

-- =====================================================
-- 6. صلاحيات إدارة التقارير (Reports Management)
-- =====================================================

INSERT INTO public.permissions (permission_key, permission_name_ar, permission_name_en, description, module, resource_type, is_system) VALUES
('reports.view.all', 'عرض جميع التقارير', 'View All Reports', 'عرض جميع التقارير في النظام', 'reports', 'report', false),
('reports.view.committee', 'عرض تقارير اللجنة', 'View Committee Reports', 'عرض تقارير اللجنة فقط', 'reports', 'report', false),
('reports.view.own', 'عرض التقارير الخاصة', 'View Own Reports', 'عرض التقارير التي أنشأها المستخدم', 'reports', 'report', true),
('reports.generate', 'إنشاء تقارير', 'Generate Reports', 'إنشاء تقارير جديدة', 'reports', 'report', false),
('reports.export', 'تصدير التقارير', 'Export Reports', 'تصدير التقارير بصيغ مختلفة', 'reports', 'report', false),
('reports.delete', 'حذف تقارير', 'Delete Reports', 'حذف تقارير من النظام', 'reports', 'report', false)
ON CONFLICT (permission_key) DO NOTHING;

-- =====================================================
-- 7. صلاحيات إدارة التقييمات (Evaluations Management)
-- =====================================================

INSERT INTO public.permissions (permission_key, permission_name_ar, permission_name_en, description, module, resource_type, is_system) VALUES
('evaluations.view.all', 'عرض جميع التقييمات', 'View All Evaluations', 'عرض جميع التقييمات', 'evaluations', 'evaluation', false),
('evaluations.view.committee', 'عرض تقييمات اللجنة', 'View Committee Evaluations', 'عرض تقييمات اللجنة فقط', 'evaluations', 'evaluation', false),
('evaluations.view.own', 'عرض التقييمات الخاصة', 'View Own Evaluations', 'عرض التقييمات الخاصة بالمستخدم', 'evaluations', 'evaluation', true),
('evaluations.create', 'إنشاء تقييمات', 'Create Evaluations', 'إنشاء تقييمات للأعضاء', 'evaluations', 'evaluation', false),
('evaluations.update', 'تعديل تقييمات', 'Update Evaluations', 'تعديل التقييمات', 'evaluations', 'evaluation', false),
('evaluations.delete', 'حذف تقييمات', 'Delete Evaluations', 'حذف تقييمات', 'evaluations', 'evaluation', false),
('evaluations.approve', 'الموافقة على التقييمات', 'Approve Evaluations', 'الموافقة على التقييمات', 'evaluations', 'evaluation', false)
ON CONFLICT (permission_key) DO NOTHING;

-- =====================================================
-- 8. صلاحيات إدارة الإعلانات (Announcements Management)
-- =====================================================

INSERT INTO public.permissions (permission_key, permission_name_ar, permission_name_en, description, module, resource_type, is_system) VALUES
('announcements.view', 'عرض الإعلانات', 'View Announcements', 'عرض الإعلانات المنشورة', 'announcements', 'announcement', true),
('announcements.create', 'إنشاء إعلانات', 'Create Announcements', 'إنشاء إعلانات جديدة', 'announcements', 'announcement', false),
('announcements.update', 'تعديل إعلانات', 'Update Announcements', 'تعديل الإعلانات', 'announcements', 'announcement', false),
('announcements.delete', 'حذف إعلانات', 'Delete Announcements', 'حذف إعلانات', 'announcements', 'announcement', false),
('announcements.pin', 'تثبيت إعلانات', 'Pin Announcements', 'تثبيت إعلانات مهمة', 'announcements', 'announcement', false),
('announcements.publish', 'نشر إعلانات', 'Publish Announcements', 'نشر الإعلانات', 'announcements', 'announcement', false)
ON CONFLICT (permission_key) DO NOTHING;

-- =====================================================
-- 9. صلاحيات إدارة النظام (System Management)
-- =====================================================

INSERT INTO public.permissions (permission_key, permission_name_ar, permission_name_en, description, module, resource_type, is_system) VALUES
('system.settings.view', 'عرض إعدادات النظام', 'View System Settings', 'عرض إعدادات النظام', 'system', 'setting', false),
('system.settings.update', 'تعديل إعدادات النظام', 'Update System Settings', 'تعديل إعدادات النظام', 'system', 'setting', false),
('system.logs.view', 'عرض سجلات النظام', 'View System Logs', 'عرض سجلات النشاط والأخطاء', 'system', 'log', false),
('system.permissions.view', 'عرض الصلاحيات', 'View Permissions', 'عرض قائمة الصلاحيات', 'system', 'permission', false),
('system.permissions.manage', 'إدارة الصلاحيات', 'Manage Permissions', 'إدارة الصلاحيات والأدوار', 'system', 'permission', false),
('system.backup', 'النسخ الاحتياطي', 'System Backup', 'إنشاء نسخ احتياطية', 'system', 'backup', false),
('system.maintenance', 'صيانة النظام', 'System Maintenance', 'تنفيذ عمليات الصيانة', 'system', 'maintenance', false)
ON CONFLICT (permission_key) DO NOTHING;

-- =====================================================
-- 10. صلاحيات إدارة الإشعارات (Notifications Management)
-- =====================================================

INSERT INTO public.permissions (permission_key, permission_name_ar, permission_name_en, description, module, resource_type, is_system) VALUES
('notifications.view.own', 'عرض الإشعارات الخاصة', 'View Own Notifications', 'عرض الإشعارات الخاصة', 'notifications', 'notification', true),
('notifications.send.all', 'إرسال إشعارات لجميع المستخدمين', 'Send Notifications to All', 'إرسال إشعارات لجميع المستخدمين', 'notifications', 'notification', false),
('notifications.send.committee', 'إرسال إشعارات للجنة', 'Send Notifications to Committee', 'إرسال إشعارات لأعضاء اللجنة', 'notifications', 'notification', false),
('notifications.manage', 'إدارة الإشعارات', 'Manage Notifications', 'إدارة نظام الإشعارات', 'notifications', 'notification', false)
ON CONFLICT (permission_key) DO NOTHING;

-- =====================================================
-- تعليق ختامي
-- =====================================================

-- تم إدخال جميع الصلاحيات الأساسية للنظام
-- المجموع: أكثر من 70 صلاحية موزعة على 10 أقسام رئيسية
