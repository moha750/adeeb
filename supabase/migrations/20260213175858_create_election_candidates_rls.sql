-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260213175858   الاسم: create_election_candidates_rls


-- تفعيل RLS على جدول المرشحين
ALTER TABLE election_candidates ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: أعضاء اللجنة المعنية + المسؤولين
CREATE POLICY election_candidates_select_policy ON election_candidates
FOR SELECT USING (
    -- المسؤولين يمكنهم رؤية الكل
    can_manage_elections(auth.uid())
    OR
    -- أعضاء اللجنة يمكنهم رؤية مرشحي لجنتهم
    EXISTS (
        SELECT 1 FROM elections e
        WHERE e.id = election_candidates.election_id
        AND is_committee_member(auth.uid(), e.committee_id)
    )
);

-- سياسة الإدراج: أعضاء اللجنة فقط أثناء فترة الترشح
CREATE POLICY election_candidates_insert_policy ON election_candidates
FOR INSERT WITH CHECK (
    -- المستخدم يضيف لنفسه فقط
    auth.uid() = user_id
    AND
    -- التحقق من أن الانتخاب في مرحلة الترشح وأن المستخدم عضو في اللجنة
    EXISTS (
        SELECT 1 FROM elections e
        WHERE e.id = election_id
        AND e.status = 'nomination'
        AND now() BETWEEN e.nomination_start_date AND e.nomination_end_date
        AND is_committee_member(auth.uid(), e.committee_id)
    )
);

-- سياسة التحديث: المسؤولين فقط (للمراجعة)
CREATE POLICY election_candidates_update_policy ON election_candidates
FOR UPDATE USING (
    can_manage_elections(auth.uid())
);

-- سياسة الحذف: المسؤولين فقط
CREATE POLICY election_candidates_delete_policy ON election_candidates
FOR DELETE USING (
    can_manage_elections(auth.uid())
);

