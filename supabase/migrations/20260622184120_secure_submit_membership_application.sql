-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260622184120   الاسم: secure_submit_membership_application


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

