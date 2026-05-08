-- =============================================
-- نظام الانتخابات — 33: إصلاح سياسة قراءة ملفات المرشحين للناخب
-- =============================================
-- المشكلة: السياسة election_files_select_voter كانت تعمل EXISTS على
-- election_candidates، لكن RLS لهذا الجدول تمنع الناخب العادي من
-- رؤية صفوف المرشحين الآخرين، فيعود EXISTS بـ false → التوقيع يفشل.
-- الحل: نقل الفحص إلى دالة SECURITY DEFINER تتجاوز RLS.
-- =============================================

CREATE OR REPLACE FUNCTION public.can_voter_read_election_file(p_user UUID, p_obj_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM election_candidates ec
        JOIN elections e ON e.id = ec.election_id
        WHERE ec.status = 'approved'
          AND e.status = ANY (ARRAY['voting_open','voting_closed','completed','cancelled'])
          AND ec.file_url IS NOT NULL
          AND POSITION(p_obj_name IN ec.file_url) > 0
          AND is_user_eligible_to_vote(p_user, e.id)
    );
$$;

GRANT EXECUTE ON FUNCTION public.can_voter_read_election_file(UUID, TEXT) TO authenticated;

DROP POLICY IF EXISTS election_files_select_voter ON storage.objects;

CREATE POLICY election_files_select_voter ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'election-files'
        AND can_voter_read_election_file(auth.uid(), name)
    );
