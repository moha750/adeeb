-- =============================================
-- نظام الانتخابات — 06: RLS + Storage + pg_cron
-- =============================================

-- =========================================================
-- 1) تفعيل RLS على جداول الانتخابات
-- =========================================================
ALTER TABLE elections             ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_candidates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_votes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_vote_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_audit_log    ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 2) Policies: elections
-- =========================================================
DROP POLICY IF EXISTS elections_select_all    ON elections;
DROP POLICY IF EXISTS elections_select_drafts ON elections;
DROP POLICY IF EXISTS elections_insert_admin  ON elections;
DROP POLICY IF EXISTS elections_update_admin  ON elections;
DROP POLICY IF EXISTS elections_delete_admin  ON elections;

-- الأعضاء يرون كل الانتخابات (لم تعد هناك حالة مسودة)
CREATE POLICY elections_select_all ON elections
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY elections_insert_admin ON elections
    FOR INSERT TO authenticated
    WITH CHECK (has_election_admin_permission(auth.uid()));

CREATE POLICY elections_update_admin ON elections
    FOR UPDATE TO authenticated
    USING (has_election_admin_permission(auth.uid()))
    WITH CHECK (has_election_admin_permission(auth.uid()));

CREATE POLICY elections_delete_admin ON elections
    FOR DELETE TO authenticated
    USING (has_election_admin_permission(auth.uid()));

-- =========================================================
-- 3) Policies: election_candidates
--    العضو يرى سجله فقط مباشرة؛ بقية المرشحين عبر RPC مجهول/مخوّل.
-- =========================================================
DROP POLICY IF EXISTS candidates_select_own        ON election_candidates;
DROP POLICY IF EXISTS candidates_select_admin      ON election_candidates;
DROP POLICY IF EXISTS candidates_select_viewer     ON election_candidates;
DROP POLICY IF EXISTS candidates_insert_self       ON election_candidates;
DROP POLICY IF EXISTS candidates_update_self       ON election_candidates;
DROP POLICY IF EXISTS candidates_update_admin      ON election_candidates;
DROP POLICY IF EXISTS candidates_delete_admin      ON election_candidates;

CREATE POLICY candidates_select_own ON election_candidates
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY candidates_select_admin ON election_candidates
    FOR SELECT TO authenticated
    USING (has_election_admin_permission(auth.uid()));

CREATE POLICY candidates_select_viewer ON election_candidates
    FOR SELECT TO authenticated
    USING (has_election_view_permission(auth.uid(), election_id));

CREATE POLICY candidates_insert_self ON election_candidates
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- العضو يعدل سجله (تعديل بيان/ملف عند needs_edit، انسحاب)
CREATE POLICY candidates_update_self ON election_candidates
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- الأدمن يعدل (مراجعة، إلخ)
CREATE POLICY candidates_update_admin ON election_candidates
    FOR UPDATE TO authenticated
    USING (has_election_admin_permission(auth.uid()))
    WITH CHECK (has_election_admin_permission(auth.uid()));

CREATE POLICY candidates_delete_admin ON election_candidates
    FOR DELETE TO authenticated
    USING (has_election_admin_permission(auth.uid()));

-- =========================================================
-- 4) Policies: election_votes
--    سرية: حتى الأدمن الكامل فقط يرى السجلات (للتدقيق)؛ العضو يصوّت فقط.
-- =========================================================
DROP POLICY IF EXISTS votes_select_admin  ON election_votes;
DROP POLICY IF EXISTS votes_select_self   ON election_votes;
DROP POLICY IF EXISTS votes_insert_self   ON election_votes;

CREATE POLICY votes_select_admin ON election_votes
    FOR SELECT TO authenticated
    USING (has_election_admin_permission(auth.uid()));

-- المصوّت يرى صوته الخاص (لعرض "تم التصويت")
CREATE POLICY votes_select_self ON election_votes
    FOR SELECT TO authenticated
    USING (voter_id = auth.uid());

CREATE POLICY votes_insert_self ON election_votes
    FOR INSERT TO authenticated
    WITH CHECK (voter_id = auth.uid());

-- UPDATE/DELETE مُمنوعان عبر triggers (لا حاجة لسياسة صريحة للمنع)
-- لكن لا نعطي أي سياسة لهما → مرفوضان تلقائياً بـ RLS.

