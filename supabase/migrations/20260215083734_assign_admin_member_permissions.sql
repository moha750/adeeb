-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260215083734   الاسم: assign_admin_member_permissions


-- عضو إداري في الموارد البشرية (id=4)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 4, id FROM permissions WHERE permission_key IN ('view_applications', 'approve_applications', 'cast_vote', 'view_election_results', 'nominate_self')
ON CONFLICT DO NOTHING;

-- عضو إداري في الضمان والجودة (id=5)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 5, id FROM permissions WHERE permission_key IN ('view_applications', 'cast_vote', 'view_election_results', 'nominate_self')
ON CONFLICT DO NOTHING;

