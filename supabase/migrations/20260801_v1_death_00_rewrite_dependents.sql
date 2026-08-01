-- موت V1 — التمهيد: نزع التوابع قبل الإسقاط
--
-- ═══ لماذا وُجد هذا الملفّ ═══
--
-- الملفّان ٠١ و٠٢ كُتبا بعد جردٍ للمستودع، وصدق الجرد فيما فحص: صفر قارئ في
-- كود V2 وفي دوالّ الحافّة. لكنّه فحص **المستودع** — والقاعدة تحمل قرّاءً
-- لا يعيشون فيه. فحين نُفِّذ ٠١ في 2026-08-01 اعترض:
--
--   ERROR 2BP01: cannot drop column status of table news because other objects
--   depend on it — policy news_select … news_likes_insert … news_public_comments_insert
--
-- والفشل كان صحيحًا: الترحيلان بلا `cascade` عمدًا، فصرخ التابع بدل أن يُحذف
-- صامتًا. وجردُ القاعدة بعده كشف الصورة كاملة، وفيها ما هو أخطر من الصراخ:
--
--   • ١٢ سياسة RLS تقرأ العمودَين نصًّا — تُوقف الإسقاط صارخة (وهذا مأمون).
--   • ٢٤ دالّة تقرأ `role_id` في شرط ربط — **لا يتتبّعها بوستجرس**، فالإسقاط
--     يمرّ عليها صامتًا وتنكسر وقت النداء. وعلى رأسها `check_user_permission`
--     التي يمرّ بها كلّ فحص صلاحيّة في النادي.
--   • دالّةٌ واحدة تقرأ جدولًا يُعدمه ٠١ نفسه — تبقى مكسورةً بصمت كذلك.
--   • المفتاح الأوّليّ لـ`role_permissions` راكبٌ على `role_id`، و`drop column`
--     يُسقط القيود الراكبة **بلا `cascade` وبلا صوت**.
--
-- فهذا الملفّ ينزع كلّ تابعٍ عن الرقم قبل أن يُسقَط، ليصير ٠١ و٠٢ قابلَين
-- للتنفيذ كما كُتبا، بلا حرفٍ يُضاف إليهما ولا `cascade` يُستدعى.
--
-- ═══ التحقّق الذي سبق ═══
--
--   ١) `status` و`workflow_status` متطابقان صفًّا صفًّا: ١٤ published↔published،
--      ١ archived↔archived. فإعادة كتابة سياسات الأخبار نقلٌ لا تغيير.
--   ٢) `roles.role_name` فريد (١٢ منصبًا، ١٢ اسمًا)، و`role_name` غير قابل
--      للعدم في `user_roles` و`role_permissions`، وصفر تناقض بينه وبين الرقم
--      في الجدولين. فتبديل شرط الربط تحويل هويّة خالص.
--   ٣) حارسا الاسم موجودان أصلًا ولا يُفقدان مع العمود:
--      `role_permissions_role_name_permission_key` و`user_roles_user_role_name_committee_key`.
--   ٤) التحويل الآليّ عُرض سطرًا سطرًا قبل اعتماده: ٣٦ سطرًا في ٢٤ دالّة،
--      كلّها شرط ربطٍ واحد لا غير — صفر مطابقة كاذبة وصفر سطرٍ فائت.
--
-- ═══ ملاحظة على الأجساد المنقولة ═══
--
-- الدوالّ في القسم (د) منقولة من `pg_get_functiondef` حرفًا بحرف، ولم يتغيّر
-- فيها إلا شرط الربط. (نُزعت محارف CR الموروثة من ويندوز — تطبيعٌ لا يمسّ
-- المعنى.) وهي أوّل مرّةٍ يملك فيها المستودع نصّ هذه الدوالّ بدل أن يستجوب
-- القاعدة عنه.

begin;

/* ══ أ: سياسات الأخبار الثلاث — من `status` إلى `workflow_status` ═══════════
      الثلاث هي ما أوقف ٠١. والقراءة الصحيحة أصلًا هي `workflow_status`؛
      و`status` لم يكن يعمل إلّا لأنّ تريغرًا ثنائيّ الاتّجاه يزامنهما. */

drop policy if exists news_select on public.news;
create policy news_select on public.news
  as permissive for select to public
  using (
    (workflow_status = 'published'::text)
    or (news_role(auth.uid(), id) <> 'none'::text)
  );

drop policy if exists news_likes_insert on public.news_likes;
create policy news_likes_insert on public.news_likes
  as permissive for insert to public
  with check (
    (exists (
      select 1 from public.news n
       where n.id = news_likes.news_id
         and n.workflow_status = 'published'::text
    ))
    and (
      ((auth.uid() is not null) and (user_id = auth.uid()))
      or ((auth.uid() is null) and (user_id is null) and (guest_identifier is not null))
    )
  );

