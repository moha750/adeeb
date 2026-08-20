-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260212204558   الاسم: create_elections_rls_policies

-- دالة للتحقق من صلاحيات إدارة الانتخابات (رئيس النادي، الرئيس التنفيذي، قائد الموارد البشرية)
CREATE OR REPLACE FUNCTION is_election_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('club_president', 'ceo', 'hr_leader')
        AND ur.is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة للتحقق من عضوية اللجنة
CREATE OR REPLACE FUNCTION is_committee_member(p_committee_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.committee_id = p_committee_id
        AND ur.is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== سياسات جدول elections ==========

-- القراءة: الجميع يمكنهم رؤية الانتخابات
CREATE POLICY "elections_select_all" ON elections
    FOR SELECT USING (true);

-- الإنشاء: المسؤولون فقط
CREATE POLICY "elections_insert_admin" ON elections
    FOR INSERT WITH CHECK (is_election_admin());

-- التحديث: المسؤولون فقط
CREATE POLICY "elections_update_admin" ON elections
    FOR UPDATE USING (is_election_admin());

-- الحذف: المسؤولون فقط
CREATE POLICY "elections_delete_admin" ON elections
    FOR DELETE USING (is_election_admin());
