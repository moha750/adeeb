-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260331122619   الاسم: elections_permissions


INSERT INTO permissions (permission_key, permission_name_ar, category, description)
VALUES
    ('manage_elections', 'إدارة الانتخابات', 'elections', 'إنشاء وتعديل وإدارة الانتخابات'),
    ('view_elections', 'عرض الانتخابات', 'elections', 'عرض قائمة الانتخابات والتفاصيل'),
    ('approve_candidates', 'الموافقة على المرشحين', 'elections', 'قبول أو رفض طلبات الترشح'),
    ('vote_in_elections', 'التصويت في الانتخابات', 'elections', 'التصويت للمرشحين'),
    ('view_election_results', 'عرض نتائج الانتخابات', 'elections', 'عرض نتائج التصويت')
ON CONFLICT (permission_key) DO NOTHING;

-- رئيس النادي والمستشار والرئيس التنفيذي: جميع صلاحيات الانتخابات
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.role_name IN ('club_president', 'president_advisor', 'executive_council_president')
  AND p.category = 'elections'
ON CONFLICT DO NOTHING;

-- قائد وعضو الموارد البشرية
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.role_name IN ('hr_committee_leader', 'hr_admin_member')
  AND p.permission_key IN ('manage_elections', 'approve_candidates', 'view_elections', 'vote_in_elections', 'view_election_results')
ON CONFLICT DO NOTHING;

-- قائد وعضو الضمان والجودة
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.role_name IN ('qa_committee_leader', 'qa_admin_member')
  AND p.permission_key IN ('view_elections', 'vote_in_elections', 'view_election_results')
ON CONFLICT DO NOTHING;

-- رؤساء الأقسام وقادة اللجان ونوابهم
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.role_name IN ('department_head', 'committee_leader', 'deputy_committee_leader')
  AND p.permission_key IN ('view_elections', 'vote_in_elections', 'view_election_results')
ON CONFLICT DO NOTHING;

-- الأعضاء: عرض + تصويت
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.role_name = 'committee_member'
  AND p.permission_key IN ('view_elections', 'vote_in_elections')
ON CONFLICT DO NOTHING;

