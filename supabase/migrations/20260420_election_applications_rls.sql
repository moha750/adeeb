-- =============================================
-- Election Applications Bucket — RLS Policies
-- =============================================
-- مسار الملفات: {electionId}/{userId}/election-file.{ext}
-- المقطع الثاني في المسار (index = 2) هو userId الخاص بصاحب الملف
-- السياسات تُقيّد الكتابة على صاحب الملف فقط، وتسمح بالقراءة لأي مصادق
-- (لأن توليد signed URLs من لوحة المراجعة يتطلب SELECT)
-- =============================================

DROP POLICY IF EXISTS "election_applications_insert" ON storage.objects;
DROP POLICY IF EXISTS "election_applications_update" ON storage.objects;
DROP POLICY IF EXISTS "election_applications_select" ON storage.objects;
DROP POLICY IF EXISTS "election_applications_delete" ON storage.objects;

-- رفع ملف: فقط داخل مجلد يحمل userId الخاص بالمستخدم
CREATE POLICY "election_applications_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'election-applications'
        AND (storage.foldername(name))[2] = auth.uid()::text
    );

-- استبدال ملف (upsert): فقط داخل مجلد يحمل userId الخاص بالمستخدم
CREATE POLICY "election_applications_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'election-applications'
        AND (storage.foldername(name))[2] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'election-applications'
        AND (storage.foldername(name))[2] = auth.uid()::text
    );

-- قراءة: أي مستخدم مصادق (يُستخدم لتوليد signed URLs للمراجعة)
CREATE POLICY "election_applications_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'election-applications');

-- حذف: فقط صاحب الملف
CREATE POLICY "election_applications_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'election-applications'
        AND (storage.foldername(name))[2] = auth.uid()::text
    );
