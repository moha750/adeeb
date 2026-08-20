-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260416193422   الاسم: fix_confirm_user_email_generated_column

CREATE OR REPLACE FUNCTION public.confirm_user_email(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE auth.users
  SET email_confirmed_at = NOW()
  WHERE id = user_id
    AND email_confirmed_at IS NULL;
END;
$function$;
