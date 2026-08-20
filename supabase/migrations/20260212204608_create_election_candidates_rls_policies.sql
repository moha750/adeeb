-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260212204608   الاسم: create_election_candidates_rls_policies

-- ========== سياسات جدول election_candidates ==========

-- القراءة: الجميع يمكنهم رؤية المرشحين
CREATE POLICY "election_candidates_select_all" ON election_candidates
    FOR SELECT USING (true);

-- الإنشاء: أعضاء اللجنة فقط يمكنهم الترشح في لجنتهم
CREATE POLICY "election_candidates_insert_committee_member" ON election_candidates
    FOR INSERT WITH CHECK (
        member_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM elections e
            WHERE e.id = election_id
            AND is_committee_member(e.committee_id)
            AND e.status = 'nomination'
            AND now() BETWEEN e.nomination_start_date AND e.nomination_end_date
        )
    );

-- التحديث: المرشح يمكنه تحديث ملفه فقط إذا كانت حالته file_deleted، أو المسؤولون
CREATE POLICY "election_candidates_update" ON election_candidates
    FOR UPDATE USING (
        (member_id = auth.uid() AND status = 'file_deleted')
        OR is_election_admin()
    );

-- الحذف: المسؤولون فقط
CREATE POLICY "election_candidates_delete_admin" ON election_candidates
    FOR DELETE USING (is_election_admin());
