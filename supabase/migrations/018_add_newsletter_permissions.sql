-- =====================================================
-- إضافة صلاحيات إدارة النشرة البريدية
-- Newsletter Permissions
-- =====================================================
-- تاريخ الإنشاء: 2026-01-18
-- الوصف: صلاحيات نظام النشرة البريدية متكاملة مع النظام المركزي
-- =====================================================

-- =====================================================
-- 1. إضافة صلاحيات النشرة البريدية
-- =====================================================
INSERT INTO public.permissions (permission_key, permission_name_ar, permission_name_en, description, module, resource_type, is_system)
VALUES
    ('newsletter.view', 'عرض المشتركين', 'View Subscribers', 'عرض جميع المشتركين في النشرة البريدية', 'newsletter', 'subscriber', false),
    ('newsletter.create', 'إضافة مشترك', 'Create Subscriber', 'إضافة مشتركين جدد يدوياً', 'newsletter', 'subscriber', false),
    ('newsletter.update', 'تحديث المشتركين', 'Update Subscribers', 'تحديث حالة المشتركين وبياناتهم', 'newsletter', 'subscriber', false),
    ('newsletter.delete', 'حذف المشتركين', 'Delete Subscribers', 'حذف المشتركين نهائياً', 'newsletter', 'subscriber', false),
    ('newsletter.export', 'تصدير المشتركين', 'Export Subscribers', 'تصدير قائمة المشتركين', 'newsletter', 'subscriber', false),
    ('newsletter.send', 'إرسال رسائل', 'Send Emails', 'إرسال رسائل بريدية للمشتركين', 'newsletter', 'email', false),
    ('newsletter.manage', 'إدارة النشرة البريدية', 'Manage Newsletter', 'الوصول الكامل لإدارة النشرة البريدية', 'newsletter', 'newsletter', false)
ON CONFLICT (permission_key) DO NOTHING;

-- =====================================================
-- 2. تعيين صلاحيات النشرة البريدية للأدوار
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
AND p.module = 'newsletter'
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
AND p.module = 'newsletter'
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
AND p.module = 'newsletter'
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
AND p.module = 'newsletter'
ON CONFLICT DO NOTHING;

-- 2.5 قائد لجنة (المستوى 6) - عرض وتصدير فقط
INSERT INTO public.role_permissions (role_id, permission_id, scope, granted_by)
SELECT 
    r.id,
    p.id,
    'all',
    NULL
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_level = 6
AND p.permission_key IN ('newsletter.view', 'newsletter.export')
ON CONFLICT DO NOTHING;
