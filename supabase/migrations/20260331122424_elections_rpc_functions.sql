-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260331122424   الاسم: elections_rpc_functions


CREATE OR REPLACE FUNCTION get_vote_weight(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_weight NUMERIC(3,1) := 1.0;
BEGIN
    SELECT COALESCE(MAX(evw.weight), 1.0)
    INTO v_weight
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    JOIN election_vote_weights evw ON evw.role_name = r.role_name
    WHERE ur.user_id = p_user_id
      AND ur.is_active = true;
    RETURN v_weight;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_election_results(p_election_id UUID)
RETURNS TABLE (
    candidate_id UUID,
    user_id UUID,
    full_name TEXT,
    avatar_url TEXT,
    candidacy_statement TEXT,
    total_weighted_votes NUMERIC,
    vote_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ec.id AS candidate_id,
        ec.user_id,
        p.full_name,
        p.avatar_url,
        ec.candidacy_statement,
        COALESCE(SUM(ev.vote_weight), 0) AS total_weighted_votes,
        COUNT(ev.id) AS vote_count
    FROM election_candidates ec
    JOIN profiles p ON ec.user_id = p.id
    LEFT JOIN election_votes ev ON ev.candidate_id = ec.id
    WHERE ec.election_id = p_election_id
      AND ec.status = 'approved'
    GROUP BY ec.id, ec.user_id, p.full_name, p.avatar_url, ec.candidacy_statement
    ORDER BY total_weighted_votes DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

