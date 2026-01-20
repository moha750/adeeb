-- منح صلاحيات العضوية للمستخدم الحالي (للاختبار)
-- هذا السكريبت يمنح صلاحيات العضوية مباشرة للمستخدمين الإداريين

-- الطريقة 1: منح الصلاحيات لجميع المستخدمين الذين لديهم دور admin أو moderator
INSERT INTO user_specific_permissions (user_id, permission_id, is_granted, granted_at, notes)
SELECT 
    ur.user_id,
    p.id,
    true,
    NOW(),
    'Auto-granted for membership management'
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
CROSS JOIN permissions p
WHERE r.role_name IN ('admin', 'moderator')
AND p.module = 'membership'
AND ur.is_active = true
ON CONFLICT (user_id, permission_id, scope) 
DO UPDATE SET 
    is_granted = true,
    granted_at = NOW();

-- تعليق توضيحي
COMMENT ON TABLE user_specific_permissions IS 'صلاحيات خاصة للمستخدمين - تم منح صلاحيات العضوية للإداريين';
