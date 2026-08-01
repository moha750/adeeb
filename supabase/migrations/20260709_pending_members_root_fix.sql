-- ════════════════════════════════════════════════════════════════════
-- إصلاح جذر مشكلة «أعضاء أكملوا لكن ما زالوا معلّقين» + منع تكرار الحسابات
-- الجذر: إنشاء العضو المباشر يزيل التكرار بالبريد فقط ⇒ بريد مختلف لنفس الشخص
--        يُنشئ حسابًا شبحيًا يبقى معلّقًا للأبد (توكن غير مستخدَم).
-- الطبقات: (1) قائمة معلّقين واعية بالحالة (تشمل المُرحَّل المعلّق، تستثني الموقوف)
--          (2) قيد هوية على الرقم الوطني  (3) دالة كشف للتوائم المحتملة
-- ملاحظة: منع الإنشاء المكرّر بالاسم يُنفَّذ في Edge Function create-member-directly
-- ════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- (1) get_pending_members
--  المعيار الصحيح لـ«لم يُكمل الأونبوردنغ» = توكن is_used=false. لكن:
--   • المُرحَّل عبر migrate-accepted-member يكون account_status='active' فورًا
--     (قبل الإكمال) مع توكن غير مستخدَم ⇒ يجب أن يظهر ⇒ نُدرج 'active'.
--   • المُهدى عبر create-member-directly يكون 'pending_onboarding' ⇒ نُدرجه.
--   • المكتمل دائمًا is_used=true (يضبطه complete-member-onboarding) ⇒ يسقط تلقائيًا.
--   • الموقوف/غير النشط (مسحوب القبول) يُستثنى.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_pending_members()
 RETURNS TABLE(id uuid, user_id uuid, token text, interview_id uuid, application_id uuid,
               is_used boolean, used_at timestamptz, expires_at timestamptz,
               sent_to_email text, email_sent_at timestamptz, created_at timestamptz, profile jsonb)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
    SELECT
        mot.id, mot.user_id, mot.token, mot.interview_id, mot.application_id,
        mot.is_used, mot.used_at, mot.expires_at, mot.sent_to_email, mot.email_sent_at, mot.created_at,
        jsonb_build_object(
            'id', p.id, 'full_name', p.full_name, 'email', p.email, 'phone', p.phone,
            'account_status', p.account_status, 'created_at', p.created_at
        ) AS profile
    FROM member_onboarding_tokens mot
    JOIN profiles p ON p.id = mot.user_id
    WHERE mot.is_used = false
      AND p.account_status IN ('pending_onboarding', 'active')
    ORDER BY mot.created_at DESC;
$function$;

-- ─────────────────────────────────────────────────────────────
-- (2) قيد هوية: لا عضوان مكتملان بنفس الرقم الوطني (upsert في member_details يفشل).
-- ─────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS uq_member_details_national_id
    ON public.member_details (btrim(national_id))
    WHERE national_id IS NOT NULL AND btrim(national_id) <> '';

-- ─────────────────────────────────────────────────────────────
-- (3) كشف مبكّر: أي حساب لم يُكمل (توكن غير مستخدَم) يطابق اسمه المعياري حسابًا
--     آخر ⇒ تكرار محتمل. match_completed=true يعني التوأم عضو مكتمل فعلًا.
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.find_pending_member_duplicates();

CREATE FUNCTION public.find_pending_member_duplicates()
 RETURNS TABLE(pending_id uuid, pending_name text, pending_email text, pending_status text,
               match_id uuid, match_name text, match_email text, match_status text, match_completed boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
    WITH pend AS (
        SELECT DISTINCT p.id, p.full_name, p.email, p.account_status,
               lower(regexp_replace(btrim(p.full_name), '\s+', ' ', 'g')) AS nn
        FROM member_onboarding_tokens t
        JOIN profiles p ON p.id = t.user_id
        WHERE t.is_used = false
          AND p.full_name IS NOT NULL AND btrim(p.full_name) <> ''
    ),
    others AS (
        SELECT pr.id, pr.full_name, pr.email, pr.account_status,
               lower(regexp_replace(btrim(pr.full_name), '\s+', ' ', 'g')) AS nn,
               EXISTS (SELECT 1 FROM member_details md WHERE md.user_id = pr.id) AS completed
        FROM profiles pr
        WHERE pr.full_name IS NOT NULL AND btrim(pr.full_name) <> ''
    )
    SELECT pend.id, pend.full_name, pend.email, pend.account_status,
           o.id, o.full_name, o.email, o.account_status, o.completed
    FROM pend
    JOIN others o ON pend.nn = o.nn AND pend.id <> o.id
    ORDER BY pend.full_name;
$function$;

GRANT EXECUTE ON FUNCTION public.find_pending_member_duplicates() TO authenticated;