-- =========================================================
-- 5) Policies: election_vote_weights
-- =========================================================
DROP POLICY IF EXISTS vote_weights_select_all   ON election_vote_weights;
DROP POLICY IF EXISTS vote_weights_modify_admin ON election_vote_weights;

CREATE POLICY vote_weights_select_all ON election_vote_weights
    FOR SELECT TO authenticated USING (true);

CREATE POLICY vote_weights_modify_admin ON election_vote_weights
    FOR ALL TO authenticated
    USING (has_election_admin_permission(auth.uid()))
    WITH CHECK (has_election_admin_permission(auth.uid()));

-- =========================================================
-- 6) Policies: election_audit_log
-- =========================================================
DROP POLICY IF EXISTS audit_select_admin  ON election_audit_log;
DROP POLICY IF EXISTS audit_select_viewer ON election_audit_log;
DROP POLICY IF EXISTS audit_insert_any    ON election_audit_log;

CREATE POLICY audit_select_admin ON election_audit_log
    FOR SELECT TO authenticated
    USING (has_election_admin_permission(auth.uid()));

CREATE POLICY audit_select_viewer ON election_audit_log
    FOR SELECT TO authenticated
    USING (election_id IS NOT NULL
           AND has_election_view_permission(auth.uid(), election_id));

-- لا نعرّف سياسة INSERT: كل الكتابة تأتي من دوال SECURITY DEFINER تتجاوز RLS.

-- =========================================================
-- 7) Storage Bucket: election-files
-- =========================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'election-files',
    'election-files',
    false,
    5242880, -- 5 MB
    ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/png',
        'image/jpeg'
    ]
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =========================================================
-- 8) Storage Policies على objects في election-files
--    مسار الملف: {user_id}/{election_id}/{filename}
--    أو (بعد الأنونيميز): anon/{election_id}/{candidate_number}.ext
-- =========================================================
DROP POLICY IF EXISTS election_files_insert_self     ON storage.objects;
DROP POLICY IF EXISTS election_files_select_own      ON storage.objects;
DROP POLICY IF EXISTS election_files_select_admin    ON storage.objects;
DROP POLICY IF EXISTS election_files_select_voter    ON storage.objects;
DROP POLICY IF EXISTS election_files_delete_own      ON storage.objects;
DROP POLICY IF EXISTS election_files_delete_admin    ON storage.objects;

-- رفع من المالك إلى مساره الشخصي فقط
CREATE POLICY election_files_insert_self ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'election-files'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- المالك يقرأ ملفه
CREATE POLICY election_files_select_own ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'election-files'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- الأدمن يقرأ كل شيء
CREATE POLICY election_files_select_admin ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'election-files'
        AND has_election_admin_permission(auth.uid())
    );

-- المصوّت يقرأ ملفات المرشحين المعتمدين في انتخاب يصوّت فيه
-- (المسار يبدأ بـ user_id أو anon — نعمل join على election_candidates)
CREATE POLICY election_files_select_voter ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'election-files'
        AND EXISTS (
            SELECT 1
            FROM election_candidates ec
            JOIN elections e ON e.id = ec.election_id
            WHERE ec.status = 'approved'
              AND e.status IN ('voting_open','voting_closed','completed')
              AND e.archived_at IS NULL
              AND ec.file_url IS NOT NULL
              AND position(storage.objects.name IN ec.file_url) > 0
              AND is_user_eligible_to_vote(auth.uid(), e.id)
        )
    );

-- الحذف من المالك أو الأدمن
CREATE POLICY election_files_delete_own ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'election-files'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY election_files_delete_admin ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'election-files'
        AND has_election_admin_permission(auth.uid())
    );

-- =========================================================
-- 9) pg_cron: كنس المواعيد كل دقيقة
-- =========================================================
-- إزالة أي جدولة سابقة لنفس الاسم
DO $$
BEGIN
    PERFORM cron.unschedule('elections-sweep-deadlines');
EXCEPTION WHEN OTHERS THEN
    -- غير مجدول مسبقاً
    NULL;
END $$;

SELECT cron.schedule(
    'elections-sweep-deadlines',
    '* * * * *',
    $cron$SELECT public.sweep_election_deadlines();$cron$
);
