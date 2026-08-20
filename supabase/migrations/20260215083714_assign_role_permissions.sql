-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260215083714   الاسم: assign_role_permissions


-- ربط الصلاحيات بالمناصب
-- رئيس النادي (id=1): جميع الصلاحيات
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions
ON CONFLICT DO NOTHING;

-- مستشار الرئيس (id=22): معظم الصلاحيات
INSERT INTO role_permissions (role_id, permission_id)
SELECT 22, id FROM permissions WHERE permission_key NOT IN ('manage_positions')
ON CONFLICT DO NOTHING;

-- قائد الموارد البشرية (id=2): صلاحيات الانتخابات والعضوية
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE category IN ('elections', 'membership') OR permission_key IN ('impersonate_users', 'manage_member_data')
ON CONFLICT DO NOTHING;

-- قائد الضمان والجودة (id=3): صلاحيات الجودة فقط (لا انتخابات)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions WHERE permission_key IN ('view_applications', 'view_election_results', 'cast_vote')
ON CONFLICT DO NOTHING;

-- رئيس المجلس التنفيذي (id=6): صلاحيات الانتخابات والأخبار
INSERT INTO role_permissions (role_id, permission_id)
SELECT 6, id FROM permissions WHERE category IN ('elections', 'news') OR permission_key IN ('view_applications', 'approve_applications', 'manage_committees')
ON CONFLICT DO NOTHING;

-- قائد لجنة (id=7): صلاحيات إدارة أعضاء اللجنة
INSERT INTO role_permissions (role_id, permission_id)
SELECT 7, id FROM permissions WHERE permission_key IN ('manage_committee_members', 'view_applications', 'cast_vote', 'view_election_results', 'nominate_self')
ON CONFLICT DO NOTHING;

-- نائب قائد لجنة (id=8): صلاحيات محدودة
INSERT INTO role_permissions (role_id, permission_id)
SELECT 8, id FROM permissions WHERE permission_key IN ('manage_committee_members', 'cast_vote', 'view_election_results', 'nominate_self')
ON CONFLICT DO NOTHING;

-- عضو لجنة (id=9): صلاحيات أساسية
INSERT INTO role_permissions (role_id, permission_id)
SELECT 9, id FROM permissions WHERE permission_key IN ('nominate_self', 'cast_vote', 'view_election_results')
ON CONFLICT DO NOTHING;

-- سياسات RLS للجداول الجديدة
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- السماح للجميع بقراءة الصلاحيات
DROP POLICY IF EXISTS permissions_select_all ON permissions;
CREATE POLICY permissions_select_all ON permissions FOR SELECT USING (true);

-- السماح للجميع بقراءة ربط الصلاحيات
DROP POLICY IF EXISTS role_permissions_select_all ON role_permissions;
CREATE POLICY role_permissions_select_all ON role_permissions FOR SELECT USING (true);

-- السماح لرئيس النادي فقط بتعديل الصلاحيات
DROP POLICY IF EXISTS permissions_admin_all ON permissions;
CREATE POLICY permissions_admin_all ON permissions FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_name = 'club_president'
    )
);

DROP POLICY IF EXISTS role_permissions_admin_all ON role_permissions;
CREATE POLICY role_permissions_admin_all ON role_permissions FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_name = 'club_president'
    )
);

