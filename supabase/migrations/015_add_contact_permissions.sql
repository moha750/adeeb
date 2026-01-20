-- =====================================================
-- إضافة صلاحيات إدارة رسائل التواصل
-- Contact Messages Permissions
-- =====================================================
-- تاريخ الإنشاء: 2026-01-18
-- الوصف: صلاحيات نظام رسائل التواصل متكاملة مع النظام المركزي
-- =====================================================

-- =====================================================
-- 1. إضافة صلاحيات رسائل التواصل
-- =====================================================
INSERT INTO public.permissions (permission_key, permission_name_ar, permission_name_en, description, module, resource_type, is_system)
VALUES
    ('contact_messages.view', 'عرض رسائل التواصل', 'View Contact Messages', 'عرض جميع رسائل التواصل الواردة من الموقع', 'contact_messages', 'contact_message', false),
    ('contact_messages.create', 'إضافة رسالة تواصل', 'Create Contact Message', 'إضافة رسائل تواصل جديدة (للزوار)', 'contact_messages', 'contact_message', false),
    ('contact_messages.update', 'تحديث رسائل التواصل', 'Update Contact Messages', 'تحديث حالة الرسائل وإضافة ردود وملاحظات', 'contact_messages', 'contact_message', false),
    ('contact_messages.delete', 'حذف رسائل التواصل', 'Delete Contact Messages', 'حذف رسائل التواصل نهائياً', 'contact_messages', 'contact_message', false),
    ('contact_messages.reply', 'الرد على رسائل التواصل', 'Reply to Contact Messages', 'إضافة ردود على رسائل التواصل', 'contact_messages', 'contact_message', false),
    ('contact_messages.manage', 'إدارة رسائل التواصل', 'Manage Contact Messages', 'الوصول الكامل لإدارة رسائل التواصل', 'contact_messages', 'contact_message', false)
ON CONFLICT (permission_key) DO NOTHING;

-- =====================================================
-- 2. تعيين صلاحيات رسائل التواصل للأدوار
-- =====================================================

-- 2.1 رئيس النادي (المستوى 10) - جميع الصلاحيات
INSERT INTO public.role_permissions (role_id, permission_id, scope, granted_by)
SELECT 
    r.id,
    p.id,
    'all',
    NULL
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_level = 10
AND p.module = 'contact_messages'
ON CONFLICT DO NOTHING;

-- 2.2 رئيس مجلس الإدارة (المستوى 9) - جميع الصلاحيات
INSERT INTO public.role_permissions (role_id, permission_id, scope, granted_by)
SELECT 
    r.id,
    p.id,
    'all',
    NULL
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_level = 9
AND p.module = 'contact_messages'
ON CONFLICT DO NOTHING;

-- 2.3 قائد لجنة الموارد البشرية والجودة (المستوى 8) - جميع الصلاحيات
INSERT INTO public.role_permissions (role_id, permission_id, scope, granted_by)
SELECT 
    r.id,
    p.id,
    'all',
    NULL
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_level = 8
AND r.role_name IN ('hr_committee_leader', 'qa_committee_leader')
AND p.module = 'contact_messages'
ON CONFLICT DO NOTHING;

-- 2.4 عضو إداري (المستوى 7) - جميع الصلاحيات
INSERT INTO public.role_permissions (role_id, permission_id, scope, granted_by)
SELECT 
    r.id,
    p.id,
    'all',
    NULL
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_level = 7
AND p.module = 'contact_messages'
ON CONFLICT DO NOTHING;

-- 2.5 قائد لجنة (المستوى 6) - عرض والرد فقط
INSERT INTO public.role_permissions (role_id, permission_id, scope, granted_by)
SELECT 
    r.id,
    p.id,
    'all',
    NULL
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_level = 6
AND p.permission_key IN ('contact_messages.view', 'contact_messages.reply', 'contact_messages.update')
ON CONFLICT DO NOTHING;