drop policy if exists news_public_comments_insert on public.news_public_comments;
create policy news_public_comments_insert on public.news_public_comments
  as permissive for insert to public
  with check (
    (is_approved = false)
    and (exists (
      select 1 from public.news n
       where n.id = news_public_comments.news_id
         and n.workflow_status = 'published'::text
    ))
    and (
      ((auth.uid() is not null) and (user_id = auth.uid()) and (guest_name is null))
      or ((auth.uid() is null) and (user_id is null) and (guest_name is not null))
    )
  );

/* ══ ب: تسع سياسات — من الرقم إلى الاسم ════════════════════════════════════
      كلّها كانت تصل إلى `roles` بالرقم لتقرأ منه `role_name` وحده. والاسم
      على `user_roles` نفسه، فالوصلة إلى `roles` تسقط معها: لا تُبدَّل
      إلى ربطٍ بالاسم بل تُحذف — الاسم هو الهويّة، لا مفتاحٌ إليها. */

drop policy if exists departments_modify_president on public.departments;
create policy departments_modify_president on public.departments
  as permissive for all to public
  using (exists (
    select 1 from public.user_roles ur
     where ur.user_id = auth.uid() and ur.is_active = true
       and ur.role_name = 'club_president'::text
  ));

drop policy if exists permissions_admin_all on public.permissions;
create policy permissions_admin_all on public.permissions
  as permissive for all to public
  using (exists (
    select 1 from public.user_roles ur
     where ur.user_id = auth.uid() and ur.is_active = true
       and ur.role_name = 'club_president'::text
  ));

drop policy if exists role_permissions_admin_all on public.role_permissions;
create policy role_permissions_admin_all on public.role_permissions
  as permissive for all to public
  using (exists (
    select 1 from public.user_roles ur
     where ur.user_id = auth.uid() and ur.is_active = true
       and ur.role_name = 'club_president'::text
  ));

drop policy if exists usp_manage_president on public.user_specific_permissions;
create policy usp_manage_president on public.user_specific_permissions
  as permissive for all to authenticated
  using (exists (
    select 1 from public.user_roles ur
     where ur.user_id = auth.uid() and ur.is_active = true
       and ur.role_name = 'club_president'::text
  ));

drop policy if exists committee_leaders_can_read_members_details on public.member_details;
create policy committee_leaders_can_read_members_details on public.member_details
  as permissive for select to public
  using (exists (
    select 1
      from public.user_roles leader_ur
      join public.user_roles member_ur
        on member_ur.committee_id = leader_ur.committee_id
     where leader_ur.user_id = auth.uid()
       and leader_ur.is_active = true
       and leader_ur.role_name = any (array['committee_leader'::text, 'deputy_committee_leader'::text])
       and member_ur.user_id = member_details.user_id
       and member_ur.is_active = true
       and leader_ur.committee_id is not null
  ));

drop policy if exists allow_delete_for_admins on public.membership_applications;
create policy allow_delete_for_admins on public.membership_applications
  as permissive for delete to authenticated
  using (exists (
    select 1 from public.user_roles ur
     where ur.user_id = auth.uid() and ur.is_active = true
       and ur.role_name = any (array['club_president'::text, 'executive_council_president'::text])
  ));

drop policy if exists allow_update_for_admins on public.membership_applications;
create policy allow_update_for_admins on public.membership_applications
  as permissive for update to authenticated
  using (exists (
    select 1 from public.user_roles ur
     where ur.user_id = auth.uid() and ur.is_active = true
       and ur.role_name = any (array['club_president'::text, 'executive_council_president'::text])
  ));

drop policy if exists allow_select_for_service_role on public.membership_applications;
create policy allow_select_for_service_role on public.membership_applications
  as permissive for select to authenticated
  using (exists (
    select 1 from public.user_roles ur
     where ur.user_id = auth.uid() and ur.is_active = true
       and ur.role_name = any (array['club_president'::text, 'executive_council_president'::text, 'committee_leader'::text])
  ));

