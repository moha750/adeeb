-- =============================================
-- دالة عدّ الانتخابات المؤهّل لها المستخدم
-- تطبّق نفس قواعد trg_enforce_candidacy_eligibility
-- تُستخدم لإخفاء/إظهار تبويب «ترشّح» في القائمة الجانبية
-- =============================================

CREATE OR REPLACE FUNCTION count_eligible_elections(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT COUNT(*)::INTEGER
      FROM elections e
      JOIN roles target_role ON e.target_role_id = target_role.id
     WHERE e.status = 'candidacy_open'
       -- (1) عضوية الوحدة المستهدفة
       AND (
           (e.target_committee_id IS NOT NULL AND EXISTS (
               SELECT 1 FROM user_roles ur
                WHERE ur.user_id      = p_user_id
                  AND ur.is_active    = true
                  AND ur.committee_id = e.target_committee_id
           ))
           OR (e.target_committee_id IS NULL AND e.target_department_id IS NOT NULL AND EXISTS (
               SELECT 1 FROM user_roles ur
                WHERE ur.user_id       = p_user_id
                  AND ur.is_active     = true
                  AND ur.department_id = e.target_department_id
           ))
       )
       -- (2) أصحاب المناصب العليا ممنوعون
       AND NOT EXISTS (
           SELECT 1 FROM user_roles ur
             JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id   = p_user_id
              AND ur.is_active = true
              AND r.role_name IN (
                  'club_president',
                  'president_advisor',
                  'executive_council_president',
                  'hr_committee_leader',
                  'qa_committee_leader',
                  'hr_admin_member',
                  'qa_admin_member'
              )
       )
       -- (3) قائد اللجنة → نائب نفس اللجنة
       AND NOT (
           target_role.role_name = 'deputy_committee_leader'
           AND e.target_committee_id IS NOT NULL
           AND EXISTS (
               SELECT 1 FROM user_roles ur
                 JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id      = p_user_id
                  AND ur.is_active    = true
                  AND r.role_name     = 'committee_leader'
                  AND ur.committee_id = e.target_committee_id
           )
       )
       -- (4) رئيس القسم → لجنة تتبع قسمه
       AND NOT (
           target_role.role_name IN ('committee_leader', 'deputy_committee_leader')
           AND e.target_committee_id IS NOT NULL
           AND EXISTS (
               SELECT 1 FROM user_roles ur
                 JOIN roles r ON ur.role_id = r.id
                 JOIN committees c ON c.id = e.target_committee_id
                WHERE ur.user_id       = p_user_id
                  AND ur.is_active     = true
                  AND r.role_name      = 'department_head'
                  AND ur.department_id = c.department_id
           )
       )
       -- (5) لا يوجد طلب ترشح نشط آخر
       AND NOT EXISTS (
           SELECT 1 FROM election_candidates ec
             JOIN elections e2 ON ec.election_id = e2.id
            WHERE ec.user_id = p_user_id
              AND ec.status IN ('pending', 'needs_edit', 'approved')
              AND e2.status NOT IN ('completed', 'cancelled')
              AND e2.id != e.id
       );
$$;

GRANT EXECUTE ON FUNCTION count_eligible_elections(UUID) TO authenticated;
