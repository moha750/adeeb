-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260215090015   الاسم: add_surveys_permissions


-- إضافة صلاحية manage_surveys للأدوار المناسبة
-- قائد لجنة (id=7)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 7, id FROM permissions WHERE permission_key = 'manage_surveys'
ON CONFLICT DO NOTHING;

-- نائب قائد لجنة (id=8)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 8, id FROM permissions WHERE permission_key = 'manage_surveys'
ON CONFLICT DO NOTHING;

-- عضو إداري في الموارد البشرية (id=4)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 4, id FROM permissions WHERE permission_key = 'manage_surveys'
ON CONFLICT DO NOTHING;

-- عضو إداري في الضمان والجودة (id=5)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 5, id FROM permissions WHERE permission_key = 'manage_surveys'
ON CONFLICT DO NOTHING;

-- إضافة صلاحية manage_member_data لقائد الموارد البشرية
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE permission_key = 'manage_member_data'
ON CONFLICT DO NOTHING;

-- إضافة صلاحية manage_committees لرئيس المجلس التنفيذي
INSERT INTO role_permissions (role_id, permission_id)
SELECT 6, id FROM permissions WHERE permission_key = 'manage_committees'
ON CONFLICT DO NOTHING;

-- إضافة صلاحية manage_notifications لرئيس النادي ومستشاره
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions WHERE permission_key = 'manage_notifications'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 22, id FROM permissions WHERE permission_key = 'manage_notifications'
ON CONFLICT DO NOTHING;

