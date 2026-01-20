-- إضافة صلاحيات إدارة العضوية
INSERT INTO permissions (permission_key, permission_name_ar, permission_name_en, description, module, created_at) VALUES
('membership.view', 'عرض طلبات العضوية', 'View Membership Applications', 'القدرة على عرض وقراءة طلبات التسجيل في العضوية', 'membership', NOW()),
('membership.manage', 'إدارة طلبات العضوية', 'Manage Membership Applications', 'القدرة على مراجعة وقبول ورفض طلبات العضوية', 'membership', NOW()),
('membership.delete', 'حذف طلبات العضوية', 'Delete Membership Applications', 'القدرة على حذف طلبات العضوية', 'membership', NOW()),
('membership.settings', 'إعدادات التسجيل', 'Membership Settings', 'القدرة على التحكم في فتح وإغلاق باب التسجيل', 'membership', NOW()),
('membership.export', 'تصدير بيانات العضوية', 'Export Membership Data', 'القدرة على تصدير بيانات طلبات العضوية', 'membership', NOW())
ON CONFLICT (permission_key) DO NOTHING;

-- منح صلاحيات إدارة العضوية لدور المدير (admin)
INSERT INTO role_permissions (role_id, permission_id, granted_at)
SELECT r.id, p.id, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'admin'
AND p.module = 'membership'
ON CONFLICT (role_id, permission_id, scope) DO NOTHING;

-- منح صلاحيات عرض العضوية لدور المشرف (moderator)
INSERT INTO role_permissions (role_id, permission_id, granted_at)
SELECT r.id, p.id, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'moderator'
AND p.permission_key IN ('membership.view', 'membership.manage')
ON CONFLICT (role_id, permission_id, scope) DO NOTHING;

-- تعليقات توضيحية
COMMENT ON TABLE permissions IS 'جدول الصلاحيات - يتضمن صلاحيات إدارة العضوية';
