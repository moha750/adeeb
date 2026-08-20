-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260412124219   الاسم: fix_auto_generate_profile_slug_trigger


CREATE OR REPLACE FUNCTION public.auto_generate_profile_slug()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_full_name TEXT;
BEGIN
    -- جلب الاسم الكامل من جدول profiles
    SELECT full_name INTO v_full_name
    FROM profiles
    WHERE id = NEW.user_id;

    -- إذا لم يتم تحديد slug، يتم توليده تلقائياً
    IF NEW.profile_slug IS NULL OR NEW.profile_slug = '' THEN
        NEW.profile_slug := generate_profile_slug(COALESCE(v_full_name, ''), NEW.user_id);
    END IF;

    RETURN NEW;
END;
$function$;

