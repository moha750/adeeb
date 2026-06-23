-- 20260622 — إصلاحات تسجيل العضوية وصلاحيات رئيس المجلس التنفيذي
-- ملاحظة: هذه التغييرات طُبّقت مباشرةً على القاعدة الحيّة عبر Supabase بتاريخ 2026-06-22،
-- وهذا الملف لتوثيقها في سجل الـmigrations فقط (idempotent / آمن لإعادة التشغيل).

-- =========================================================================
-- (1) دالة إرسال طلب العضوية بصلاحيات آمنة (SECURITY DEFINER)
--     السبب: supabase-js@2 يطلب إرجاع الصف بعد الإدخال (representation)، وهو
--     يحتاج صلاحية SELECT لـanon غير موجودة (حمايةً للبيانات) فيفشل بـ403.
--     الحل: الإدخال (وتسجيل استخدام الدعوة) داخل دالة تعمل بصلاحيات المالك،
--     دون كشف الجدول للعامة. الواجهة تستدعيها عبر rpc بدل .insert().
-- =========================================================================
CREATE OR REPLACE FUNCTION public.submit_membership_application(p jsonb, p_invitation_id uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.membership_applications(
    full_name, phone, email, degree, college, major, skills,
    preferred_committee, portfolio_url, social_twitter, social_instagram,
    social_linkedin, about, status, visitor_id, session_id, path, user_agent
  ) VALUES (
    p->>'full_name', p->>'phone', p->>'email', p->>'degree', p->>'college',
    p->>'major', p->>'skills', p->>'preferred_committee', p->>'portfolio_url',
    p->>'social_twitter', p->>'social_instagram', p->>'social_linkedin',
    p->>'about', 'new', p->>'visitor_id', p->>'session_id', p->>'path',
    left(p->>'user_agent', 500)
  )
  RETURNING id INTO v_id;

  IF p_invitation_id IS NOT NULL THEN
    INSERT INTO public.invitation_usages(invitation_id, application_id, applicant_name, applicant_email, user_agent)
    VALUES (p_invitation_id, v_id, p->>'full_name', p->>'email', left(p->>'user_agent', 500));
  END IF;

  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_membership_application(jsonb, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_membership_application(jsonb, uuid) TO anon, authenticated;

-- =========================================================================
-- (2) تصحيح خطأ إملائي في سياسات membership_applications:
--     الدور 'executive_president' غير موجود إطلاقًا؛ المقصود 'executive_council_president'
--     (رئيس المجلس التنفيذي). كان يمنعه فعليًا من قراءة/تعديل/حذف الطلبات.
-- =========================================================================
ALTER POLICY allow_select_for_service_role ON public.membership_applications
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
      AND r.role_name = ANY (ARRAY['club_president','executive_council_president','committee_leader'])
      AND ur.is_active = true
  )
);

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

-- =========================================================================
-- (3) منح رئيس المجلس التنفيذي صلاحية «إهداء العضوية» لإكمال تبويب «باب التسجيل»
--     مثل رئيس النادي (كان يملك manage_registration وينقصه gift_membership).
-- =========================================================================
INSERT INTO public.role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.role_name = 'executive_council_president'
  AND p.permission_key = 'gift_membership'
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
