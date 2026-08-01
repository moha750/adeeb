-- ════════════════════════════════════════════════════════════════════
-- إعدام الأعمدة المكرّرة الثلاثة وجهاز الاكتمال المعطوب — بعد حفظ ما لا يُحسب
-- ════════════════════════════════════════════════════════════════════
-- الجذر: member_details نسخ حقائق جارتيه فصار لكلٍّ دفتران لا يتزامنان —
--        phone و email لهما الصادق في profiles، و committee_id في user_roles.
--        ومُطلِق الاكتمال، وحده القارئ للعمودين المهجورَين، كان يسم 55 عضوًا كاملًا
--        «ناقصين» ويعمى عن الـ28 الناقصين حقًّا (لا سجلّ لهم فيه أصلًا).
--
-- ما يُفقد وما لا يُفقد:
--   is_complete    قيمة بوليّة تُحسب من جديد — فقدها لا شيء.
--   completed_at   تاريخٌ لا يُحسب، بيته الوحيد هنا (98 ختمًا، 30 يناير–2 يوليو).
--        غير مقروء وتقريبيّ، لكنّه يُحفظ لا يُرمى: يُنقل إلى activity_log حدثًا
--        من نوع complete_onboarding — بيته الأصدق (حدث تدقيق)، وهذا يسدّ ثغرةً:
--        أحداث الإكمال لم تُسجَّل قطّ (الدالّة القديمة تستعمل أعمدة action/entity
--        والجدول action_type/target — فتسقط صامتة).
--
-- الأمان: حفظٌ ثمّ حارسٌ يتحقّق ثمّ إعدام، في معاملةٍ واحدة (الترحيل transactional).
--        إن نقص المحفوظُ عن المطلوب، رُفع استثناءٌ فارتدّ كلُّ شيء ولم يُسقط عمود.
--
-- المكسورون المُصلَحون قبل الإسقاط:
--   get_activity_full_details · list_certificates_for_send — COALESCE(v.phone, p.phone, md.phone)
--        صار الطرف الثالث ميتًا بعد اكتمال profiles.phone؛ يُسقط هو والربط.
--   is_committee_member(uuid,int) — تقرأ العمود المهجور، ميتة (صفر سياسات، صفر استعمال) — تُحذف.
--
-- ملاحظة: idempotent — الحفظ يتخطّى ما حُفظ، والإسقاط بـ IF EXISTS.

-- ─────────────────────────────────────────────
-- 1) الحفظ — ختم الإكمال ينتقل إلى activity_log قبل أن يُعدَم عموده
--    user_id (FK→profiles) يُملأ لمن له ملفّ (فتراه سياسة «own»)، وإلّا NULL؛
--    والهويّة محفوظةٌ دومًا في target_id (نصّ بلا FK) — فلا يضيع اليتيم (98 وله 97 ملفًّا).
-- ─────────────────────────────────────────────
INSERT INTO public.activity_log (user_id, action_type, target_type, target_id, details, created_at)
SELECT
    CASE WHEN EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = md.user_id)
         THEN md.user_id ELSE NULL END,
    'complete_onboarding',
    'user',
    md.user_id::text,
    jsonb_build_object(
        'source', 'backfill:member_details.completed_at',
        'note', 'ختم إكمال محفوظ قبل إعدام العمود'
    ),
    md.completed_at
FROM public.member_details md
WHERE md.completed_at IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.activity_log al
      WHERE al.action_type = 'complete_onboarding'
        AND al.target_id = md.user_id::text
  );

-- ─────────────────────────────────────────────
-- 2) الحارس — لا يُعدَم عمودٌ قبل أن يُحفظ كلُّ ختمٍ فيه
-- ─────────────────────────────────────────────
DO $$
DECLARE
    v_expected INTEGER;
    v_preserved INTEGER;
