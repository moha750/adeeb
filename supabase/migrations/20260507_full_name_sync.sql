-- ════════════════════════════════════════════════════════════════════
-- مزامنة الاسم الكامل بين الجداول الثلاثة
-- profiles.full_name  ⇆  member_details.full_name_triple  ⇆  auth.users.raw_user_meta_data->>'full_name'
-- ════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- 1) دالة المزامنة من profiles إلى الباقي
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_full_name_from_profiles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
    IF NEW.full_name IS NULL OR NEW.full_name = '' THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.full_name IS NOT DISTINCT FROM OLD.full_name THEN
        RETURN NEW;
    END IF;

    -- مزامنة auth.users.raw_user_meta_data->>'full_name'
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{full_name}',
        to_jsonb(NEW.full_name)
    )
    WHERE id = NEW.id
      AND (raw_user_meta_data->>'full_name') IS DISTINCT FROM NEW.full_name;

    -- مزامنة member_details.full_name_triple إن وُجد سجل للعضو
    UPDATE public.member_details
    SET full_name_triple = NEW.full_name,
        updated_at       = now()
    WHERE user_id = NEW.id
      AND full_name_triple IS DISTINCT FROM NEW.full_name;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_full_name_from_profiles ON public.profiles;
CREATE TRIGGER trg_sync_full_name_from_profiles
AFTER INSERT OR UPDATE OF full_name ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_full_name_from_profiles();

-- ─────────────────────────────────────────────
-- 2) دالة المزامنة العكسية: من member_details إلى profiles
--    (يكفي تحديث profiles لأن التريغر السابق سيتسلسل إلى auth.users)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_full_name_from_member_details()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
    IF NEW.full_name_triple IS NULL OR NEW.full_name_triple = '' THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.full_name_triple IS NOT DISTINCT FROM OLD.full_name_triple THEN
        RETURN NEW;
    END IF;

    UPDATE public.profiles
    SET full_name  = NEW.full_name_triple,
        updated_at = now()
    WHERE id = NEW.user_id
      AND full_name IS DISTINCT FROM NEW.full_name_triple;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_full_name_from_member_details ON public.member_details;
CREATE TRIGGER trg_sync_full_name_from_member_details
AFTER INSERT OR UPDATE OF full_name_triple ON public.member_details
FOR EACH ROW
EXECUTE FUNCTION public.sync_full_name_from_member_details();

-- ─────────────────────────────────────────────
-- 3) مزامنة لمرة واحدة للبيانات الموجودة
-- ─────────────────────────────────────────────

-- 3أ) حيث يحتوي profiles.full_name على نص نائب حرفي وكان لدى العضو full_name_triple صحيح،
--     نأخذ الاسم الصحيح من member_details
UPDATE public.profiles p
SET full_name  = TRIM(md.full_name_triple),
    updated_at = now()
FROM public.member_details md
WHERE md.user_id = p.id
  AND md.full_name_triple IS NOT NULL
  AND TRIM(md.full_name_triple) <> ''
  AND TRIM(md.full_name_triple) <> p.full_name
  AND (
        p.full_name ILIKE '%أسم الأب%'
     OR p.full_name ILIKE '%اسم الأب%'
     OR p.full_name ILIKE '%أسم الأم%'
     OR p.full_name ILIKE '%اسم الأم%'
     OR p.full_name ILIKE '%العائلة%'
     OR p.full_name ILIKE '%أسم مختلف%'
     OR p.full_name ILIKE '%الأسم%'
  );
-- التريغر سيُزامن auth.users تلقائيًا

-- 3ب) مزامنة auth.users.raw_user_meta_data->>'full_name' من profiles لكل المستخدمين الباقين
--     (الذين لم يتأثروا بالخطوة السابقة لكن metadata لا يزال غير متزامن)
UPDATE auth.users au
SET raw_user_meta_data = jsonb_set(
    COALESCE(au.raw_user_meta_data, '{}'::jsonb),
    '{full_name}',
    to_jsonb(p.full_name)
)
FROM public.profiles p
WHERE au.id = p.id
  AND p.full_name IS NOT NULL
  AND p.full_name <> ''
  AND (au.raw_user_meta_data->>'full_name') IS DISTINCT FROM p.full_name;