drop policy if exists "Users can view their notifications" on public.notifications;
create policy "Users can view their notifications" on public.notifications
  as permissive for select to public
  using (
    (target_audience = 'all'::text)
    or ((target_audience = 'specific_users'::text) and (auth.uid() = any (target_user_ids)))
    or ((target_audience = 'members'::text) and (exists (
          select 1 from public.member_details
           where member_details.user_id = auth.uid()
        )))
    or ((target_audience = 'committee_leaders'::text)
        and check_user_permission(auth.uid(), 'view_pending_members'::text))
    or ((target_audience = 'admins'::text) and (exists (
          select 1 from public.user_roles ur
           where ur.user_id = auth.uid() and ur.is_active
             and ur.role_name = any (array['club_president'::text, 'president_advisor'::text])
        )))
    or ((target_audience = 'election_admins'::text) and has_election_admin_permission(auth.uid()))
    or ((target_audience = 'specific_committee'::text) and (exists (
          select 1 from public.user_roles
           where user_roles.user_id = auth.uid()
             and user_roles.committee_id = notifications.target_committee_id
        )))
    or ((target_audience = 'election_voters'::text) and (target_election_id is not null) and (
          is_top_admin_role(auth.uid())
          or (exists (
            select 1 from public.elections e
             where e.id = notifications.target_election_id
               and (
                 ((e.target_committee_id is not null) and (exists (
                    select 1 from public.user_roles ur
                     where ur.user_id = auth.uid()
                       and ur.committee_id = e.target_committee_id
                       and ur.is_active
                 )))
                 or ((e.target_department_id is not null) and (exists (
                    select 1 from public.user_roles ur
                      join public.committees c2 on c2.id = ur.committee_id
                     where ur.user_id = auth.uid()
                       and c2.department_id = e.target_department_id
                       and ur.is_active
                 )))
               )
          ))
        ))
    or ((target_audience = 'election_candidates'::text) and (target_election_id is not null) and (exists (
          select 1 from public.election_candidates ec
           where ec.election_id = notifications.target_election_id
             and ec.user_id = auth.uid()
             and ec.status = any (array['pending'::text, 'approved'::text, 'needs_edit'::text])
        )))
    or ((target_audience = 'election_participants'::text) and (target_election_id is not null) and (
          is_top_admin_role(auth.uid())
          or (exists (
            select 1 from public.election_candidates ec
             where ec.election_id = notifications.target_election_id
               and ec.user_id = auth.uid()
               and ec.status = any (array['pending'::text, 'approved'::text, 'needs_edit'::text, 'withdrawn'::text, 'rejected'::text])
          ))
          or (exists (
            select 1 from public.elections e
             where e.id = notifications.target_election_id
               and (
                 ((e.target_committee_id is not null) and (exists (
                    select 1 from public.user_roles ur
                     where ur.user_id = auth.uid()
                       and ur.committee_id = e.target_committee_id
                       and ur.is_active
                 )))
                 or ((e.target_department_id is not null) and (exists (
                    select 1 from public.user_roles ur
                      join public.committees c2 on c2.id = ur.committee_id
                     where ur.user_id = auth.uid()
                       and c2.department_id = e.target_department_id
                       and ur.is_active
                 )))
               )
          ))
        ))
  );

/* ══ ج: دالّةٌ تموت مع جدولها ══════════════════════════════════════════════
      `can_writer_edit_field` تقرأ `news_field_permissions` — وهو أحد جدولَي
      البند ٨ اللذين يُعدمهما ٠١. وبوستجرس لا يمنع إسقاط الجدول من تحتها،
      فتبقى دالّةً مكسورةً بصمت. مكانُها الإعدام مع جدولها لا الترحيل.
      (صفر قارئ في V2، وصفر صفٍّ في الجدول قطّ.) */

drop function if exists public.can_writer_edit_field(uuid, uuid, text);

/* ══ د: ثلاث وعشرون دالّة — تبديل شرط الربط ═════════════════════════════════
      لا تغيير إلّا في شرط الربط: `r.id = ur.role_id` تصير
      `r.role_name = ur.role_name`، ومثلها ربط `role_permissions`. */

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

/* ══ هـ: ستّ دوالّ تكتب بالرقم — تُحوَّل إلى الكتابة بالاسم ══════════════════
      هذه لا يكفيها تبديل شرط ربط: منها ما يُدرِج `role_id` عمودًا، ومنها ما
      يقرأ `new.role_id` في تريغر، ومنها ما يأخذ الرقم وسيطًا.

      ملاحظة على النافذة بين هذا الملفّ و٠٢: `role_id` يبقى `not null` حتّى
      يُسقَط، وتريغر `sync_role_key` ما زال يشتقّه من الاسم. فالكتابة بالاسم
      وحده تمرّ **قبل ٠٢ وبعده** — وهو ما تفعله لوحة الصلاحيات اليوم. */

