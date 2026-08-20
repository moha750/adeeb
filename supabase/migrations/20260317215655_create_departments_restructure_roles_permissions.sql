-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260317215655   الاسم: create_departments_restructure_roles_permissions


-- ============================================================
-- المرحلة 1: إنشاء جدول الأقسام التنفيذية
-- ============================================================

CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name_ar TEXT NOT NULL UNIQUE,
    name_en TEXT NOT NULL UNIQUE,
    description TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO departments (id, name_ar, name_en, description, display_order) VALUES
(1, 'قسم الإنتاج الإعلامي',  'Media Production',    'مسؤول عن التصوير والتسويق والتصميم',        1),
(2, 'قسم التواصل المجتمعي',  'Community Outreach',  'مسؤول عن الفعاليات والسفراء',               2),
(3, 'قسم صناعة المحتوى',     'Content Creation',    'مسؤول عن التأليف والرواة',                   3),
(4, 'قسم نظم المعلومات',     'Information Systems', 'مسؤول عن التقارير والأرشفة والبرمجة',       4)
ON CONFLICT (id) DO NOTHING;

SELECT setval('departments_id_seq', 10);

-- ============================================================
-- المرحلة 2: ربط اللجان بأقسامها
-- ============================================================

ALTER TABLE committees
ADD COLUMN IF NOT EXISTS department_id INT REFERENCES departments(id);

COMMENT ON COLUMN committees.department_id IS 'القسم التنفيذي الذي تنتمي إليه اللجنة (NULL للجان الإدارية كـ HR و QA)';

-- قسم الإنتاج الإعلامي
UPDATE committees SET department_id = 1 WHERE id IN (5, 7, 6);
-- قسم التواصل المجتمعي
UPDATE committees SET department_id = 2 WHERE id IN (1, 4);
-- قسم صناعة المحتوى
UPDATE committees SET department_id = 3 WHERE id IN (3, 2);
-- قسم نظم المعلومات
UPDATE committees SET department_id = 4 WHERE id IN (18, 24);
-- لجنة HR (22) ولجنة QA (23): department_id = NULL (إدارية)

-- ============================================================
-- المرحلة 3: إضافة council_type لجدول roles
-- ============================================================

ALTER TABLE roles
ADD COLUMN IF NOT EXISTS council_type TEXT
    DEFAULT 'executive'
    CHECK (council_type IN ('administrative', 'executive', 'both'));

COMMENT ON COLUMN roles.council_type IS 'نوع المجلس: administrative=إداري، executive=تنفيذي، both=كلاهما';

UPDATE roles SET council_type = 'both'           WHERE id = 1;
UPDATE roles SET council_type = 'administrative' WHERE id IN (22, 2, 3, 4, 5);
UPDATE roles SET council_type = 'executive'      WHERE id IN (6, 7, 8, 9);

-- ============================================================
-- المرحلة 4: إضافة دور رئيس القسم
-- ============================================================

INSERT INTO roles (id, role_name, role_name_ar, role_level, role_category, description, council_type)
VALUES (10, 'department_head', 'رئيس قسم', 7, 'committee', 'رئيس قسم تنفيذي - مسؤول عن إدارة قسمه الذي يضم عدة لجان', 'executive')
ON CONFLICT (id) DO UPDATE
    SET role_name    = EXCLUDED.role_name,
        role_name_ar = EXCLUDED.role_name_ar,
        role_level   = EXCLUDED.role_level,
        role_category= EXCLUDED.role_category,
        description  = EXCLUDED.description,
        council_type = EXCLUDED.council_type;

-- ============================================================
-- المرحلة 5: تصحيح role_levels
-- ============================================================

-- رئيس المجلس التنفيذي يرتفع من 6 إلى 8 (مساوٍ لـ HR/QA leaders)
UPDATE roles SET role_level = 8 WHERE id = 6;
-- قائد لجنة يرتفع من 5 إلى 6
UPDATE roles SET role_level = 6 WHERE id = 7;
-- نائب قائد لجنة يبقى 5
UPDATE roles SET role_level = 5 WHERE id = 8;
-- رئيس القسم = 7 (بين رئيس المجلس وقائد اللجنة)

-- ============================================================
-- المرحلة 6: إضافة department_id لجدول user_roles
-- ============================================================

ALTER TABLE user_roles
ADD COLUMN IF NOT EXISTS department_id INT REFERENCES departments(id);

COMMENT ON COLUMN user_roles.department_id IS 'القسم المرتبط (لرؤساء الأقسام فقط)';

