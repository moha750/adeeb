-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260214130103   الاسم: create_elections_rls_policies


-- =====================================================
-- سياسات RLS لنظام الانتخابات
-- =====================================================

-- سياسات جدول elections
-- القراءة: الجميع يمكنهم رؤية الانتخابات غير الملغاة
CREATE POLICY "elections_select_all" ON elections FOR SELECT
USING (status != 'cancelled');

-- الإنشاء: المسؤولون فقط (رئيس النادي، الرئيس التنفيذي، قائد الموارد البشرية)
CREATE POLICY "elections_insert_admins" ON elections FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('club_president', 'administrative_council_president', 'hr_committee_leader')
    )
);

-- التحديث: المسؤولون فقط
CREATE POLICY "elections_update_admins" ON elections FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('club_president', 'administrative_council_president', 'hr_committee_leader')
    )
);

-- سياسات جدول election_candidates
-- القراءة: الجميع يمكنهم رؤية المرشحين المقبولين، المرشح يرى طلبه، المسؤولون يرون الكل
CREATE POLICY "candidates_select_policy" ON election_candidates FOR SELECT
USING (
    status = 'approved'
    OR user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('club_president', 'administrative_council_president', 'hr_committee_leader')
    )
);

-- الإنشاء: أعضاء اللجنة المعنية فقط أثناء فترة الترشح
CREATE POLICY "candidates_insert_committee_members" ON election_candidates FOR INSERT
WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM elections e
        JOIN member_details md ON md.committee_id = e.committee_id
        WHERE e.id = election_id
        AND md.user_id = auth.uid()
        AND e.status = 'nomination_open'
    )
);

-- التحديث: المسؤولون فقط (لمراجعة الطلبات)
CREATE POLICY "candidates_update_admins" ON election_candidates FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('club_president', 'administrative_council_president', 'hr_committee_leader')
    )
);

-- سياسات جدول election_votes
-- القراءة: المصوت يرى صوته فقط، المسؤولون يرون الكل
CREATE POLICY "votes_select_policy" ON election_votes FOR SELECT
USING (
    voter_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('club_president', 'administrative_council_president', 'hr_committee_leader')
    )
);

-- الإنشاء: أعضاء اللجنة المعنية فقط أثناء فترة التصويت
CREATE POLICY "votes_insert_committee_members" ON election_votes FOR INSERT
WITH CHECK (
    voter_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM elections e
        JOIN member_details md ON md.committee_id = e.committee_id
        WHERE e.id = election_id
        AND md.user_id = auth.uid()
        AND e.status = 'voting_open'
        AND now() <= e.voting_end_date
    )
    AND EXISTS (
        SELECT 1 FROM election_candidates ec
        WHERE ec.id = candidate_id
        AND ec.election_id = election_id
        AND ec.status = 'approved'
    )
);

-- سياسات جدول election_activity_log
-- القراءة: المسؤولون فقط
CREATE POLICY "activity_log_select_admins" ON election_activity_log FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('club_president', 'administrative_council_president', 'hr_committee_leader')
    )
);

-- الإنشاء: النظام والمسؤولون
CREATE POLICY "activity_log_insert_all" ON election_activity_log FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

