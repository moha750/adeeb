-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260212205529   الاسم: create_election_files_storage_policies

-- سياسات Storage لملفات الانتخابات

-- السماح للمستخدمين المصادق عليهم برفع الملفات
CREATE POLICY "election_files_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'election-files');

-- السماح للجميع بقراءة الملفات (عامة)
CREATE POLICY "election_files_select" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'election-files');

-- السماح للمسؤولين بحذف الملفات
CREATE POLICY "election_files_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'election-files'
        AND EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_name IN ('club_president', 'ceo', 'hr_leader')
            AND ur.is_active = true
        )
    );
