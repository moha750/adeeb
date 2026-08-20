-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260801035149   الاسم: v1_death_00c_rewrite_dependent_functions_2

CREATE OR REPLACE FUNCTION public.get_unread_notifications_count(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    unread_count INT;
BEGIN
    SELECT COUNT(*)::INT INTO unread_count
    FROM notifications n
    LEFT JOIN notification_reads nr
           ON nr.notification_id = n.id AND nr.user_id = p_user_id
    WHERE
        nr.id IS NULL
        AND (n.expires_at IS NULL OR n.expires_at > NOW())
        AND (
            n.target_audience = 'all'
            OR (n.target_audience = 'specific_users' AND p_user_id = ANY(n.target_user_ids))
            OR (n.target_audience = 'members' AND EXISTS (
                SELECT 1 FROM member_details WHERE user_id = p_user_id
            ))
            OR (n.target_audience = 'committee_leaders' AND EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON r.role_name = ur.role_name
                WHERE ur.user_id = p_user_id AND r.role_name = 'committee_leader'
            ))
            OR (n.target_audience = 'admins' AND EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON r.role_name = ur.role_name
                WHERE ur.user_id = p_user_id AND r.role_name IN ('admin','super_admin')
            ))
            OR (n.target_audience = 'election_admins' AND has_election_admin_permission(p_user_id))
            OR (n.target_audience = 'specific_committee' AND EXISTS (
                SELECT 1 FROM user_roles
                WHERE user_id = p_user_id AND committee_id = n.target_committee_id
            ))
            OR (n.target_audience = 'election_voters' AND n.target_election_id IS NOT NULL AND (
                public.is_top_admin_role(p_user_id)
                OR EXISTS (
                    SELECT 1 FROM elections e
                    WHERE e.id = n.target_election_id
                      AND (
                        (e.target_committee_id IS NOT NULL AND EXISTS (
                            SELECT 1 FROM user_roles ur
                            WHERE ur.user_id = p_user_id
                              AND ur.committee_id = e.target_committee_id
                              AND ur.is_active
                        ))
                        OR
                        (e.target_department_id IS NOT NULL AND EXISTS (
                            SELECT 1 FROM user_roles ur
                            JOIN committees c2 ON c2.id = ur.committee_id
                            WHERE ur.user_id = p_user_id
                              AND c2.department_id = e.target_department_id
                              AND ur.is_active
                        ))
                      )
                )
            ))
            OR (n.target_audience = 'election_candidates' AND n.target_election_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM election_candidates ec
                WHERE ec.election_id = n.target_election_id
                  AND ec.user_id = p_user_id
                  AND ec.status IN ('pending','approved','needs_edit')
            ))
            OR (n.target_audience = 'election_participants' AND n.target_election_id IS NOT NULL AND (
                public.is_top_admin_role(p_user_id)
                OR EXISTS (
                    SELECT 1 FROM election_candidates ec
                    WHERE ec.election_id = n.target_election_id
                      AND ec.user_id = p_user_id
                      AND ec.status IN ('pending','approved','needs_edit','withdrawn','rejected')
                )
                OR EXISTS (
                    SELECT 1 FROM elections e
                    WHERE e.id = n.target_election_id
                      AND (
                        (e.target_committee_id IS NOT NULL AND EXISTS (
                            SELECT 1 FROM user_roles ur
                            WHERE ur.user_id = p_user_id
                              AND ur.committee_id = e.target_committee_id
                              AND ur.is_active
                        ))
                        OR
                        (e.target_department_id IS NOT NULL AND EXISTS (
                            SELECT 1 FROM user_roles ur
                            JOIN committees c2 ON c2.id = ur.committee_id
                            WHERE ur.user_id = p_user_id
                              AND c2.department_id = e.target_department_id
                              AND ur.is_active
                        ))
                      )
                )
            ))
        );

    RETURN unread_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_all_permissions(p_user_id uuid)
 RETURNS TABLE(permission_key text, permission_name_ar text, category text, source text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        perm.permission_key,
        perm.permission_name_ar,
        perm.category,
        'role'::TEXT AS source
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_name = ur.role_name
    JOIN permissions perm    ON perm.id = rp.permission_id
    WHERE ur.user_id  = p_user_id
      AND ur.is_active = true

    UNION

    SELECT DISTINCT
        perm.permission_key,
        perm.permission_name_ar,
        perm.category,
        'user'::TEXT AS source
    FROM user_specific_permissions usp
    JOIN permissions perm ON perm.id = usp.permission_id
    WHERE usp.user_id   = p_user_id
      AND usp.is_granted = true
      AND (usp.expires_at IS NULL OR usp.expires_at > now());
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_notifications(p_user_id uuid, p_limit integer DEFAULT 50)
 RETURNS TABLE(id integer, title text, message text, type text, priority text, icon text, action_url text, action_label text, created_at timestamp with time zone, is_read boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        n.id, n.title, n.message, n.type, n.priority, n.icon,
        n.action_url, n.action_label, n.created_at,
        (nr.id IS NOT NULL) AS is_read
    FROM notifications n
    LEFT JOIN notification_reads nr
           ON nr.notification_id = n.id AND nr.user_id = p_user_id
    WHERE
        (n.expires_at IS NULL OR n.expires_at > NOW())
        AND (
            n.target_audience = 'all'
            OR (n.target_audience = 'specific_users' AND p_user_id = ANY(n.target_user_ids))
            OR (n.target_audience = 'members' AND EXISTS (
                SELECT 1 FROM member_details WHERE user_id = p_user_id
            ))
            OR (n.target_audience = 'committee_leaders' AND EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON r.role_name = ur.role_name
                WHERE ur.user_id = p_user_id AND r.role_name = 'committee_leader'
            ))
            OR (n.target_audience = 'admins' AND EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON r.role_name = ur.role_name
                WHERE ur.user_id = p_user_id AND r.role_name IN ('admin','super_admin')
            ))
            OR (n.target_audience = 'election_admins' AND has_election_admin_permission(p_user_id))
            OR (n.target_audience = 'specific_committee' AND EXISTS (
                SELECT 1 FROM user_roles
                WHERE user_id = p_user_id AND committee_id = n.target_committee_id
            ))
            OR (n.target_audience = 'election_voters' AND n.target_election_id IS NOT NULL AND (
                public.is_top_admin_role(p_user_id)
                OR EXISTS (
                    SELECT 1
                    FROM elections e
                    WHERE e.id = n.target_election_id
                      AND (
                        (e.target_committee_id IS NOT NULL AND EXISTS (
                            SELECT 1 FROM user_roles ur
                            WHERE ur.user_id = p_user_id
                              AND ur.committee_id = e.target_committee_id
                              AND ur.is_active
                        ))
                        OR
                        (e.target_department_id IS NOT NULL AND EXISTS (
                            SELECT 1 FROM user_roles ur
                            JOIN committees c2 ON c2.id = ur.committee_id
                            WHERE ur.user_id = p_user_id
                              AND c2.department_id = e.target_department_id
                              AND ur.is_active
                        ))
                      )
                )
            ))
            OR (n.target_audience = 'election_candidates' AND n.target_election_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM election_candidates ec
                WHERE ec.election_id = n.target_election_id
                  AND ec.user_id = p_user_id
                  AND ec.status IN ('pending','approved','needs_edit')
            ))
            OR (n.target_audience = 'election_participants' AND n.target_election_id IS NOT NULL AND (
                public.is_top_admin_role(p_user_id)
                OR EXISTS (
                    SELECT 1 FROM election_candidates ec
                    WHERE ec.election_id = n.target_election_id
                      AND ec.user_id = p_user_id
                      AND ec.status IN ('pending','approved','needs_edit','withdrawn','rejected')
                )
                OR EXISTS (
                    SELECT 1 FROM elections e
                    WHERE e.id = n.target_election_id
                      AND (
                        (e.target_committee_id IS NOT NULL AND EXISTS (
                            SELECT 1 FROM user_roles ur
                            WHERE ur.user_id = p_user_id
                              AND ur.committee_id = e.target_committee_id
                              AND ur.is_active
                        ))
                        OR
                        (e.target_department_id IS NOT NULL AND EXISTS (
                            SELECT 1 FROM user_roles ur
                            JOIN committees c2 ON c2.id = ur.committee_id
                            WHERE ur.user_id = p_user_id
                              AND c2.department_id = e.target_department_id
                              AND ur.is_active
                        ))
                      )
                )
            ))
        )
    ORDER BY n.created_at DESC
    LIMIT p_limit;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id uuid)
 RETURNS TABLE(permission_key text, permission_name_ar text, category text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    -- صلاحيات الدور
    SELECT DISTINCT
        perm.permission_key,
        perm.permission_name_ar,
        perm.category
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_name = ur.role_name
    JOIN permissions perm    ON perm.id = rp.permission_id
    WHERE ur.user_id  = p_user_id
      AND ur.is_active = true

    UNION

    -- الصلاحيات الفردية المضافة
    SELECT DISTINCT
        perm.permission_key,
        perm.permission_name_ar,
        perm.category
    FROM user_specific_permissions usp
    JOIN permissions perm ON perm.id = usp.permission_id
    WHERE usp.user_id   = p_user_id
      AND usp.is_granted = true
      AND (usp.expires_at IS NULL OR usp.expires_at > now())

    EXCEPT

    -- حذف الصلاحيات المحظورة صراحةً
    SELECT DISTINCT
        perm.permission_key,
        perm.permission_name_ar,
        perm.category
    FROM user_specific_permissions usp
    JOIN permissions perm ON perm.id = usp.permission_id
    WHERE usp.user_id   = p_user_id
      AND usp.is_granted = false
      AND (usp.expires_at IS NULL OR usp.expires_at > now());
END;
$function$;

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
    when 'committee_leader' then 9 when 'activity_coordinator' then 10
    when 'deputy_committee_leader' then 11 when 'committee_member' then 12
    else 99 end
  limit 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_vote_weight(p_user uuid)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    select coalesce(max(r.vote_weight), 1.0)
    from user_roles ur
    join roles r on r.role_name = ur.role_name
    where ur.user_id = p_user
      and ur.is_active = true;
$function$;

CREATE OR REPLACE FUNCTION public.has_election_view_permission(p_user uuid, p_election uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    exists (
      select 1
      from user_roles ur
      join roles r on r.role_name = ur.role_name
      where ur.user_id = p_user and ur.is_active
        and r.role_name = 'president_advisor'
    )
    or exists (
      select 1
      from committee_supervision cs
      join committees u on u.id = cs.unit_id and u.member_role_name = 'hr_admin_member'
      join elections e on e.id = p_election
      where cs.supervisor_id = p_user
        and e.target_committee_id is not null
        and cs.committee_id = e.target_committee_id
    );
$function$;

CREATE OR REPLACE FUNCTION public.is_target_position_vacant(p_role_name text, p_committee_id integer, p_department_id integer)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_occupied BOOLEAN := false;
BEGIN
    IF p_role_name = 'committee_leader' THEN
        IF p_committee_id IS NULL THEN RETURN true; END IF;
        SELECT EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.role_name = ur.role_name
            WHERE ur.is_active
              AND r.role_name = 'committee_leader'
              AND ur.committee_id = p_committee_id
        ) INTO v_occupied;

    ELSIF p_role_name = 'deputy_committee_leader' THEN
        IF p_committee_id IS NULL THEN RETURN true; END IF;
        SELECT EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.role_name = ur.role_name
            WHERE ur.is_active
              AND r.role_name = 'deputy_committee_leader'
              AND ur.committee_id = p_committee_id
        ) INTO v_occupied;

    ELSIF p_role_name = 'department_head' THEN
        IF p_department_id IS NULL THEN RETURN true; END IF;
        SELECT EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.role_name = ur.role_name
            WHERE ur.is_active
              AND r.role_name = 'department_head'
              AND ur.department_id = p_department_id
        ) INTO v_occupied;

    ELSE
        RETURN true;
    END IF;

    RETURN NOT v_occupied;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_top_admin_role(p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    select exists (
        select 1 from user_roles ur join roles r on r.role_name = ur.role_name
        where ur.user_id = p_user and ur.is_active and r.votes_in_all_elections
    );
$function$;

CREATE OR REPLACE FUNCTION public.is_user_eligible_to_run(p_user uuid, p_election uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_election   elections%ROWTYPE;
    v_blocks     boolean;
    v_in_scope   boolean;
    v_has_active boolean;
    v_has_prior  boolean;
begin
    select * into v_election from elections where id = p_election;
    if not found or v_election.status <> 'candidacy_open' or v_election.archived_at is not null then
        return false;
    end if;

    -- (أ) لا يترشّح عضو المجلس الإداريّ (رقابةٌ لا تنافس) — يعيد الحظر السباعيّ من
    --     الميتاداتا ويسدّ ثغرة مزدوج الدور. ثمّ لا بدّ من قدرة run_for_election.
    if exists (
        select 1 from user_roles ur join roles r on r.role_name = ur.role_name
        where ur.user_id = p_user and ur.is_active and r.council_type = 'administrative'
    ) then return false; end if;
    if not coalesce(check_user_permission(p_user, 'run_for_election'), false) then return false; end if;

    -- (ب) قيود التعارض البنيويّة + النطاق
    if v_election.target_role_name = 'department_head' then
        select exists (
            select 1 from user_roles ur join roles r on r.role_name = ur.role_name
            where ur.user_id = p_user and ur.is_active and r.role_name = 'department_head'
        ) into v_blocks;
        if v_blocks then return false; end if;

        select exists (
            select 1 from user_roles ur join committees c on c.id = ur.committee_id
            where ur.user_id = p_user and ur.is_active
              and c.department_id = v_election.target_department_id
        ) into v_in_scope;

    elsif v_election.target_role_name = 'committee_leader' then
        select exists (
            select 1 from user_roles ur join roles r on r.role_name = ur.role_name
            join committees c on c.id = v_election.target_committee_id
            where ur.user_id = p_user and ur.is_active
              and r.role_name = 'department_head' and ur.department_id = c.department_id
        ) into v_blocks;
        if v_blocks then return false; end if;

        select exists (
            select 1 from user_roles ur join roles r on r.role_name = ur.role_name
            where ur.user_id = p_user and ur.is_active
              and r.role_name = 'committee_leader' and ur.committee_id = v_election.target_committee_id
        ) into v_blocks;
        if v_blocks then return false; end if;

        select exists (
            select 1 from user_roles ur
            where ur.user_id = p_user and ur.is_active and ur.committee_id = v_election.target_committee_id
        ) into v_in_scope;

    else -- deputy_committee_leader
        select exists (
            select 1 from user_roles ur join roles r on r.role_name = ur.role_name
            join committees c on c.id = v_election.target_committee_id
            where ur.user_id = p_user and ur.is_active
              and r.role_name = 'department_head' and ur.department_id = c.department_id
        ) into v_blocks;
        if v_blocks then return false; end if;

        select exists (
            select 1 from user_roles ur join roles r on r.role_name = ur.role_name
            where ur.user_id = p_user and ur.is_active
              and r.role_name = 'committee_leader' and ur.committee_id = v_election.target_committee_id
        ) into v_blocks;
        if v_blocks then return false; end if;

        select exists (
            select 1 from user_roles ur join roles r on r.role_name = ur.role_name
            where ur.user_id = p_user and ur.is_active
              and r.role_name = 'deputy_committee_leader' and ur.committee_id = v_election.target_committee_id
        ) into v_blocks;
        if v_blocks then return false; end if;

        select exists (
            select 1 from user_roles ur
            where ur.user_id = p_user and ur.is_active and ur.committee_id = v_election.target_committee_id
        ) into v_in_scope;
    end if;

    if not coalesce(v_in_scope, false) then return false; end if;

    -- (ج) لا ترشّح سابق على هذا الانتخاب بعينه، ولا ترشّح نشط في انتخابٍ آخر
    select exists (
        select 1 from election_candidates ec
        where ec.election_id = p_election and ec.user_id = p_user
    ) into v_has_prior;
    if v_has_prior then return false; end if;

    select exists (
        select 1 from election_candidates ec join elections e on e.id = ec.election_id
        where ec.user_id = p_user and ec.status in ('pending','approved','needs_edit')
          and e.archived_at is null
          and e.status in ('candidacy_open','candidacy_closed','voting_open','voting_closed')
    ) into v_has_active;

    return not v_has_active;
end;
$function$;

CREATE OR REPLACE FUNCTION public.list_activity_coordinators()
 RETURNS TABLE(user_role_id integer, user_id uuid, full_name text, email text, phone text, is_active boolean, assigned_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_admin BOOLEAN;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
    v_is_admin := check_user_permission(v_user_id, 'manage_activities');
    IF NOT v_is_admin THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;
    RETURN QUERY
    SELECT ur.id, ur.user_id, p.full_name, p.email, p.phone, ur.is_active, ur.assigned_at
    FROM user_roles ur JOIN roles r ON r.role_name=ur.role_name JOIN profiles p ON p.id=ur.user_id
    WHERE r.role_name='activity_coordinator'
    ORDER BY ur.is_active DESC, ur.assigned_at DESC;
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
    v_authorized   BOOLEAN;
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

    v_authorized := check_user_permission(v_user_id, 'manage_activities') OR EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.role_name = ur.role_name WHERE ur.user_id = v_user_id AND ur.is_active = true AND r.role_name = 'activity_coordinator');

    IF NOT v_authorized THEN
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

CREATE OR REPLACE FUNCTION public.search_members_for_coordinator(p_query text)
 RETURNS TABLE(user_id uuid, full_name text, email text, phone text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_admin BOOLEAN;
    v_q TEXT;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
    v_is_admin := check_user_permission(v_user_id, 'manage_activities');
    IF NOT v_is_admin THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;
    v_q := '%' || COALESCE(NULLIF(TRIM(p_query), ''), '') || '%';
    RETURN QUERY
    SELECT p.id, p.full_name, p.email, p.phone
    FROM profiles p
    WHERE p.account_status='active'
      AND (p.full_name ILIKE v_q OR p.email ILIKE v_q OR COALESCE(p.phone,'') ILIKE v_q)
      AND NOT EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.role_name=ur.role_name
                      WHERE ur.user_id=p.id AND ur.is_active=true AND r.role_name='activity_coordinator')
    ORDER BY p.full_name LIMIT 20;
END;
$function$;
