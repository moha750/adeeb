-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260212204618   الاسم: create_election_votes_rls_policies

-- ========== سياسات جدول election_votes ==========

-- القراءة: المسؤولون فقط يمكنهم رؤية تفاصيل التصويت (من صوّت لمن)
-- باقي الأعضاء يرون فقط عدد الأصوات عبر دالة منفصلة
CREATE POLICY "election_votes_select_admin" ON election_votes
    FOR SELECT USING (is_election_admin());

-- الإنشاء: أعضاء اللجنة فقط يمكنهم التصويت في انتخابات لجنتهم
CREATE POLICY "election_votes_insert_committee_member" ON election_votes
    FOR INSERT WITH CHECK (
        voter_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM elections e
            WHERE e.id = election_id
            AND is_committee_member(e.committee_id)
            AND e.status = 'voting'
            AND now() BETWEEN e.voting_start_date AND e.voting_end_date
        )
        AND EXISTS (
            SELECT 1 FROM election_candidates ec
            WHERE ec.id = candidate_id
            AND ec.election_id = election_id
            AND ec.status = 'approved'
        )
    );

-- لا يمكن تحديث أو حذف الأصوات
CREATE POLICY "election_votes_no_update" ON election_votes
    FOR UPDATE USING (false);

CREATE POLICY "election_votes_no_delete" ON election_votes
    FOR DELETE USING (false);
