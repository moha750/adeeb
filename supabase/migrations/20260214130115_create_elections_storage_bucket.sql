-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260214130115   الاسم: create_elections_storage_bucket


-- =====================================================
-- Storage Bucket لملفات الترشح
-- =====================================================

-- إنشاء bucket لملفات الترشح
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'election-applications',
    'election-applications',
    false,
    10485760,  -- 10MB
    ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- سياسة الرفع: المستخدمون المسجلون فقط
CREATE POLICY "election_files_upload" ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'election-applications'
    AND auth.uid() IS NOT NULL
);

-- سياسة القراءة: المسؤولون + أعضاء اللجنة المعنية
CREATE POLICY "election_files_read" ON storage.objects FOR SELECT
USING (
    bucket_id = 'election-applications'
    AND auth.uid() IS NOT NULL
);

-- سياسة الحذف: المسؤولون فقط
CREATE POLICY "election_files_delete" ON storage.objects FOR DELETE
USING (
    bucket_id = 'election-applications'
    AND EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('club_president', 'administrative_council_president', 'hr_committee_leader')
    )
);