CREATE OR REPLACE FUNCTION public.assign_activity_coordinator(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_admin BOOLEAN;
    v_member_name TEXT;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
    v_is_admin := check_user_permission(v_user_id, 'manage_activities');
    IF NOT v_is_admin THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;

    SELECT full_name INTO v_member_name FROM profiles
    WHERE id = p_user_id AND account_status = 'active';
    IF v_member_name IS NULL THEN RAISE EXCEPTION 'MEMBER_NOT_FOUND'; END IF;

    IF NOT EXISTS (SELECT 1 FROM roles WHERE role_name = 'activity_coordinator') THEN
        RAISE EXCEPTION 'ROLE_NOT_FOUND';
    END IF;

    IF EXISTS (SELECT 1 FROM user_roles WHERE user_id=p_user_id AND role_name='activity_coordinator') THEN
        UPDATE user_roles SET is_active=true, assigned_at=now(), assigned_by=v_user_id
        WHERE user_id=p_user_id AND role_name='activity_coordinator';
    ELSE
        -- كانت تُدرِج `role_id` وحده وتترك التريغر يشتقّ الاسم؛ وبعد ٠٢ لا تريغر
        -- ولا رقم، و`role_name` غير قابل للعدم — فالاسم يُكتب صراحةً.
        INSERT INTO user_roles (user_id, role_name, is_active, assigned_by)
        VALUES (p_user_id, 'activity_coordinator', true, v_user_id);
    END IF;

    INSERT INTO notifications (
        title, message, type, priority, icon,
        target_audience, target_user_ids,
        sender_id, action_url, action_label, metadata
    ) VALUES (
        'تم إسداء مهمة جديدة',
        'تم إسداء مهمة "تسجيل الحضور" إليك. يمكنك الآن الدخول إلى تبويب "تسجيل الحضور" لتسجيل حضور المسجّلين في الأنشطة الحيّة.',
        'success',
        'normal',
        'fa-clipboard-check',
        'specific_users',
        ARRAY[p_user_id],
        v_user_id,
        '/admin/dashboard.html#activities-attendance-section',
        'فتح تبويب تسجيل الحضور',
        jsonb_build_object('role', 'activity_coordinator', 'action', 'assigned')
    );

    RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.revoke_activity_coordinator(p_user_id uuid)
 RETURNS boolean
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

    IF NOT EXISTS (SELECT 1 FROM roles WHERE role_name='activity_coordinator') THEN
        RAISE EXCEPTION 'ROLE_NOT_FOUND';
    END IF;

    UPDATE user_roles SET is_active=false WHERE user_id=p_user_id AND role_name='activity_coordinator';
    IF NOT FOUND THEN RAISE EXCEPTION 'COORDINATOR_NOT_FOUND'; END IF;

    -- إشعار للمستخدم المسحوبة منه المهمة
    INSERT INTO notifications (
        title, message, type, priority, icon,
        target_audience, target_user_ids,
        sender_id, metadata
    ) VALUES (
        'انتهاء مهمة',
        'تم سحب مهمة "تسجيل الحضور" منك. لن يظهر تبويب تسجيل الحضور بعد الآن في لوحتك.',
        'info',
        'normal',
        'fa-clipboard-check',
        'specific_users',
        ARRAY[p_user_id],
        v_user_id,
        jsonb_build_object('role', 'activity_coordinator', 'action', 'revoked')
    );

    RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_position_uniqueness()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uniq  text;
  v_other uuid;
begin
  -- الصفّ الميّت لا يشغل مقعدًا؛ التفرّد على الأحياء وحدهم.
  if not new.is_active then return new; end if;

  -- هذا التريغر يسبق `sync_role_key` أبجديًّا (trg_… قبل user_roles_…)، فلو
  -- كتب أحدٌ بالرقم وحده لوصل الاسم فارغًا هنا وسقط الحرس صامتًا. نصرخ بدله.
  if new.role_name is null then
    raise exception 'user_roles: الاسم هو الهويّة — لا يُكتَب صفٌّ بلا role_name.'
      using errcode = '23502';
  end if;

  select holder_uniqueness into v_uniq from roles where role_name = new.role_name;
  if v_uniq is null or v_uniq = 'multi' then return new; end if;

  select ur.user_id into v_other
  from user_roles ur
  where ur.role_name = new.role_name
    and ur.is_active
    and ur.id is distinct from new.id
    and ur.user_id <> new.user_id
    and (v_uniq <> 'per_committee'  or ur.committee_id  is not distinct from new.committee_id)
    and (v_uniq <> 'per_department' or ur.department_id is not distinct from new.department_id)
  limit 1;

  if v_other is not null then
    raise exception 'المنصب مشغول: هذا الدور لا يقبل أكثر من شاغلٍ واحد في هذا النطاق. أزِل الشاغل الحاليّ أو استعمل assign_position بالاستبدال.'
      using errcode = '23505';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.assign_position(p_actor uuid, p_user uuid, p_role integer DEFAULT NULL::integer, p_committee integer DEFAULT NULL::integer, p_department integer DEFAULT NULL::integer, p_replace boolean DEFAULT false, p_notes text DEFAULT NULL::text, p_role_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actor_rank           integer;
  v_target_rank          integer;
  v_role_name            text;
  v_uniq                 text;
  v_home                 integer;
  v_needs_committee      boolean;
  v_needs_department     boolean;
  v_no_scope             boolean;
  v_existing_id          integer;
  v_existing_user        uuid;
  v_other_dept           integer;
  v_row_id               integer;
  v_new_id               integer;
begin
  -- (1) بوّابة أوّليّة: من لا يملك أيّ سلطة إسناد يُردّ هنا قبل أن يعرف شيئًا عن المنصب.
  if not check_user_permission(p_actor, 'manage_positions')
     and not check_user_permission(p_actor, 'assign_unit_members') then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'لا تملك صلاحية إدارة الهيكلة.');
  end if;

  -- رتبة المُنفّذ (بالاسم) — لمنع التصعيد الرأسيّ. الأصغر = الأعلى.
  select min(case ur.role_name
      when 'club_president' then 1 when 'president_advisor' then 2
      when 'executive_council_president' then 3 when 'hr_committee_leader' then 4
      when 'qa_committee_leader' then 5 when 'department_head' then 6
      when 'hr_admin_member' then 7 when 'qa_admin_member' then 8
      when 'committee_leader' then 9 when 'activity_coordinator' then 10
      when 'deputy_committee_leader' then 11 when 'committee_member' then 12
      else 99 end)
  into v_actor_rank
  from user_roles ur
  where ur.user_id = p_actor and ur.is_active;

  if not exists (select 1 from profiles where id = p_user) then
    return jsonb_build_object('ok', false, 'code', 'NO_USER', 'message', 'العضو غير موجود.');
  end if;

  -- (1أ) المرجع: الاسم إن جاء، وإلّا الرقم. والرقم يُترجَم إلى اسمٍ فورًا ولا
  --      يُستعمل بعدها — فالوسيط `p_role` باقٍ للتوافق لا للهويّة.
  if p_role_name is not null then
    select role_name, holder_uniqueness, home_committee_id, (case role_name
        when 'club_president' then 1 when 'president_advisor' then 2
        when 'executive_council_president' then 3 when 'hr_committee_leader' then 4
        when 'qa_committee_leader' then 5 when 'department_head' then 6
        when 'hr_admin_member' then 7 when 'qa_admin_member' then 8
        when 'committee_leader' then 9 when 'activity_coordinator' then 10
        when 'deputy_committee_leader' then 11 when 'committee_member' then 12
        else 99 end)
    into v_role_name, v_uniq, v_home, v_target_rank
    from roles where role_name = p_role_name;
  elsif p_role is not null then
    select role_name, holder_uniqueness, home_committee_id, (case role_name
        when 'club_president' then 1 when 'president_advisor' then 2
        when 'executive_council_president' then 3 when 'hr_committee_leader' then 4
        when 'qa_committee_leader' then 5 when 'department_head' then 6
        when 'hr_admin_member' then 7 when 'qa_admin_member' then 8
        when 'committee_leader' then 9 when 'activity_coordinator' then 10
        when 'deputy_committee_leader' then 11 when 'committee_member' then 12
        else 99 end)
    into v_role_name, v_uniq, v_home, v_target_rank
    from roles where id = p_role;
  else
    return jsonb_build_object('ok', false, 'code', 'NO_ROLE', 'message', 'المنصب غير موجود.');
  end if;

  if v_role_name is null then
    return jsonb_build_object('ok', false, 'code', 'NO_ROLE', 'message', 'المنصب غير موجود.');
  end if;

  -- (1ب) منع التصعيد الرأسيّ
  if v_actor_rank > v_target_rank then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN_LEVEL', 'message', 'لا يمكنك إسناد منصب أعلى من صلاحيتك.');
  end if;

  -- (2) النطاق حسب اسم الدور. أمّا التفرّد فتقوله `roles.holder_uniqueness` ويحرسه التريغر.
  v_needs_committee   := v_role_name in ('committee_leader','deputy_committee_leader','committee_member',
                                         'hr_admin_member','qa_admin_member',
                                         'hr_committee_leader','qa_committee_leader');
  v_needs_department  := v_role_name in ('department_head');
  v_no_scope          := v_role_name in ('club_president','president_advisor','executive_council_president','activity_coordinator');

  if v_no_scope then
    p_committee := null;
    p_department := null;
  end if;

  if v_needs_committee and p_committee is null then
    return jsonb_build_object('ok', false, 'code', 'NEED_COMMITTEE', 'message', 'هذا المنصب يتطلّب تحديد لجنة.');
  end if;
  if v_needs_department and p_department is null then
    return jsonb_build_object('ok', false, 'code', 'NEED_DEPARTMENT', 'message', 'هذا المنصب يتطلّب تحديد قسم.');
  end if;
  if p_committee is not null and not exists (select 1 from committees where id = p_committee) then
    return jsonb_build_object('ok', false, 'code', 'NO_COMMITTEE', 'message', 'اللجنة غير موجودة.');
  end if;
  if p_department is not null and not exists (select 1 from departments where id = p_department) then
    return jsonb_build_object('ok', false, 'code', 'NO_DEPARTMENT', 'message', 'القسم غير موجود.');
  end if;

  -- (2أ) الدور الذي يُصرّح بإدارته الأمّ لا يُسنَد خارجها. وإشراف عضو الإدارة على لجان
  --      التنفيذيّ بابُه `assign_supervision` لا هذا الباب.
  if p_committee is not null and v_home is not null and p_committee <> v_home then
    return jsonb_build_object('ok', false, 'code', 'WRONG_UNIT',
      'message', 'هذا المنصب لا يُسنَد خارج وحدته الأمّ.');
  end if;

  -- (1ج) الحكم الدقيق: هل يبلغ المُنفّذ **هذا الدور** في **هذا النطاق**؟
  if not can_assign_role(p_actor, v_role_name, p_committee) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN',
      'message', 'صلاحيتك لا تبلغ هذا المنصب — لا تُسنِد إلّا أعضاء وحدتك.');
  end if;

  if p_committee is not null
     and exists (select 1 from committees where leader_role_name = v_role_name)
     and not exists (select 1 from committees where id = p_committee and leader_role_name = v_role_name) then
    return jsonb_build_object('ok', false, 'code', 'WRONG_UNIT',
      'message', 'هذا المنصب لا يقود هذه الوحدة.');
  end if;

  if v_role_name = 'department_head' then
    select ur.department_id into v_other_dept
    from user_roles ur
    where ur.user_id = p_user and ur.role_name = v_role_name and ur.is_active
      and ur.department_id is distinct from p_department
    limit 1;
    if v_other_dept is not null then
      return jsonb_build_object('ok', false, 'code', 'ALREADY_HEAD', 'message', 'هذا العضو يرأس قسمًا آخر بالفعل. أزِل رئاسته السابقة أوّلًا.');
    end if;
  end if;

  -- إدارةٌ إداريّةٌ واحدةٌ للشخص — كانت تُنفَّذ إطفاءً صامتًا بعد الكتابة، صارت تُقال وتُردّ.
  if v_role_name in ('hr_admin_member', 'qa_admin_member')
     and exists (
       select 1 from user_roles ur
       where ur.user_id = p_user and ur.is_active
         and ur.role_name in ('hr_admin_member', 'qa_admin_member')
         and ur.role_name <> v_role_name
     ) then
    return jsonb_build_object('ok', false, 'code', 'ALREADY_ADMIN_MEMBER',
      'message', 'هذا العضو في إدارةٍ إداريّةٍ أخرى. أخرِجه منها أوّلًا.');
  end if;

  -- الشاغل المزاحِم — بنطاق التفرّد الذي يقوله الكتالوج. 'multi' لا يزاحم أحدًا.
  if v_uniq is distinct from 'multi' and v_uniq is not null then
    select ur.id, ur.user_id into v_existing_id, v_existing_user
    from user_roles ur
    where ur.role_name = v_role_name and ur.is_active and ur.user_id <> p_user
      and (v_uniq <> 'per_committee'  or ur.committee_id  is not distinct from p_committee)
      and (v_uniq <> 'per_department' or ur.department_id is not distinct from p_department)
    limit 1;
  end if;

  if v_existing_id is not null and not p_replace then
    return jsonb_build_object(
      'ok', false, 'code', 'OCCUPIED',
      'message', 'هذا المنصب مشغول حاليًّا. فعّل الاستبدال لإحلال شخص جديد.',
      'current_user_id', v_existing_user
    );
  end if;

  if v_existing_id is not null and p_replace then
    update user_roles set is_active = false where id = v_existing_id;
  end if;

  select id into v_row_id
  from user_roles
  where user_id = p_user and role_name = v_role_name
    and committee_id is not distinct from p_committee
    and (p_committee is not null or department_id is not distinct from p_department)
  limit 1;

  if v_row_id is not null then
    update user_roles
    set is_active = true, department_id = p_department, assigned_by = p_actor, assigned_at = now(),
        notes = coalesce(p_notes, notes)
    where id = v_row_id;
    v_new_id := v_row_id;
  else
    insert into user_roles (user_id, role_name, committee_id, department_id, is_active, assigned_by, notes)
    values (p_user, v_role_name, p_committee, p_department, true, p_actor, p_notes)
    returning id into v_new_id;
  end if;

  if v_role_name in ('committee_leader', 'deputy_committee_leader') and p_committee is not null then
    update user_roles ur
    set is_active = false
    where ur.role_name = 'committee_member'
      and ur.user_id = p_user and ur.committee_id = p_committee and ur.is_active;
  end if;

  return jsonb_build_object(
    'ok', true,
    'message', 'تمّ الإسناد بنجاح.',
    'user_role_id', v_new_id,
    'replaced_user_id', v_existing_user
  );
