-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260508030320   الاسم: candidates_with_identity_allow_competitors

CREATE OR REPLACE FUNCTION public.get_candidates_with_identity(p_election uuid)
 RETURNS TABLE(candidate_id uuid, candidate_number integer, user_id uuid, full_name text, username text, avatar_url text, statement_ar text, file_url text, file_name text, file_size_bytes integer, file_mime text, status text, review_note_ar text, reviewed_by uuid, reviewed_at timestamp with time zone, withdrawn_at timestamp with time zone, submitted_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT has_election_admin_permission(auth.uid())
       AND NOT has_election_view_permission(auth.uid(), p_election)
       AND NOT EXISTS (
           SELECT 1 FROM election_candidates
           WHERE election_id = p_election AND user_id = auth.uid()
       ) THEN
        RAISE EXCEPTION 'غير مصرح برؤية بيانات المرشحين';
    END IF;

    RETURN QUERY
    SELECT
        ec.id,
        ec.candidate_number,
        ec.user_id,
        p.full_name,
        p.username,
        p.avatar_url,
        ec.statement_ar,
        ec.file_url,
        ec.file_name,
        ec.file_size_bytes,
        ec.file_mime,
        ec.status,
        ec.review_note_ar,
        ec.reviewed_by,
        ec.reviewed_at,
        ec.withdrawn_at,
        ec.submitted_at,
        ec.updated_at
    FROM election_candidates ec
    JOIN profiles p ON p.id = ec.user_id
    WHERE ec.election_id = p_election
    ORDER BY ec.candidate_number;
END;
$function$;
