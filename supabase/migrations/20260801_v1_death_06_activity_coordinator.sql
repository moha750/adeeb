-- موت V1 — تسديد البند ٦: إعدام `activity_coordinator`
--
-- ═══ العلّة ═══
--
-- دورٌ مهجور: **صفر شاغلٍ نشط**، ولم يُذكر في هيكلة النادي التي أقرّها المالك.
-- وكان يحمل قدراتٍ حتّى 2026-08-01 فصار بصفر قدرة كذلك.
--
-- ═══ الترتيب الملزم — ونُفِّذ به ═══
--
--   ١) سطر V2: `lib/roleOrder.ts` — أُزيل في نفس الإيداع (وهو الذِّكر الوحيد في V2).
--   ٢) الدوالّ — هذا الملفّ.
--   ٣) الصفّ — آخر سطرٍ هنا.
--
-- وعكسُه يترك دوالَّ تشير إلى دورٍ غير موجود.
--
-- ═══ التحقّق قبل الإعدام ═══
--
--   • V2: مطابقةٌ واحدة (`roleOrder.ts:15`) — أُزيلت. ودوالّ الحافّة: صفر.
--   • لا مجلس يرأسه (`councils.head_role_name`) ولا لجنة تسمّيه
--     (`committees.leader_role_name`/`member_role_name`) ولا سلطة عضويّة
--     (`membership_authority`) — فلا مفتاح أجنبيّ يعترض.
--   • `assign_position` نُزع منها ذِكرُه في ترحيل البند ٣ (نفس الإنشاء، فلا
--     يُكتب جسدٌ من مئتَي سطرٍ مرّتين).
--
-- ═══ ما لم يُحذف عمدًا ═══
--
-- في `user_roles` **تسعة صفوف** لهذا الدور، كلّها `is_active = false`: إسنادات
-- حقيقيّة لأعضاء بأسمائهم بين 2026-04-27 و2026-05-06. و`user_roles.role_name`
-- ليس مفتاحًا أجنبيًّا إلى `roles`، فلا شيء يجبر حذفها. وهي **تاريخٌ لا حالة**:
-- الصفّ الخامد هو آليّة الأرشفة في هذا الجدول، وكلّ قارئ يرشّح بـ`is_active`.
-- فحذفُ كتالوج الدور لا يستوجب محو من شغله يومًا.
--
-- ═══ دوالّ الحضور — تبسيطٌ لا إعدام ═══
--
-- ثلاثتها كانت تأذن بـ«`manage_activities` **أو** كونك منسّق نشاط». وقد سقط
-- الشقّ الثاني، فبقي التفويض القدراتيّ وحده — وهو الأصل.

begin;

/* ══ ١) دوالّ المنسّق الأربع — تموت مع دورها ═══════════════════════════ */

drop function if exists public.assign_activity_coordinator(uuid);
drop function if exists public.revoke_activity_coordinator(uuid);
drop function if exists public.list_activity_coordinators();
drop function if exists public.search_members_for_coordinator(text);

/* ══ ٢) دوالّ الحضور — يبقى التفويض القدراتيّ وحده ════════════════════ */

