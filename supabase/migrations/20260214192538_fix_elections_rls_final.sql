-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260214192538   الاسم: fix_elections_rls_final


-- إصلاح سياسة UPDATE للانتخابات - إزالة with_check لأنها تمنع تغيير status إلى cancelled
DROP POLICY IF EXISTS elections_update_admins ON elections;

CREATE POLICY elections_update_admins ON elections
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 6
    )
);

-- إضافة سياسة SELECT للمسؤولين لرؤية جميع الانتخابات بما فيها الملغاة
DROP POLICY IF EXISTS elections_select_admins ON elections;

CREATE POLICY elections_select_admins ON elections
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 6
    )
);

-- إصلاح سياسات election_candidates
DROP POLICY IF EXISTS election_candidates_select ON election_candidates;
DROP POLICY IF EXISTS election_candidates_insert ON election_candidates;

-- السماح للجميع بقراءة المرشحين
CREATE POLICY election_candidates_select ON election_candidates
FOR SELECT
USING (true);

-- السماح للمستخدمين المسجلين بإضافة ترشيحاتهم
CREATE POLICY election_candidates_insert ON election_candidates
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- إصلاح سياسات التخزين لـ election-applications bucket
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;

-- السماح بالرفع للمستخدمين المسجلين
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'election-applications' 
    AND auth.role() = 'authenticated'
);

-- السماح بالقراءة للجميع
CREATE POLICY "Allow authenticated reads" ON storage.objects
FOR SELECT
USING (
    bucket_id = 'election-applications'
);

