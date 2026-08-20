-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260214150205   الاسم: fix_elections_update_policy


-- حذف السياسة القديمة
DROP POLICY IF EXISTS elections_update_admins ON elections;

-- إنشاء سياسة جديدة مع with_check
CREATE POLICY elections_update_admins ON elections
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('club_president', 'administrative_council_president', 'hr_committee_leader')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('club_president', 'administrative_council_president', 'hr_committee_leader')
    )
);

