-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260417231415   الاسم: sync_auth_email_to_profiles

-- Trigger function: يُزامن auth.users.email -> public.profiles.email
CREATE OR REPLACE FUNCTION public.sync_profile_email_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.profiles
       SET email      = NEW.email,
           updated_at = NOW()
     WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- إزالة الـ trigger إن كان موجودًا مسبقًا (idempotent)
DROP TRIGGER IF EXISTS trg_sync_profile_email_from_auth ON auth.users;

-- تفعيل الـ trigger بعد تحديث email في auth.users
CREATE TRIGGER trg_sync_profile_email_from_auth
AFTER UPDATE OF email ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_email_from_auth();

-- مزامنة لمرة واحدة: تصحيح أي صفوف حالية متخلفة
UPDATE public.profiles p
   SET email      = u.email,
       updated_at = NOW()
  FROM auth.users u
 WHERE p.id = u.id
   AND p.email IS DISTINCT FROM u.email;
