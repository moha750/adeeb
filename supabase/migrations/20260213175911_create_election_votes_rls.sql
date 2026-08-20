-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260213175911   الاسم: create_election_votes_rls


-- تفعيل RLS على جدول الأصوات
ALTER TABLE election_votes ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: المسؤولين فقط يمكنهم رؤية تفاصيل الأصوات
CREATE POLICY election_votes_select_policy ON election_votes
FOR SELECT USING (
    can_view_vote_details(auth.uid())
    OR
    -- الناخب يمكنه رؤية صوته فقط
    voter_id = auth.uid()
);

-- سياسة الإدراج: أعضاء اللجنة فقط أثناء فترة التصويت
CREATE POLICY election_votes_insert_policy ON election_votes
FOR INSERT WITH CHECK (
    -- المستخدم يصوت بنفسه فقط
    auth.uid() = voter_id
    AND
    -- التحقق من أن الانتخاب في مرحلة التصويت
    EXISTS (
        SELECT 1 FROM elections e
        WHERE e.id = election_id
        AND e.status = 'voting'
        AND now() BETWEEN e.voting_start_date AND e.voting_end_date
        AND is_committee_member(auth.uid(), e.committee_id)
    )
    AND
    -- التحقق من أن المرشح مقبول
    EXISTS (
        SELECT 1 FROM election_candidates ec
        WHERE ec.id = candidate_id
        AND ec.status = 'approved'
    )
);

-- لا يمكن تحديث أو حذف الأصوات
CREATE POLICY election_votes_update_policy ON election_votes
FOR UPDATE USING (false);

CREATE POLICY election_votes_delete_policy ON election_votes
FOR DELETE USING (
    can_manage_elections(auth.uid())
);

