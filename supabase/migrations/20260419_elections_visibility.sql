-- =============================================
-- تقييد رؤية الانتخابات حسب اللجنة/القسم
-- كل عضو يرى فقط انتخابات لجنته وقسمه الأب
-- =============================================

-- 1) إضافة العمود target_department_id إن لم يكن موجوداً
ALTER TABLE elections
    ADD COLUMN IF NOT EXISTS target_department_id INTEGER REFERENCES departments(id);

CREATE INDEX IF NOT EXISTS idx_elections_target_department
    ON elections(target_department_id);

-- 2) استبدال elections_select بسياسة مُقيّدة
DROP POLICY IF EXISTS "elections_select" ON elections;

CREATE POLICY "elections_select" ON elections
    FOR SELECT TO authenticated
    USING (
        -- أ) المسودّة: للمُنشئ فقط
        (status = 'draft' AND created_by = auth.uid())
        OR (status != 'draft' AND (
            -- ب) الأدمن ولجان المجلس الإداري (HR/QA) يرون الكل
            EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = auth.uid()
                  AND ur.is_active = true
                  AND (r.role_level >= 9
                       OR r.role_name IN ('hr_committee_leader','hr_admin_member',
                                          'qa_committee_leader','qa_admin_member'))
            )
            -- ج) عضو اللجنة المستهدفة يرى انتخابها
            OR (
                target_committee_id IS NOT NULL
                AND EXISTS (
                    SELECT 1 FROM user_roles ur
                    WHERE ur.user_id = auth.uid()
                      AND ur.is_active = true
                      AND ur.committee_id = elections.target_committee_id
                )
            )
            -- د) عضو اللجنة يرى انتخاب رئيس قسمه الأب
            OR (
                target_department_id IS NOT NULL
                AND EXISTS (
                    SELECT 1 FROM user_roles ur
                    JOIN committees c ON c.id = ur.committee_id
                    WHERE ur.user_id = auth.uid()
                      AND ur.is_active = true
                      AND c.department_id = elections.target_department_id
                )
            )
            -- ه) رئيس القسم يرى انتخاب منصبه
            OR (
                target_department_id IS NOT NULL
                AND EXISTS (
                    SELECT 1 FROM user_roles ur
                    WHERE ur.user_id = auth.uid()
                      AND ur.is_active = true
                      AND ur.department_id = elections.target_department_id
                )
            )
            -- و) رئيس القسم يرى انتخابات قادة/نواب لجان قسمه
            OR (
                target_committee_id IS NOT NULL
                AND EXISTS (
                    SELECT 1 FROM user_roles ur
                    JOIN committees c ON c.id = elections.target_committee_id
                    WHERE ur.user_id = auth.uid()
                      AND ur.is_active = true
                      AND ur.department_id IS NOT NULL
                      AND ur.department_id = c.department_id
                )
            )
            -- ز) المرشّح يرى الانتخاب الذي رُشّح فيه دائماً
            OR EXISTS (
                SELECT 1 FROM election_candidates ec
                WHERE ec.election_id = elections.id
                  AND ec.user_id = auth.uid()
            )
        ))
    );
