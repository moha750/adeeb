-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260214192723   الاسم: fix_election_candidates_rls


-- حذف السياسات القديمة المتعارضة
DROP POLICY IF EXISTS candidates_insert_committee_members ON election_candidates;
DROP POLICY IF EXISTS election_candidates_insert ON election_candidates;
DROP POLICY IF EXISTS candidates_select_policy ON election_candidates;
DROP POLICY IF EXISTS election_candidates_select ON election_candidates;

-- إنشاء سياسة SELECT موحدة
CREATE POLICY election_candidates_select_all ON election_candidates
FOR SELECT
USING (true);

-- إنشاء سياسة INSERT للمستخدمين المسجلين (يمكنهم الترشح لأنفسهم فقط)
CREATE POLICY election_candidates_insert_own ON election_candidates
FOR INSERT
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM elections e
        WHERE e.id = election_id
        AND e.status = 'nomination_open'
    )
);

-- تحديث سياسات UPDATE لتشمل مستشار الرئيس
DROP POLICY IF EXISTS candidates_update_admins ON election_candidates;

CREATE POLICY election_candidates_update_admins ON election_candidates
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND (r.role_level >= 9 OR r.role_name IN ('hr_committee_leader', 'administrative_council_president'))
    )
);

