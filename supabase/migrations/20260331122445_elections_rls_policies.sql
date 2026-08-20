-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260331122445   الاسم: elections_rls_policies


ALTER TABLE elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_vote_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vote_weights_select" ON election_vote_weights
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "elections_select" ON elections
    FOR SELECT TO authenticated
    USING (status != 'draft' OR created_by = auth.uid());

CREATE POLICY "elections_admin_insert" ON elections
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND ur.is_active = true
              AND (r.role_level >= 9 OR r.role_name IN ('hr_committee_leader','hr_admin_member'))
        )
    );

CREATE POLICY "elections_admin_update" ON elections
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND ur.is_active = true
              AND (r.role_level >= 9 OR r.role_name IN ('hr_committee_leader','hr_admin_member'))
        )
    );

CREATE POLICY "elections_admin_delete" ON elections
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND ur.is_active = true
              AND (r.role_level >= 9 OR r.role_name IN ('hr_committee_leader','hr_admin_member'))
        )
    );

CREATE POLICY "candidates_select" ON election_candidates
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "candidates_insert_own" ON election_candidates
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "candidates_admin_update" ON election_candidates
    FOR UPDATE TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND ur.is_active = true
              AND (r.role_level >= 9 OR r.role_name IN ('hr_committee_leader','hr_admin_member'))
        )
    );

CREATE POLICY "votes_insert_own" ON election_votes
    FOR INSERT TO authenticated
    WITH CHECK (voter_id = auth.uid());

CREATE POLICY "votes_select" ON election_votes
    FOR SELECT TO authenticated
    USING (
        voter_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND ur.is_active = true
              AND r.role_level >= 9
        )
    );

