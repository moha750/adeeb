-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260317221419   الاسم: fix_role_names_and_add_missing_permissions


-- ============================================================
-- 1. تصحيح أسماء الأدوار المتكررة
-- ============================================================
UPDATE roles SET role_name_ar = 'عضو موارد بشرية', role_name = 'hr_admin_member'
WHERE id = 4;

UPDATE roles SET role_name_ar = 'عضو ضمان وجودة', role_name = 'qa_admin_member'
WHERE id = 5;

-- تصحيح اسم رئيس المجلس التنفيذي ليكون دقيقاً
UPDATE roles SET role_name = 'executive_council_president'
WHERE id = 6;

-- ============================================================
-- 2. إضافة الصلاحيات المفقودة التي يستخدمها dashboard.js بـ roleLevel
-- ============================================================
INSERT INTO permissions (permission_key, permission_name_ar, description, category) VALUES
('view_members',          'عرض الأعضاء',             'عرض قائمة أعضاء النادي',                    'membership'),
('view_pending_members',  'عرض الأعضاء المعلقين',    'عرض طلبات العضوية المعلقة',                 'membership'),
('view_site_stats',       'إحصائيات الزيارات',        'عرض إحصائيات زيارات الموقع',                'admin'),
('manage_contact',        'رسائل التواصل',            'عرض ورد رسائل تواصل الموقع',                'admin'),
('manage_newsletter',     'النشرة البريدية',          'إدارة المشتركين في النشرة البريدية',         'admin'),
('manage_interviews',     'المقابلات الشخصية',        'إدارة جلسات المقابلات وتسجيل النتائج',      'membership'),
('view_membership_archives','أرشيف التسجيل',          'عرض أرشيف دورات التسجيل السابقة',           'membership')
ON CONFLICT (permission_key) DO NOTHING;

-- ============================================================
-- 3. توزيع الصلاحيات الجديدة على الأدوار المناسبة
-- ============================================================

-- view_members: المستوى 8+ (رئيس النادي، مستشار، HR/QA قادة، رئيس المجلس التنفيذي)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE p.permission_key = 'view_members'
  AND r.id IN (1, 22, 2, 3, 6)
ON CONFLICT DO NOTHING;

-- view_pending_members: المستوى 7+ (+ رؤساء الأقسام والأعضاء الإداريين)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE p.permission_key = 'view_pending_members'
  AND r.id IN (1, 22, 2, 3, 4, 5, 6, 10)
ON CONFLICT DO NOTHING;

-- view_site_stats: المستوى 6+ (رئيس المجلس التنفيذي فأعلى + قادة اللجان)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE p.permission_key = 'view_site_stats'
  AND r.id IN (1, 22, 2, 3, 6, 7)
ON CONFLICT DO NOTHING;

-- manage_contact: المستوى 7+ (الإداريون وفوقهم)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE p.permission_key = 'manage_contact'
  AND r.id IN (1, 22, 2, 3, 4, 5, 6, 10)
ON CONFLICT DO NOTHING;

-- manage_newsletter: المستوى 7+
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE p.permission_key = 'manage_newsletter'
  AND r.id IN (1, 22, 2, 3, 4, 5, 6, 10)
ON CONFLICT DO NOTHING;

-- manage_interviews: المستوى 7+ (HR قائد + رئيس المجلس التنفيذي + رئيس القسم)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE p.permission_key = 'manage_interviews'
  AND r.id IN (1, 22, 2, 3, 4, 5, 6, 10)
ON CONFLICT DO NOTHING;

-- view_membership_archives: المستوى 7+
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE p.permission_key = 'view_membership_archives'
  AND r.id IN (1, 22, 2, 3, 4, 5, 6, 10)
ON CONFLICT DO NOTHING;