end;
$function$;

/* منح القدرة وسحبها: الوسيط `p_role_id` باقٍ كما هو (تغييره تغييرُ عقدٍ لا
   تغييرُ هويّة)، لكنّه يُترجَم إلى اسمٍ داخل الدالّة والكتابة بالاسم.
   وهدف `on conflict` كان `(role_id, permission_id, scope)` ولا فهرس فريدًا
   يطابقه — أي أنّ الدالّة كانت مكسورةً أصلًا؛ صار الهدف القيدَ القائم. */

CREATE OR REPLACE FUNCTION public.grant_permission_to_role(p_role_id integer, p_permission_key text, p_scope text DEFAULT 'all'::text, p_granted_by uuid DEFAULT NULL::uuid, p_conditions jsonb DEFAULT '{}'::jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_permission_id INTEGER;
    v_role_permission_id INTEGER;
    v_role_name TEXT;
BEGIN
    -- الرقم يُترجَم إلى اسم، والاسم وحده هو ما يُكتب
    SELECT role_name INTO v_role_name FROM public.roles WHERE id = p_role_id;

    IF v_role_name IS NULL THEN
        RAISE EXCEPTION 'Role % not found', p_role_id;
    END IF;

    -- الحصول على معرف الصلاحية
    SELECT id INTO v_permission_id
    FROM public.permissions
    WHERE permission_key = p_permission_key;

    IF v_permission_id IS NULL THEN
        RAISE EXCEPTION 'Permission key % not found', p_permission_key;
    END IF;

    -- إدراج أو تحديث الصلاحية
    INSERT INTO public.role_permissions (role_name, permission_id, scope, conditions, granted_by)
    VALUES (v_role_name, v_permission_id, p_scope, p_conditions, p_granted_by)
    ON CONFLICT (role_name, permission_id)
    DO UPDATE SET
        scope = p_scope,
        conditions = p_conditions,
        granted_at = NOW(),
        granted_by = p_granted_by
    RETURNING id INTO v_role_permission_id;

    -- تسجيل في سجل التدقيق
    INSERT INTO public.permissions_audit_log (
        action_type, target_type, target_id, permission_key,
        role_id, performed_by, new_value
    )
    VALUES (
        'grant', 'role_permission', v_role_permission_id, p_permission_key,
        p_role_id, p_granted_by,
        jsonb_build_object('scope', p_scope, 'conditions', p_conditions)
    );

    RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.revoke_permission_from_role(p_role_id integer, p_permission_key text, p_scope text DEFAULT 'all'::text, p_revoked_by uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_permission_id INTEGER;
    v_deleted_id INTEGER;
    v_role_name TEXT;
BEGIN
    SELECT role_name INTO v_role_name FROM public.roles WHERE id = p_role_id;

    IF v_role_name IS NULL THEN
        RETURN false;
    END IF;

    -- الحصول على معرف الصلاحية
    SELECT id INTO v_permission_id
    FROM public.permissions
    WHERE permission_key = p_permission_key;

    IF v_permission_id IS NULL THEN
        RETURN false;
    END IF;

    -- حذف الصلاحية
    DELETE FROM public.role_permissions
    WHERE role_name = v_role_name
        AND permission_id = v_permission_id
        AND scope = p_scope
    RETURNING id INTO v_deleted_id;

    IF v_deleted_id IS NOT NULL THEN
        -- تسجيل في سجل التدقيق
        INSERT INTO public.permissions_audit_log (
            action_type, target_type, target_id, permission_key,
            role_id, performed_by
        )
        VALUES (
            'revoke', 'role_permission', v_deleted_id, p_permission_key,
            p_role_id, p_revoked_by
        );

        RETURN true;
    END IF;

    RETURN false;
END;
$function$;

/* ══ و: المفتاح الأوّليّ ينتقل إلى الاسم ════════════════════════════════════
      `role_permissions_pkey` راكبٌ على `(role_id, permission_id)`. و`drop
      column` في ٠٢ يُسقط القيود الراكبة على العمود **بلا `cascade` وبلا
      صوت** — فلولا هذا القسم لخرج الجدول من ٠٢ بلا مفتاحٍ أوّليّ.
      الحارس الفريد على الاسم قائمٌ أصلًا، فيُرفَع إلى مفتاحٍ أوّليّ. */

alter table public.role_permissions drop constraint role_permissions_pkey;
alter table public.role_permissions drop constraint role_permissions_role_name_permission_key;
alter table public.role_permissions add constraint role_permissions_pkey
  primary key (role_name, permission_id);

/* وفهرسا الرقم يسقطان مع العمود. الاسم على `role_permissions` يقوده المفتاح
   الجديد؛ أمّا `user_roles` فحارسه الفريد يبدأ بـ`user_id`، فالبحث بالاسم
   وحده (وهو ما تفعله `assign_position` و`enforce_position_uniqueness`) يبقى
   بلا فهرس. هذا يخلف `idx_user_roles_role_id`. */

create index if not exists idx_user_roles_role_name on public.user_roles (role_name);

commit;

-- ═══ التحقّق بعد التنفيذ ═══
--
-- ١) لم يبقَ في القاعدة تابعٌ يقرأ الرقم — لا سياسةً ولا دالّة:
--
--   select policyname from pg_policies
--    where (coalesce(qual,'')||coalesce(with_check,'')) ~ '\mrole_id\M';
--   → صفر صفوف.
--
--   select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--    where n.nspname='public' and p.prokind in ('f','p')
--      and pg_get_functiondef(p.oid) ~ '\mrole_id\M'
--      and pg_get_functiondef(p.oid) ~ '(user_roles|role_permissions)'
--      and p.proname not in ('sync_role_key','grant_permission_to_role','revoke_permission_from_role');
--   → صفٌّ واحد: `assign_activity_coordinator` — وهو **تعليقٌ عربيّ** يشرح
--      الترحيل لا كودًا. (والثلاث المستثناة: `sync_role_key` يموت في ٠٢،
--      والأخريان تذكران الرقم وسيطًا لا عمودًا في `role_permissions`.)
--
--   ملحوظة مُرّة انكشفت عند التنفيذ: `grant_permission_to_role` و
--   `revoke_permission_from_role` جثّتان لا دالّتان — تكتبان في
--   `permissions_audit_log` **وهو غير موجود في القاعدة**، وتُسنِدان أعمدة
--   (`scope` · `conditions` · `granted_at` · `granted_by`) **لا وجود لها في
--   `role_permissions`** (أعمدته الأربعة: role_name · permission_id ·
--   created_at، وكان معها role_id). رُحّلتا إلى الاسم كما هما ولم تُصلَحا:
--   إصلاحُهما أو إعدامُهما قرارٌ مستقلّ عن موت V1.
--
-- ٢) لم تبقَ سياسةٌ تقرأ `news.status`:
--
--   select policyname from pg_policies
--    where (coalesce(qual,'')||coalesce(with_check,'')) ~ '\mstatus\M'
--      and tablename in ('news','news_likes','news_public_comments');
--   → لا شيء منها يذكر `n.status` أو `status =` على جدول الأخبار.
--
-- ٣) المفتاح الأوّليّ على الاسم:
--
--   select conname, pg_get_constraintdef(oid) from pg_constraint
--    where conrelid = 'public.role_permissions'::regclass and contype = 'p';
--   → PRIMARY KEY (role_name, permission_id)
--
-- ٤) البصمة لم تتحرّك (هذا الملفّ لا يمسّ صفًّا واحدًا):
--
--   select count(*) from public.news where workflow_status = 'published';  -- → ١٤
--   select count(*) from public.role_permissions;                          -- → ١٤٩
--   select count(*) from public.user_roles where is_active;                -- → ١٥٣
--
-- ٥) وأنّ النظام القدراتيّ ما زال يجيب كما كان — قبل التنفيذ وبعده:
--
--   select count(*) from public.profiles p
--    where check_user_permission(p.id, 'manage_permissions');
--
-- وبعد هذا الملفّ: يُنفَّذ ٠١ ثمّ ٠٢ كما كُتبا، بلا حرفٍ يُضاف.
