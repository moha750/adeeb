-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260327020238   الاسم: fix_election_votes_rls_policies


-- Drop and recreate the INSERT policy with the self-referencing bug fixed
DROP POLICY IF EXISTS "votes_insert_committee_members" ON election_votes;

CREATE POLICY "votes_insert_committee_members" ON election_votes
FOR INSERT
WITH CHECK (
    (voter_id = auth.uid())
    AND (EXISTS (
        SELECT 1
        FROM elections e
        JOIN member_details md ON (md.committee_id = e.committee_id)
        WHERE e.id = election_votes.election_id
          AND md.user_id = auth.uid()
          AND e.status = 'voting_open'
          AND now() <= e.voting_end_date
    ))
    AND (EXISTS (
        SELECT 1
        FROM election_candidates ec
        WHERE ec.id = election_votes.candidate_id
          AND ec.election_id = election_votes.election_id
          AND ec.status = 'approved'
    ))
);

