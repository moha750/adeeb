-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260412124602   الاسم: add_admin_upsert_policy_member_details


-- سياسة تسمح للمسؤولين بتحديث بيانات الأعضاء
CREATE POLICY "المسؤولون يمكنهم تحديث بيانات الأعضاء"
ON public.member_details
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 7
    )
);

-- سياسة تسمح للمسؤولين بإدراج بيانات الأعضاء (مطلوبة لـ upsert)
CREATE POLICY "المسؤولون يمكنهم إدراج بيانات الأعضاء"
ON public.member_details
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND r.role_level >= 7
    )
);

