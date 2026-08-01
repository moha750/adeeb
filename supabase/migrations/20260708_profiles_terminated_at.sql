-- ════════════════════════════════════════════════════════════════════
-- تاريخ إنهاء العضوية الحقيقيّ (terminated_at) على profiles
-- ════════════════════════════════════════════════════════════════════
-- المشكلة: الواجهة تعرض «عضوية منتهية منذ…» معتمدةً على updated_at، وهو
--          آخر تعديل للحساب لأيّ سبب — فيتذبذب التاريخ عند أيّ تحديث لاحق
--          (تصحيح اسم/جوّال بعد الإيقاف يقفز بالتاريخ المعروض).
-- الحلّ: عمود terminated_at يُختَم مرّة واحدة لحظة الإيقاف عبر تريغر،
--        ولا يتغيّر بالتعديلات اللاحقة، ويُمسَح عند إعادة التفعيل.
-- الأثر: يعمل من أيّ مصدر يكتب account_status (اللوحة القديمة اليوم، وV2 مستقبلًا)
--        بلا أيّ تعديل على كود التطبيق.
-- ملاحظة: idempotent (IF NOT EXISTS / CREATE OR REPLACE / DROP … IF EXISTS).

-- ─────────────────────────────────────────────
-- 1) العمود
-- ─────────────────────────────────────────────
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS terminated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.terminated_at IS
    'لحظة إنهاء العضوية (account_status=suspended). تُضبَط مرّة واحدة عبر تريغر set_terminated_at ولا تتغيّر بالتعديلات اللاحقة؛ تُمسَح عند إعادة التفعيل.';

-- ─────────────────────────────────────────────
-- 2) دالة التريغر — تعدّل NEW مباشرةً (BEFORE)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_terminated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
    -- دخول الإيقاف من أيّ حالة غير موقوفة (أو إدراج موقوف): اختم لحظة الإنهاء
    IF NEW.account_status = 'suspended'
       AND (OLD.account_status IS DISTINCT FROM 'suspended') THEN
        NEW.terminated_at := now();
    -- أيّ حالة غير الإيقاف (تفعيل/تعطيل/انتظار): لا ختم إنهاء
    ELSIF NEW.account_status IS DISTINCT FROM 'suspended' THEN
        NEW.terminated_at := NULL;
    END IF;
    -- (موقوف ← موقوف: لا يمسّ الحقلين أيّ فرع، فيُحفَظ الختم الأصليّ)
    RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────
-- 3) التريغر — قبل الكتابة، عند تغيّر account_status فقط
-- ─────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_set_terminated_at ON public.profiles;
CREATE TRIGGER trg_set_terminated_at
BEFORE INSERT OR UPDATE OF account_status ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_terminated_at();

-- ─────────────────────────────────────────────
-- 4) ملء رجعيّ للموقوفين الحاليّين
--    أفضل تقدير متاح = updated_at (لا يوجد سجلّ تدقيق يحمل التاريخ الحقيقيّ)،
--    يُجمَّد الآن فلا يتذبذب بعد اليوم. لا يستدعي التريغر لأنّ account_status
--    ليس ضمن SET.
-- ─────────────────────────────────────────────
UPDATE public.profiles
SET terminated_at = updated_at
WHERE account_status = 'suspended'
  AND terminated_at IS NULL;
