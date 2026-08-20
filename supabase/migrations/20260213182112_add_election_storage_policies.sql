-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260213182112   الاسم: add_election_storage_policies


-- إضافة سياسات التخزين لملفات الترشح

-- حذف السياسات القديمة إن وجدت
DROP POLICY IF EXISTS "election_applications_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "election_applications_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "election_applications_delete_policy" ON storage.objects;

-- سياسة رفع الملفات - أعضاء اللجان فقط
CREATE POLICY "election_applications_insert_policy" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'election-applications' AND
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 3
    )
);

-- سياسة قراءة الملفات - المسؤولون وأعضاء اللجنة
CREATE POLICY "election_applications_select_policy" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'election-applications' AND
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 3
    )
);

-- سياسة حذف الملفات - المسؤولون فقط
CREATE POLICY "election_applications_delete_policy" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'election-applications' AND
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 8
    )
);

