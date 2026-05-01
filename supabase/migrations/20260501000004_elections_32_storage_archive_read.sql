-- =============================================
-- نظام الانتخابات — 32: قراءة ملفات المرشحين بعد الأرشفة
-- =============================================
-- التعديل:
--   • election_files_select_voter: نزيل شرط `archived_at IS NULL`
--     ونوسّع الحالات المسموحة لتشمل cancelled، بحيث يستطيع
--     الناخب المؤهَّل الوصول لملفات المرشحين في الانتخابات المؤرشفة.
--   • سياسات الأدمن والمالك لا تتغير (لا تتحقق من archived_at أصلاً).
-- =============================================

DROP POLICY IF EXISTS election_files_select_voter ON storage.objects;

CREATE POLICY election_files_select_voter ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'election-files'
        AND EXISTS (
            SELECT 1
            FROM election_candidates ec
            JOIN elections e ON e.id = ec.election_id
            WHERE ec.status = 'approved'
              AND e.status IN ('voting_open','voting_closed','completed','cancelled')
              AND ec.file_url IS NOT NULL
              AND position(storage.objects.name IN ec.file_url) > 0
              AND is_user_eligible_to_vote(auth.uid(), e.id)
        )
    );
