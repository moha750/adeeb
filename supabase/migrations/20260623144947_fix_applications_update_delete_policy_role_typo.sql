-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260623144947   الاسم: fix_applications_update_delete_policy_role_typo


ALTER POLICY allow_update_for_admins ON public.membership_applications
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
      AND r.role_name = ANY (ARRAY['club_president','executive_council_president'])
      AND ur.is_active = true
  )
);

ALTER POLICY allow_delete_for_admins ON public.membership_applications
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
      AND r.role_name = ANY (ARRAY['club_president','executive_council_president'])
      AND ur.is_active = true
  )
);

