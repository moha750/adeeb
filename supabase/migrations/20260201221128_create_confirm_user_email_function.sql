-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260201221128   الاسم: create_confirm_user_email_function


-- إنشاء دالة لتأكيد البريد الإلكتروني
CREATE OR REPLACE FUNCTION public.confirm_user_email(user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auth.users
  SET email_confirmed_at = NOW(),
      confirmed_at = NOW()
  WHERE id = user_id
  AND email_confirmed_at IS NULL;
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION public.confirm_user_email(UUID) TO service_role;

