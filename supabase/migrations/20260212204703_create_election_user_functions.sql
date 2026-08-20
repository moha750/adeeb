-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260212204703   الاسم: create_election_user_functions

-- دالة للتحقق إذا صوّت المستخدم الحالي
CREATE OR REPLACE FUNCTION has_user_voted(p_election_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM election_votes
        WHERE election_id = p_election_id
        AND voter_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة للحصول على ترشح المستخدم الحالي
CREATE OR REPLACE FUNCTION get_my_candidacy(p_election_id UUID)
RETURNS TABLE (
    id UUID,
    status TEXT,
    nomination_file_url TEXT,
    rejection_reason TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ec.id,
        ec.status,
        ec.nomination_file_url,
        ec.rejection_reason,
        ec.submitted_at
    FROM election_candidates ec
    WHERE ec.election_id = p_election_id
    AND ec.member_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
