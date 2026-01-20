-- =====================================================
-- تنظيف وتحديث نظام الصلاحيات
-- Cleanup and Update Permissions System
-- =====================================================
-- تاريخ الإنشاء: 2026-01-17
-- الوصف: حذف صلاحيات الجداول المحذوفة وإضافة صلاحيات محتوى الموقع
-- =====================================================

-- =====================================================
-- 1. حذف صلاحيات Announcements (الجدول محذوف)
-- =====================================================

-- حذف تعيينات الصلاحيات من role_permissions
DELETE FROM public.role_permissions 
WHERE permission_id IN (
    SELECT id FROM public.permissions WHERE module = 'announcements'
);

-- حذف الصلاحيات نفسها
DELETE FROM public.permissions WHERE module = 'announcements';

-- =====================================================
-- 2. إضافة صلاحيات إدارة محتوى الموقع (Website Content)
-- =====================================================

-- 2.1 صلاحيات أعمالنا (Works)
INSERT INTO public.permissions (permission_key, permission_name_ar, permission_name_en, description, module, resource_type, is_system) VALUES
('website.works.view', 'عرض الأعمال', 'View Works', 'عرض جميع الأعمال المنشورة', 'website', 'work', false),
('website.works.create', 'إضافة عمل', 'Create Work', 'إضافة أعمال جديدة', 'website', 'work', false),
('website.works.update', 'تعديل الأعمال', 'Update Works', 'تعديل الأعمال الموجودة', 'website', 'work', false),
('website.works.delete', 'حذف الأعمال', 'Delete Works', 'حذف الأعمال', 'website', 'work', false),
('website.works.publish', 'نشر الأعمال', 'Publish Works', 'نشر وإلغاء نشر الأعمال', 'website', 'work', false)
ON CONFLICT (permission_key) DO NOTHING;

-- 2.2 صلاحيات الإنجازات (Achievements)
INSERT INTO public.permissions (permission_key, permission_name_ar, permission_name_en, description, module, resource_type, is_system) VALUES
('website.achievements.view', 'عرض الإنجازات', 'View Achievements', 'عرض جميع الإنجازات', 'website', 'achievement', false),
('website.achievements.create', 'إضافة إنجاز', 'Create Achievement', 'إضافة إنجازات جديدة', 'website', 'achievement', false),
('website.achievements.update', 'تعديل الإنجازات', 'Update Achievements', 'تعديل الإنجازات الموجودة', 'website', 'achievement', false),
('website.achievements.delete', 'حذف الإنجازات', 'Delete Achievements', 'حذف الإنجازات', 'website', 'achievement', false)
ON CONFLICT (permission_key) DO NOTHING;

-- 2.3 صلاحيات الشركاء (Sponsors)
INSERT INTO public.permissions (permission_key, permission_name_ar, permission_name_en, description, module, resource_type, is_system) VALUES
('website.sponsors.view', 'عرض الشركاء', 'View Sponsors', 'عرض جميع الشركاء', 'website', 'sponsor', false),
('website.sponsors.create', 'إضافة شريك', 'Create Sponsor', 'إضافة شركاء جدد', 'website', 'sponsor', false),
('website.sponsors.update', 'تعديل الشركاء', 'Update Sponsors', 'تعديل معلومات الشركاء', 'website', 'sponsor', false),
('website.sponsors.delete', 'حذف الشركاء', 'Delete Sponsors', 'حذف الشركاء', 'website', 'sponsor', false)
ON CONFLICT (permission_key) DO NOTHING;

-- 2.4 صلاحيات الأسئلة الشائعة (FAQ)
INSERT INTO public.permissions (permission_key, permission_name_ar, permission_name_en, description, module, resource_type, is_system) VALUES
('website.faq.view', 'عرض الأسئلة الشائعة', 'View FAQ', 'عرض جميع الأسئلة الشائعة', 'website', 'faq', false),
('website.faq.create', 'إضافة سؤال', 'Create FAQ', 'إضافة أسئلة شائعة جديدة', 'website', 'faq', false),
('website.faq.update', 'تعديل الأسئلة', 'Update FAQ', 'تعديل الأسئلة الشائعة', 'website', 'faq', false),
('website.faq.delete', 'حذف الأسئلة', 'Delete FAQ', 'حذف الأسئلة الشائعة', 'website', 'faq', false)
ON CONFLICT (permission_key) DO NOTHING;

-- 2.5 صلاحيات عامة لإدارة الموقع
INSERT INTO public.permissions (permission_key, permission_name_ar, permission_name_en, description, module, resource_type, is_system) VALUES
('website.manage', 'إدارة محتوى الموقع', 'Manage Website Content', 'الوصول الكامل لإدارة محتوى الموقع', 'website', 'website', false),
('website.settings', 'إعدادات الموقع', 'Website Settings', 'تعديل إعدادات الموقع العامة', 'website', 'settings', false)
ON CONFLICT (permission_key) DO NOTHING;

-- =====================================================
-- 3. تعيين صلاحيات محتوى الموقع للأدوار
-- =====================================================

-- 3.1 رئيس النادي (المستوى 10) - جميع الصلاحيات
INSERT INTO public.role_permissions (role_id, permission_id, scope, granted_by)
SELECT 
    r.id,
    p.id,
    'all',
    NULL
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_level = 10
AND p.module = 'website'
ON CONFLICT DO NOTHING;

-- 3.2 رئيس مجلس الإدارة (المستوى 9) - جميع الصلاحيات
INSERT INTO public.role_permissions (role_id, permission_id, scope, granted_by)
SELECT 
    r.id,
    p.id,
    'all',
    NULL
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_level = 9
AND p.module = 'website'
ON CONFLICT DO NOTHING;

-- 3.3 قائد لجنة الموارد البشرية والجودة (المستوى 8) - جميع الصلاحيات
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
AND p.module = 'website'
ON CONFLICT DO NOTHING;

-- 3.4 عضو إداري (المستوى 7) - صلاحيات الإدارة الكاملة
INSERT INTO public.role_permissions (role_id, permission_id, scope, granted_by)
SELECT 
    r.id,
    p.id,
    'all',
    NULL
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_level = 7
AND p.module = 'website'
ON CONFLICT DO NOTHING;

-- 3.5 قائد لجنة (المستوى 6) - عرض فقط
INSERT INTO public.role_permissions (role_id, permission_id, scope, granted_by)
SELECT 
    r.id,
    p.id,
    'all',
    NULL
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_level = 6
AND p.permission_key LIKE 'website.%.view'
ON CONFLICT DO NOTHING;
