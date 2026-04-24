-- =============================================
-- نظام الانتخابات — 02: الصلاحيات والربط بالأدوار
-- =============================================

-- 1) إضافة الصلاحيات الثلاث
INSERT INTO permissions (permission_key, permission_name_ar, category, description) VALUES
    ('manage_elections',         'إدارة الانتخابات',      'elections', 'إنشاء وإغلاق ومراجعة الانتخابات وإعلان الفوز'),
    ('view_election_candidates', 'عرض مرشحي الانتخابات',  'elections', 'رؤية قائمة المرشحين وبياناتهم دون أي إجراءات'),
    ('run_for_election',         'الترشح للانتخابات',     'elections', 'تقديم طلب ترشح لمنصب مؤهل')
ON CONFLICT (permission_key) DO NOTHING;

-- 2) ربط الصلاحيات بالأدوار
-- (أ) manage_elections → club_president, executive_council_president, hr_committee_leader
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE p.permission_key = 'manage_elections'
  AND r.role_name IN ('club_president','executive_council_president','hr_committee_leader')
ON CONFLICT DO NOTHING;

-- (ب) view_election_candidates → president_advisor, hr_admin_member
-- + لأدوار manage_elections أيضاً (ليروا ما يراجعونه)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE p.permission_key = 'view_election_candidates'
  AND r.role_name IN (
      'club_president','executive_council_president','hr_committee_leader',
      'president_advisor','hr_admin_member'
  )
ON CONFLICT DO NOTHING;

-- (ج) run_for_election → أعضاء اللجان الحاليين (الأهلية الفعلية تتحقق من trigger)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE p.permission_key = 'run_for_election'
  AND r.role_name IN (
      'committee_member','deputy_committee_leader','committee_leader','department_head'
  )
ON CONFLICT DO NOTHING;

-- QA (qa_committee_leader, qa_admin_member) لا تحصل على أي صلاحية انتخابية بشكل صريح.
