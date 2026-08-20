-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260212204654   الاسم: create_election_helper_functions

-- دالة لعرض عدد الأصوات لكل مرشح (متاحة للجميع)
CREATE OR REPLACE FUNCTION get_election_vote_counts(p_election_id UUID)
RETURNS TABLE (
    candidate_id UUID,
    member_id UUID,
    full_name TEXT,
    vote_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ec.id as candidate_id,
        ec.member_id,
        p.full_name,
        COUNT(ev.id)::BIGINT as vote_count
    FROM election_candidates ec
    JOIN profiles p ON ec.member_id = p.id
    LEFT JOIN election_votes ev ON ec.id = ev.candidate_id
    WHERE ec.election_id = p_election_id
    AND ec.status = 'approved'
    GROUP BY ec.id, ec.member_id, p.full_name
    ORDER BY vote_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
