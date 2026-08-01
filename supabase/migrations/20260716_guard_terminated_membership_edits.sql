-- ════════════════════════════════════════════════════════════════════
-- عضويّة منتهية لا تُحرَّر بياناتها — الحكم في القاعدة لا عُرفًا في الواجهة
-- ════════════════════════════════════════════════════════════════════
-- المشكلة: لا طبقة تمنع تحرير بيانات عضويّة منتهية. RLS تسأل عن **المستدعي**
--          (role_level ≥ 7/8) ولا تسأل عن حالة **المقصود**؛ ومسار اللوحة يكتب
--          بمفتاح الخدمة فيتجاوز RLS أصلًا. فكانت القاعدة عرفًا في الواجهة لا
--          حكمًا مفروضًا: من نادى الإجراء مباشرةً كتب كما يشاء.
--
-- شاهدها: 20260708_profiles_terminated_at.sql وُلد من هذا الباب المفتوح —
--          «تصحيح اسم/جوّال بعد الإيقاف يقفز بالتاريخ المعروض». عولج العرَض
--          (عمودٌ يُجمّد التاريخ) وبقي السبب (التحرير نفسه). هنا يُغلق السبب،
--          ويبقى terminated_at على صدقه لا حارسًا لما لا يُحرس.
--
-- الحكم: ما دامت العضويّة منتهية (account_status = 'suspended') فبيانات العضو
--        مجمَّدة — الاسم والبريد والجوّال والصورة والنبذة والمعرّف والجنس،
--        وسجلّ member_details كلّه (أكاديميّ + تواصل اجتماعيّ).
--
-- والمسموح صراحةً — سجلّ الإغلاق لا بيانات العضو:
--        account_status · terminated_at · termination_reason · updated_at
--        فتبقى «إعادة العضوية» ممكنة. ولولا استثناؤها لاستحال فكّ الإيقاف
--        إلّا بتعطيل الحارس — حارسٌ يحبس البابين ليس حارسًا.
--
-- المنهج: منعٌ افتراضيّ بقائمة سماحٍ مسمّاة، لا قائمة منعٍ تُلاحق كلّ عمود جديد.
--        عمودٌ يُضاف غدًا يُمنَع تلقائيًّا حتّى يُسمَّى هنا عمدًا — فالنسيان
--        يُغلِق لا يفتح. والمقارنة على to_jsonb(NEW/OLD) ناقصَ قائمة السماح.
--
-- الحذف غير محروس عمدًا: «حذف نهائي» يبقى عاملًا — المنتهية لا تُحرَّر، وتُمحى.
--
-- ملاحظة: idempotent (CREATE OR REPLACE / DROP … IF EXISTS).

-- ─────────────────────────────────────────────
-- 1) profiles — يُمنع تغيّر أيّ عمود خارج قائمة السماح ما دامت منتهية
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.guard_terminated_membership_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    -- سجلّ الإغلاق وحده — كلّ ما عداه بياناتُ عضوٍ مجمَّدة
    allowed CONSTANT text[] := ARRAY['account_status', 'terminated_at', 'termination_reason', 'updated_at'];
BEGIN
    -- لم تكن منتهية، أو هي تخرج من الانتهاء الآن (إعادة عضوية): لا شأن للحارس.
    -- والخروج يُمرّر التحرير في المعاملة نفسها عمدًا — من أعادها فقد أعادها.
    IF OLD.account_status IS DISTINCT FROM 'suspended'
       OR NEW.account_status IS DISTINCT FROM 'suspended' THEN
        RETURN NEW;
    END IF;

    IF (to_jsonb(NEW) - allowed) IS DISTINCT FROM (to_jsonb(OLD) - allowed) THEN
        RAISE EXCEPTION 'عضويّة منتهية لا تُحرَّر بياناتها (العضو %). أعِد العضوية أوّلًا ثمّ عدّلها.', OLD.id
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_terminated_membership_profile ON public.profiles;
CREATE TRIGGER trg_guard_terminated_membership_profile
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.guard_terminated_membership_profile();

-- ─────────────────────────────────────────────
-- 2) member_details — الحالة تُقرأ من profiles (لا حالة في هذا الجدول)
--    SECURITY DEFINER: حارسٌ تُعميه RLS عن قراءة profiles ليس حارسًا.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.guard_terminated_membership_details()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = NEW.user_id AND p.account_status = 'suspended'
    ) THEN
        RAISE EXCEPTION 'عضويّة منتهية لا تُحرَّر بياناتها (العضو %). أعِد العضوية أوّلًا ثمّ عدّلها.', NEW.user_id
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

-- الاسم يبدأ بـ trg_ فيسبق trigger_* أبجديًّا — وترتيب تريغرات BEFORE بالاسم:
-- يُردّ المنعُ قبل أن يعمل التطبيع والإكمال والختم الزمنيّ على صفٍّ لن يُكتب.
DROP TRIGGER IF EXISTS trg_guard_terminated_membership_details ON public.member_details;
CREATE TRIGGER trg_guard_terminated_membership_details
BEFORE INSERT OR UPDATE ON public.member_details
FOR EACH ROW
EXECUTE FUNCTION public.guard_terminated_membership_details();

COMMENT ON FUNCTION public.guard_terminated_membership_profile() IS
    'يمنع تحرير بيانات عضوٍ عضويّته منتهية (account_status=suspended). يسمح بسجلّ الإغلاق وحده: account_status · terminated_at · termination_reason · updated_at — فتبقى إعادة العضوية ممكنة.';
COMMENT ON FUNCTION public.guard_terminated_membership_details() IS
    'يمنع إدراج/تحديث member_details لعضوٍ عضويّته منتهية (account_status=suspended في profiles).';
