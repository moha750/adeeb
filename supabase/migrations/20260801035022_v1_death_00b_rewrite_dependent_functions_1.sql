-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260801035022   الاسم: v1_death_00b_rewrite_dependent_functions_1

CREATE OR REPLACE FUNCTION public.can_manage_site_visits(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_name = r.role_name
        JOIN public.role_permissions rp ON r.role_name = rp.role_name
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = p_user_id
            AND ur.is_active = true
            AND p.permission_key = 'manage_site_visits'
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_view_site_visits(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_name = r.role_name
        JOIN public.role_permissions rp ON r.role_name = rp.role_name
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = p_user_id
            AND ur.is_active = true
            AND p.permission_key = 'view_site_visits'
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_permission(p_user_id uuid, p_permission_key text, p_scope text DEFAULT 'all'::text, p_context jsonb DEFAULT '{}'::jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_has_permission BOOLEAN := false;
    v_user_specific_permission BOOLEAN;
    v_permission_id INTEGER;
BEGIN
    -- الحصول على معرف الصلاحية
    SELECT id INTO v_permission_id
    FROM public.permissions
    WHERE permission_key = p_permission_key;

    IF v_permission_id IS NULL THEN
        RETURN false;
    END IF;

    -- 1. التحقق من الصلاحيات الخاصة بالمستخدم (أولوية قصوى)
    SELECT is_granted INTO v_user_specific_permission
    FROM public.user_specific_permissions
    WHERE user_id = p_user_id
        AND permission_id = v_permission_id
        AND (scope = p_scope OR scope = 'all')
        AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY
        CASE WHEN scope = p_scope THEN 1 ELSE 2 END
    LIMIT 1;

    -- إذا وجدت صلاحية خاصة، استخدمها (سواء منح أو حظر)
    IF v_user_specific_permission IS NOT NULL THEN
        RETURN v_user_specific_permission;
    END IF;

    -- 2. التحقق من صلاحيات الدور
    SELECT EXISTS(
        SELECT 1
        FROM public.user_roles ur
        JOIN public.role_permissions rp ON ur.role_name = rp.role_name
        WHERE ur.user_id = p_user_id
            AND ur.is_active = true
            AND rp.permission_id = v_permission_id
            AND (rp.scope = p_scope OR rp.scope = 'all')
    ) INTO v_has_permission;

    RETURN v_has_permission;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_user_permission(user_uuid uuid, perm_name text, action_type text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    has_permission BOOLEAN := false;
BEGIN
    SELECT
        CASE action_type
            WHEN 'create' THEN rp.can_create
            WHEN 'read' THEN rp.can_read
            WHEN 'update' THEN rp.can_update
            WHEN 'delete' THEN rp.can_delete
            ELSE false
        END INTO has_permission
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_name = rp.role_name
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = user_uuid
        AND ur.is_active = true
        AND p.permission_name = perm_name
    LIMIT 1;

    RETURN COALESCE(has_permission, false);
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_user_permission(p_user_id uuid, p_permission_key text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    -- المنح: من الدور أو فرديًّا
    (
      exists (
        select 1 from user_roles ur
        join role_permissions rp on rp.role_name = ur.role_name
        join permissions p on p.id = rp.permission_id
        where ur.user_id = p_user_id and ur.is_active
          and p.permission_key = p_permission_key
      )
      or exists (
        select 1 from user_specific_permissions usp
        join permissions p on p.id = usp.permission_id
        where usp.user_id = p_user_id and usp.is_granted
          and (usp.expires_at is null or usp.expires_at > now())
          and p.permission_key = p_permission_key
      )
    )
    -- والحظر الفرديّ يعلو على المنح — كما في `get_user_permissions` (EXCEPT)
    and not exists (
      select 1 from user_specific_permissions usp
      join permissions p on p.id = usp.permission_id
      where usp.user_id = p_user_id and usp.is_granted = false
        and (usp.expires_at is null or usp.expires_at > now())
        and p.permission_key = p_permission_key
    );
$function$;

CREATE OR REPLACE FUNCTION public.get_active_attendance_windows()
 RETURNS TABLE(id uuid, name text, location text, activity_date date, start_time time without time zone, end_time time without time zone, confirmed_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_authorized BOOLEAN;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'NOT_AUTHENTICATED';
    END IF;

    v_authorized := check_user_permission(v_user_id, 'manage_activities') OR EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.role_name = ur.role_name WHERE ur.user_id = v_user_id AND ur.is_active = true AND r.role_name = 'activity_coordinator');

    IF NOT v_authorized THEN
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
    v_authorized BOOLEAN;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'NOT_AUTHENTICATED';
    END IF;

    v_authorized := check_user_permission(v_user_id, 'manage_activities') OR EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.role_name = ur.role_name WHERE ur.user_id = v_user_id AND ur.is_active = true AND r.role_name = 'activity_coordinator');

    IF NOT v_authorized THEN
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
      'activity_coordinator',
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

CREATE OR REPLACE FUNCTION public.get_election_voters_participation(p_election uuid)
 RETURNS TABLE(user_id uuid, full_name text, role_name text, has_voted boolean, voted_at timestamp with time zone, vote_weight numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_election elections%ROWTYPE;
begin
    select * into v_election from elections where id = p_election;
    if not found then raise exception 'الانتخاب غير موجود'; end if;

    if not has_election_admin_permission(auth.uid())
       and not has_election_view_permission(auth.uid(), p_election) then
        raise exception 'غير مصرح بعرض قائمة المصوّتين';
    end if;

    return query
    with eligible as (
        select distinct ur.user_id as uid
        from user_roles ur join roles r on r.role_name = ur.role_name
        where ur.is_active and r.votes_in_all_elections
        union
        select distinct ur.user_id as uid
        from user_roles ur
        where ur.is_active
          and (
              (v_election.target_role_name = 'department_head'
                and exists (select 1 from committees c
                            where c.id = ur.committee_id
                              and c.department_id = v_election.target_department_id))
              or
              (v_election.target_role_name in ('committee_leader','deputy_committee_leader')
                and ur.committee_id = v_election.target_committee_id)
          )
    )
    select p.id, p.full_name,
           coalesce(get_user_primary_role(p.id), 'unknown'),
           v.id is not null, v.created_at, v.vote_weight
    from eligible e
    join profiles p on p.id = e.uid
    left join election_votes v on v.election_id = p_election and v.voter_id = p.id
    order by (v.id is not null) desc, p.full_name;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_occupied_positions()
 RETURNS TABLE(role_name text, committee_id integer, department_id integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT r.role_name::TEXT, ur.committee_id, ur.department_id
    FROM user_roles ur
    JOIN roles r ON r.role_name = ur.role_name
    WHERE ur.is_active
      AND r.role_name IN ('committee_leader','deputy_committee_leader','department_head');
$function$;