-- ============================================================
-- المرحلة 7: إضافة صلاحيات الأقسام الجديدة
-- ============================================================

INSERT INTO permissions (permission_key, permission_name_ar, description, category) VALUES
('manage_department',       'إدارة القسم',        'إدارة قسم تنفيذي وجميع لجانه',        'membership'),
('view_department_reports', 'عرض تقارير القسم',   'الاطلاع على تقارير ومعلومات القسم',    'membership')
ON CONFLICT (permission_key) DO NOTHING;

-- ============================================================
-- المرحلة 8: إعادة توزيع role_permissions بالكامل
-- ============================================================

DELETE FROM role_permissions;

-- رئيس النادي (id=1): كل الصلاحيات
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- مستشار الرئيس (id=22): كل شيء ما عدا manage_positions و impersonate_users
INSERT INTO role_permissions (role_id, permission_id)
SELECT 22, id FROM permissions
WHERE permission_key NOT IN ('manage_positions', 'impersonate_users');

-- قائد HR (id=2): صلاحيات الموارد البشرية والعضوية الكاملة + إشراف
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions
WHERE permission_key IN (
    'manage_member_data','manage_committee_members','manage_committees',
    'manage_registration','approve_applications','gift_membership','view_applications',
    'manage_elections','open_election','manage_voting','review_candidates',
    'view_election_results','nominate_self','cast_vote',
    'manage_surveys','view_watchtower','manage_notifications',
    'manage_department','view_department_reports'
);

-- قائد QA (id=3): صلاحيات الجودة والمراقبة
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions
WHERE permission_key IN (
    'manage_member_data','view_applications','manage_surveys',
    'view_election_results','cast_vote','nominate_self',
    'view_watchtower','manage_notifications','view_department_reports'
);

-- عضو إداري HR (id=4): إشرافي محدود على لجنة معينة
INSERT INTO role_permissions (role_id, permission_id)
SELECT 4, id FROM permissions
WHERE permission_key IN (
    'manage_committee_members','view_applications','approve_applications',
    'manage_surveys','view_election_results','nominate_self','cast_vote',
    'view_department_reports'
);

-- عضو إداري QA (id=5): مراقبة على لجنة معينة
INSERT INTO role_permissions (role_id, permission_id)
SELECT 5, id FROM permissions
WHERE permission_key IN (
    'view_applications','manage_surveys',
    'view_election_results','nominate_self','cast_vote',
    'view_department_reports'
);

-- رئيس المجلس التنفيذي (id=6): يدير كل التنفيذي
INSERT INTO role_permissions (role_id, permission_id)
SELECT 6, id FROM permissions
WHERE permission_key IN (
    'manage_committee_members','manage_committees','manage_registration',
    'approve_applications','view_applications',
    'manage_elections','open_election','manage_voting','review_candidates',
    'view_election_results','nominate_self','cast_vote',
    'manage_news','publish_news','instant_publish',
    'manage_surveys','manage_notifications',
    'manage_department','view_department_reports'
);

-- رئيس القسم (id=10): يدير قسمه فقط
INSERT INTO role_permissions (role_id, permission_id)
SELECT 10, id FROM permissions
WHERE permission_key IN (
    'manage_committee_members','view_applications',
    'view_election_results','nominate_self','cast_vote',
    'manage_surveys','manage_department','view_department_reports'
);

-- قائد لجنة (id=7): يدير لجنته فقط
INSERT INTO role_permissions (role_id, permission_id)
SELECT 7, id FROM permissions
WHERE permission_key IN (
    'manage_committee_members','view_applications',
    'view_election_results','nominate_self','cast_vote',
    'manage_surveys'
);

-- نائب قائد لجنة (id=8): يساعد القائد
INSERT INTO role_permissions (role_id, permission_id)
SELECT 8, id FROM permissions
WHERE permission_key IN (
    'manage_committee_members',
    'view_election_results','nominate_self','cast_vote',
    'manage_surveys'
);

-- عضو لجنة (id=9): صلاحيات أساسية فقط
INSERT INTO role_permissions (role_id, permission_id)
SELECT 9, id FROM permissions
WHERE permission_key IN (
    'view_election_results','nominate_self','cast_vote'
);

-- ============================================================
-- تعليقات التوثيق
-- ============================================================

COMMENT ON TABLE departments IS 'الأقسام التنفيذية لنادي أدِيب - كل قسم يضم عدة لجان';
COMMENT ON TABLE roles IS 'مناصب أعضاء نادي أدِيب مع نوع المجلس والمستوى الهرمي';

