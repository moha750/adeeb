-- 20260626 — دعم إعادة استخدام حساب موجود أثناء ترحيل الأعضاء المقبولين
-- المشكلة: إذا كان المتقدّم قد سجّل حسابًا بنفسه في الموقع قبل الترحيل، يفشل
--          إنشاء حساب جديد بنفس البريد ("already been registered") فيتعطّل الترحيل.
-- الحل: دالة مساعدة تُرجع معرّف حساب المصادقة المرتبط بالبريد (إن وُجد) وهل له
--       profile، حتى تتمكّن دالة الحافة من إعادة استخدام الحساب اليتيم بأمان
--       (وترفض البريد المرتبط بعضو فعّال). تُستدعى عبر rpc من migrate-accepted-member.

CREATE OR REPLACE FUNCTION public.lookup_auth_user_by_email(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
  v_has_profile boolean;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(trim(p_email))
  ORDER BY created_at
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('user_id', NULL, 'has_profile', false);
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = v_user_id) INTO v_has_profile;

  RETURN jsonb_build_object('user_id', v_user_id, 'has_profile', v_has_profile);
END;
$$;

-- لا تُكشف للعامة؛ تُستدعى فقط بمفتاح service_role من دالة الحافة.
REVOKE ALL ON FUNCTION public.lookup_auth_user_by_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lookup_auth_user_by_email(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_auth_user_by_email(text) TO service_role;
