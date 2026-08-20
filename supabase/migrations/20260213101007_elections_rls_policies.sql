-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260213101007   الاسم: elections_rls_policies


-- =====================================================
-- سياسات RLS لنظام الانتخابات
-- =====================================================

-- دالة مساعدة للتحقق من صلاحيات إدارة الانتخابات
-- (رئيس النادي، الرئيس التنفيذي، قائد الموارد البشرية)
CREATE OR REPLACE FUNCTION can_manage_elections(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = user_uuid
        AND ur.is_active = true
        AND r.role_name IN ('club_president', 'administrative_council_president', 'hr_committee_leader')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة للتحقق من عضوية اللجنة
CREATE OR REPLACE FUNCTION is_committee_member(user_uuid UUID, committee_id_param INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM member_details md
        WHERE md.user_id = user_uuid
        AND md.committee_id = committee_id_param
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة للتحقق من صلاحية رؤية بيانات التصويت التفصيلية
CREATE OR REPLACE FUNCTION can_view_vote_details(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = user_uuid
        AND ur.is_active = true
        AND r.role_name IN ('club_president', 'administrative_council_president', 'hr_committee_leader')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- سياسات جدول elections
-- =====================================================

-- القراءة: الجميع يمكنهم رؤية الانتخابات
CREATE POLICY "elections_select_policy" ON elections
    FOR SELECT USING (true);

-- الإنشاء: المسؤولون المخولون فقط
CREATE POLICY "elections_insert_policy" ON elections
    FOR INSERT WITH CHECK (can_manage_elections(auth.uid()));

-- التحديث: المسؤولون المخولون فقط
CREATE POLICY "elections_update_policy" ON elections
    FOR UPDATE USING (can_manage_elections(auth.uid()));

-- الحذف: المسؤولون المخولون فقط
CREATE POLICY "elections_delete_policy" ON elections
    FOR DELETE USING (can_manage_elections(auth.uid()));

-- =====================================================
-- سياسات جدول election_candidates
-- =====================================================

-- القراءة: الجميع يمكنهم رؤية المرشحين المقبولين، أو المرشح يرى طلبه
CREATE POLICY "election_candidates_select_policy" ON election_candidates
    FOR SELECT USING (
        status = 'approved' 
        OR member_id = auth.uid()
        OR can_manage_elections(auth.uid())
    );

-- الإنشاء: أعضاء اللجنة فقط يمكنهم الترشح في لجنتهم
CREATE POLICY "election_candidates_insert_policy" ON election_candidates
    FOR INSERT WITH CHECK (
        member_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM elections e
            WHERE e.id = election_id
            AND e.status = 'nomination'
            AND e.nomination_start_date <= now()
            AND e.nomination_end_date >= now()
            AND is_committee_member(auth.uid(), e.committee_id)
        )
    );

-- التحديث: المسؤولون المخولون فقط (للمراجعة)
CREATE POLICY "election_candidates_update_policy" ON election_candidates
    FOR UPDATE USING (can_manage_elections(auth.uid()));

-- الحذف: المسؤولون المخولون فقط
CREATE POLICY "election_candidates_delete_policy" ON election_candidates
    FOR DELETE USING (can_manage_elections(auth.uid()));

-- =====================================================
-- سياسات جدول election_votes
-- =====================================================

-- القراءة: المسؤولون المخولون فقط يمكنهم رؤية تفاصيل التصويت
CREATE POLICY "election_votes_select_policy" ON election_votes
    FOR SELECT USING (can_view_vote_details(auth.uid()));

-- الإنشاء: أعضاء اللجنة فقط يمكنهم التصويت
CREATE POLICY "election_votes_insert_policy" ON election_votes
    FOR INSERT WITH CHECK (
        voter_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM elections e
            WHERE e.id = election_id
            AND e.status = 'voting'
            AND e.voting_start_date <= now()
            AND e.voting_end_date >= now()
            AND is_committee_member(auth.uid(), e.committee_id)
        )
        AND EXISTS (
            SELECT 1 FROM election_candidates ec
            WHERE ec.id = candidate_id
            AND ec.election_id = election_id
            AND ec.status = 'approved'
        )
    );

-- لا يمكن تحديث أو حذف الأصوات
CREATE POLICY "election_votes_update_policy" ON election_votes
    FOR UPDATE USING (false);

CREATE POLICY "election_votes_delete_policy" ON election_votes
    FOR DELETE USING (false);