CREATE OR REPLACE FUNCTION public.get_active_attendance_windows()
 RETURNS TABLE(id uuid, name text, location text, activity_date date, start_time time without time zone, end_time time without time zone, confirmed_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'NOT_AUTHENTICATED';
    END IF;

    IF NOT check_user_permission(v_user_id, 'manage_activities') THEN
        RAISE EXCEPTION 'NOT_AUTHORIZED';
    END IF;

    RETURN QUERY
    SELECT
        a.id,
        a.name,
        a.location,
        a.activity_date,
        a.start_time,
        a.end_time,
        COUNT(r.id) FILTER (WHERE r.status = 'confirmed')
    FROM activities a
    LEFT JOIN activity_reservations r ON r.activity_id = a.id
    WHERE a.is_published = true
      AND a.is_cancelled = false
      AND now() BETWEEN
            ((a.activity_date + a.start_time) AT TIME ZONE 'Asia/Riyadh') - INTERVAL '1 hour'
            AND
            ((a.activity_date + COALESCE(a.end_time, a.start_time + INTERVAL '1 hour')) AT TIME ZONE 'Asia/Riyadh') + INTERVAL '1 hour'
    GROUP BY a.id
    ORDER BY a.activity_date, a.start_time;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_activity_attendance_list(p_activity_id uuid)
 RETURNS TABLE(reservation_id uuid, full_name text, phone text, gender text, account_type text, attendance_status text, attended_at timestamp with time zone, whatsapp_confirmed_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'NOT_AUTHENTICATED';
    END IF;

    IF NOT check_user_permission(v_user_id, 'manage_activities') THEN
        RAISE EXCEPTION 'NOT_AUTHORIZED';
    END IF;

    RETURN QUERY
    SELECT
        r.id,
        COALESCE(v.full_name, p.full_name) AS full_name,
        COALESCE(v.phone, p.phone)         AS phone,
        r.gender_at_booking,
        CASE WHEN r.visitor_id IS NOT NULL THEN 'visitor' ELSE 'member' END,
        r.attendance_status,
        r.attended_at,
        r.whatsapp_confirmed_at
    FROM activity_reservations r
    LEFT JOIN visitors v ON v.id = r.visitor_id
    LEFT JOIN profiles p ON p.id = r.member_user_id
    WHERE r.activity_id = p_activity_id
      AND r.status = 'confirmed'
    ORDER BY COALESCE(v.full_name, p.full_name);
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_attendance(p_reservation_id uuid, p_status text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_user_id      UUID := auth.uid();
    v_reservation  activity_reservations%ROWTYPE;
    v_activity     activities%ROWTYPE;
    v_window_open  TIMESTAMPTZ;
    v_window_close TIMESTAMPTZ;
    v_serial       TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'NOT_AUTHENTICATED';
    END IF;

    IF p_status NOT IN ('attended','registered') THEN
        RAISE EXCEPTION 'INVALID_STATUS';
    END IF;

    IF NOT check_user_permission(v_user_id, 'manage_activities') THEN
        RAISE EXCEPTION 'NOT_AUTHORIZED';
    END IF;

    SELECT * INTO v_reservation
    FROM activity_reservations
    WHERE id = p_reservation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'RESERVATION_NOT_FOUND';
    END IF;

    IF v_reservation.status = 'cancelled' THEN
        RAISE EXCEPTION 'RESERVATION_CANCELLED';
    END IF;

    SELECT * INTO v_activity
    FROM activities
    WHERE id = v_reservation.activity_id;

    IF v_activity.is_cancelled THEN
        RAISE EXCEPTION 'ACTIVITY_CANCELLED';
    END IF;

    v_window_open  := ((v_activity.activity_date + v_activity.start_time)
                      AT TIME ZONE 'Asia/Riyadh') - INTERVAL '1 hour';
    v_window_close := ((v_activity.activity_date
                        + COALESCE(v_activity.end_time, v_activity.start_time + INTERVAL '1 hour'))
                      AT TIME ZONE 'Asia/Riyadh') + INTERVAL '1 hour';

    IF now() < v_window_open OR now() > v_window_close THEN
        RAISE EXCEPTION 'OUTSIDE_ATTENDANCE_WINDOW';
    END IF;

    PERFORM set_config('app.via_lifecycle_fn', 'true', true);

    IF p_status = 'attended' THEN
        v_serial := COALESCE(v_reservation.certificate_serial,
                             generate_certificate_serial(v_activity.activity_date));

        UPDATE activity_reservations
        SET attendance_status    = 'attended',
            attended_at          = COALESCE(attended_at, now()),
            attendance_marked_by = v_user_id,
            certificate_serial   = v_serial
        WHERE id = p_reservation_id;

        RETURN v_serial;

    ELSE
        UPDATE activity_reservations
        SET attendance_status    = 'registered',
            attended_at          = NULL,
            attendance_marked_by = v_user_id,
            certificate_serial   = NULL
        WHERE id = p_reservation_id;
        RETURN NULL;
    END IF;
END;
$function$;

/* ══ ٣) الرتبة والمجلس — الرتب ١..١١ بلا فجوة، مطابقةً لـroleOrder.ts ══ */

CREATE OR REPLACE FUNCTION public.get_user_primary_role(p_user uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select r.role_name
  from user_roles ur join roles r on r.role_name = ur.role_name
  where ur.user_id = p_user and ur.is_active = true
  order by case r.role_name
    when 'club_president' then 1 when 'president_advisor' then 2
    when 'executive_council_president' then 3 when 'hr_committee_leader' then 4
    when 'qa_committee_leader' then 5 when 'department_head' then 6
    when 'hr_admin_member' then 7 when 'qa_admin_member' then 8
    when 'committee_leader' then 9 when 'deputy_committee_leader' then 10
    when 'committee_member' then 11
    else 99 end
  limit 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_board_members()
 RETURNS TABLE(id uuid, full_name text, avatar_url text, gender text, role_name text, unit_name text, twitter_account text, linkedin_account text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with board_roles as (
    select u.role_key, u.ord::int as ord
    from unnest(array[
      'club_president',
      'president_advisor',
      'executive_council_president',
      'hr_committee_leader',
      'qa_committee_leader',
      'department_head',
      'committee_leader',
      'deputy_committee_leader'
    ]) with ordinality as u(role_key, ord)
  ),
  picked as (
    select distinct on (p.id)
      p.id, p.full_name, p.avatar_url, p.gender,
      r.role_name_ar || coalesce(' ' || hc.committee_name_ar, '') as role_name,
      case when ur.committee_id is not null and ur.committee_id = r.home_committee_id then null
           else coalesce(c.committee_name_ar, d.name_ar) end as unit_name,
      b.ord,
      coalesce('c' || ur.committee_id::text, 'u' || p.id::text) as cluster,
      md.twitter_account, md.linkedin_account
    from profiles p
    join user_roles ur on ur.user_id = p.id and ur.is_active = true
    join roles r       on r.role_name = ur.role_name
    join board_roles b on b.role_key = r.role_name
    left join committees  hc on hc.id = r.home_committee_id
    left join committees  c  on c.id  = ur.committee_id
    left join departments d  on d.id  = ur.department_id
    left join member_details md on md.user_id = p.id
    where p.account_status = 'active'
    order by p.id, b.ord, ur.committee_id
  ),
  clustered as (
    select
      k.*,
      min(k.ord)          over (partition by k.cluster)                                as cluster_ord,
      first_value(k.full_name) over (partition by k.cluster order by k.ord, k.full_name) as cluster_lead
    from picked k
  )
  select
    c.id, c.full_name, c.avatar_url, c.gender,
    c.role_name, c.unit_name, c.twitter_account, c.linkedin_account
  from clustered c
  order by c.cluster_ord, c.cluster_lead, c.ord, c.full_name;
$function$;

/* ══ ٤) الصفّ — آخرًا، بعد أن لم يبقَ من يذكره ═══════════════════════ */

delete from public.roles where role_name = 'activity_coordinator';

commit;

-- ═══ التحقّق بعد التنفيذ ═══
--
-- ١) لم يبقَ ذِكرٌ للدور في القاعدة كلّها:
--
--   select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--    where n.nspname='public' and p.prokind in ('f','p')
--      and pg_get_functiondef(p.oid) ~ 'activity_coordinator';
--   select policyname from pg_policies
--    where coalesce(qual,'')||coalesce(with_check,'') ~ 'activity_coordinator';
--   select role_name from public.roles where role_name = 'activity_coordinator';
--   → صفر صفوف في الثلاثة.
--
-- ٢) والمجلس والرتب لم تتزحزح (البصمة قبل/بعد):
--
--   select count(*) from public.get_board_members();               -- → ١٨
--   select count(*) from public.get_occupied_positions();          -- → ١٤
--
-- ٣) وتسعة الصفوف الخامدة باقية عمدًا — تاريخُ من شغل الدور يومًا:
--
--   select count(*) from public.user_roles where role_name = 'activity_coordinator';
--   → ٩، كلّها is_active = false.