BEGIN
    SELECT count(*) INTO v_expected
    FROM public.member_details WHERE completed_at IS NOT NULL;

    SELECT count(*) INTO v_preserved
    FROM public.activity_log WHERE action_type = 'complete_onboarding';

    IF v_preserved < v_expected THEN
        RAISE EXCEPTION 'حفظٌ ناقص: % ختمًا محفوظًا مقابل % مطلوبًا — رُدّ كلُّ شيء.',
            v_preserved, v_expected;
    END IF;
END;
$$;

-- ─────────────────────────────────────────────
-- 3) الدالّتان الحيّتان — يُسقط md.phone وربطُ member_details (طرفٌ ميت بعد اكتمال profiles.phone)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_activity_full_details(p_activity_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_user_id       UUID := auth.uid();
    v_is_admin      BOOLEAN;
    v_activity      activities%ROWTYPE;
    v_window_close  TIMESTAMPTZ;
    v_activity_json jsonb;
    v_stats         jsonb;
    v_reservations  jsonb;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'NOT_AUTHENTICATED';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = v_user_id
          AND ur.is_active = true
          AND r.role_level >= 8
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'NOT_AUTHORIZED';
    END IF;

    SELECT * INTO v_activity FROM activities WHERE id = p_activity_id;

    IF v_activity.id IS NULL THEN
        RAISE EXCEPTION 'ACTIVITY_NOT_FOUND';
    END IF;

    v_window_close := (v_activity.activity_date
                       + COALESCE(v_activity.end_time, v_activity.start_time + INTERVAL '1 hour')
                      )::TIMESTAMPTZ + INTERVAL '1 hour';

    SELECT to_jsonb(a) INTO v_activity_json FROM activities a WHERE a.id = p_activity_id;

    SELECT jsonb_build_object(
        'registered_count',          COUNT(*) FILTER (WHERE r.status = 'confirmed'),
        'whatsapp_confirmed_count',  COUNT(*) FILTER (WHERE r.status = 'confirmed' AND r.whatsapp_confirmed_at IS NOT NULL),
        'attended_count',            COUNT(*) FILTER (WHERE r.attendance_status = 'attended'),
        'no_show_count',             COUNT(*) FILTER (
            WHERE r.status = 'confirmed'
              AND r.attendance_status = 'registered'
              AND NOT v_activity.is_cancelled
              AND now() > v_window_close
        ),
        'pending_attendance_count',  COUNT(*) FILTER (
            WHERE r.status = 'confirmed'
              AND r.attendance_status = 'registered'
              AND (v_activity.is_cancelled OR now() <= v_window_close)
        ),
        'certificates_issued_count', COUNT(*) FILTER (WHERE r.certificate_serial IS NOT NULL),
        'certificates_sent_count',   COUNT(*) FILTER (WHERE r.certificate_sent_at IS NOT NULL),
        'cancelled_count',           COUNT(*) FILTER (WHERE r.status = 'cancelled'),
        'attendance_rate',           CASE
            WHEN COUNT(*) FILTER (WHERE r.status = 'confirmed') = 0 THEN 0
            ELSE ROUND(
                COUNT(*) FILTER (WHERE r.attendance_status = 'attended')::numeric
                / COUNT(*) FILTER (WHERE r.status = 'confirmed')::numeric,
                4
            )
        END
    ) INTO v_stats
    FROM activity_reservations r
    WHERE r.activity_id = p_activity_id;

    SELECT COALESCE(jsonb_agg(row_data ORDER BY row_data->>'reserved_at' DESC), '[]'::jsonb)
    INTO v_reservations
    FROM (
        SELECT jsonb_build_object(
            'id',                    r.id,
            'full_name',             COALESCE(v.full_name, p.full_name),
            'phone',                 COALESCE(v.phone, p.phone),
            'email',                 COALESCE(v.email, p.email),
            'gender_at_booking',     r.gender_at_booking,
            'account_type',          CASE WHEN r.visitor_id IS NOT NULL THEN 'visitor' ELSE 'member' END,
            'status',                r.status,
            'reserved_at',           r.reserved_at,
            'cancelled_at',          r.cancelled_at,
            'whatsapp_confirmed_at', r.whatsapp_confirmed_at,
            'attendance_status',     CASE
                WHEN r.attendance_status = 'attended' THEN 'attended'
                WHEN r.status = 'confirmed'
                     AND NOT v_activity.is_cancelled
                     AND now() > v_window_close
                THEN 'no_show'
                ELSE 'registered'
            END,
            'attended_at',           r.attended_at,
            'certificate_serial',    r.certificate_serial,
            'certificate_sent_at',   r.certificate_sent_at
        ) AS row_data
        FROM activity_reservations r
        LEFT JOIN visitors       v  ON v.id = r.visitor_id
        LEFT JOIN profiles       p  ON p.id = r.member_user_id
        WHERE r.activity_id = p_activity_id
    ) t;

    RETURN jsonb_build_object(
        'activity',     v_activity_json,
        'stats',        v_stats,
        'reservations', v_reservations
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.list_certificates_for_send()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_user_id  UUID := auth.uid();
    v_is_admin BOOLEAN;
    v_rows     jsonb;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'NOT_AUTHENTICATED';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = v_user_id
          AND ur.is_active = true
          AND r.role_level >= 8
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'NOT_AUTHORIZED';
    END IF;

    SELECT COALESCE(jsonb_agg(row_data ORDER BY row_data->>'attended_at' DESC NULLS LAST), '[]'::jsonb)
    INTO v_rows
    FROM (
        SELECT jsonb_build_object(
            'id',                  r.id,
            'full_name',           COALESCE(v.full_name, p.full_name),
            'phone',               COALESCE(v.phone, p.phone),
            'gender_at_booking',   r.gender_at_booking,
            'account_type',        CASE WHEN r.visitor_id IS NOT NULL THEN 'visitor' ELSE 'member' END,
            'certificate_serial',  r.certificate_serial,
            'attended_at',         r.attended_at,
            'certificate_sent_at', r.certificate_sent_at,
            'activity_id',         a.id,
            'activity_name',       a.name,
            'activity_date',       a.activity_date,
            'activity_type',       a.activity_type
        ) AS row_data
        FROM activity_reservations r
        JOIN activities a ON a.id = r.activity_id
        LEFT JOIN visitors       v  ON v.id = r.visitor_id
        LEFT JOIN profiles       p  ON p.id = r.member_user_id
        WHERE r.certificate_serial IS NOT NULL
          AND r.attendance_status = 'attended'
    ) t;

    RETURN v_rows;
END;
$function$;

-- ─────────────────────────────────────────────
-- 4) الدالّة الميتة — تقرأ member_details.committee_id، صفر سياسات وصفر استعمال
-- ─────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.is_committee_member(uuid, integer);

-- ─────────────────────────────────────────────
-- 5) جهاز الاكتمال — المُطلِق ثمّ دالّته ثمّ فهرسه (المُطلِق يقرأ committee_id فيحجب إسقاطه)
-- ─────────────────────────────────────────────
DROP TRIGGER IF EXISTS trigger_check_member_details_completion ON public.member_details;
DROP FUNCTION IF EXISTS public.check_member_details_completion();
DROP INDEX IF EXISTS public.idx_member_details_is_complete;

-- ─────────────────────────────────────────────
-- 6) الإسقاط — الأعمدة الخمسة. FK وphone_check وفهرس committee_id تسقط تلقائيًّا مع أعمدتها.
-- ─────────────────────────────────────────────
ALTER TABLE public.member_details
    DROP COLUMN IF EXISTS is_complete,
    DROP COLUMN IF EXISTS completed_at,
    DROP COLUMN IF EXISTS phone,
    DROP COLUMN IF EXISTS email,
    DROP COLUMN IF EXISTS committee_id;
