-- وحدةُ الشخص من خانة إسناده وحدها.
--
-- كانت للشخص وحدتان تقولان الشيء نفسه: «الوحدة الملازمة» في صفّ دوره، وخانةُ الإسناد
-- في صفّه. وهما في أديب متطابقتان **دائمًا** (فُحص يوم كتابة هذا: أربعةُ مناصبَ لها
-- وحدةٌ ملازمة، وخمسةُ شاغلين، ولا حالةَ افتراقٍ واحدة). فكانت الوحدة مكتوبةً مرّتين،
-- فوجبت قاعدةٌ ثالثة تُسكت إحداهما — وتلك القاعدة هي التي كانت تنتظر من يسقط عنها:
-- من أخذ الرتبةَ واسمَ الوحدة وخاطهما بيده أصاب في تسعةٍ من كلّ أحدَ عشر، ولا يكذب
-- عليه إلّا أهلُ الإدارتين، وهو خطأٌ لا تُظهره مراجعةٌ ولا بناء.
--
-- فحُذفت الازدواجيّة لا القاعدة. وبقيت الوحدةُ الملازمة لعملين لا ثالثَ لهما:
--   · تسميةُ **مقعدٍ بلا شاغل** (كتالوج الأدوار والصلاحيّات) — إذ لا إسناد يُقرأ منه
--   · **قيدٌ** يمنع إسناد المنصب إلى غير وحدته، وهو ما يُسنّ في هذا الملفّ

-- ١. القيد: من له وحدةٌ ملازمة لا يُسنَد إلى غيرها.
--    هو ما جعل الازدواجيّة صادقةً بالعادة، فيصير حكمًا لا عادة. وبه يبقى مسمّى الشخص
--    (رتبة + إسناد) مساويًا لمسمّى مقعده (رتبة + ملازمة) بالضرورة لا بالمصادفة.
create or replace function public.enforce_home_unit_match()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_home integer;
  v_name text;
begin
  select r.home_committee_id into v_home from public.roles r where r.role_name = new.role_name;
  if v_home is null then return new; end if;

  if new.committee_id is distinct from v_home then
    select c.committee_name_ar into v_name from public.committees c where c.id = v_home;
    raise exception 'المنصب «%» لا يُسنَد إلّا في %', new.role_name, coalesce(v_name, v_home::text)
      using errcode = 'check_violation';
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_enforce_home_unit_match on public.user_roles;
create trigger trg_enforce_home_unit_match
  before insert or update of role_name, committee_id on public.user_roles
  for each row execute function public.enforce_home_unit_match();

comment on function public.enforce_home_unit_match() is
  'من له وحدةٌ ملازمة لا يُسنَد إلى غيرها — فيتطابق مسمّى الشخص ومسمّى مقعده بالضرورة (20260811).';

comment on column public.roles.home_committee_id is
  'وحدةُ المنصب الملازمة — **لتسمية مقعدٍ بلا شاغل** ولقيد الإسناد فقط. ولا تدخل مسمّى شخصٍ البتّة: وحدةُ الشخص من خانة إسناده (lib/positionLabel).';


-- ٢. القرّاء يُخرجون ما صار يُقرأ: الرتبة مجرّدةً ووحدةَ الإسناد. وتسقط أعمدةُ الوحدة
--    الملازمة التي كانت تُرسَل ليُقارَن بها — فلا مقارنةَ بعد اليوم.
drop function if exists public.get_board_members();

create function public.get_board_members()
 returns table(
   id uuid, full_name text, avatar_url text, gender text,
   role_ar text, unit_name text,
   twitter_account text, linkedin_account text, public_slug text
 )
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  with board_roles as (
    select u.role_key, u.ord::int as ord
    from unnest(array[
      'club_president','president_advisor','executive_council_president',
      'hr_committee_leader','qa_committee_leader','department_head',
      'committee_leader','deputy_committee_leader'
    ]) with ordinality as u(role_key, ord)
  ),
  picked as (
    select distinct on (p.id)
      p.id, p.full_name, p.avatar_url, p.gender,
      r.role_name_ar as role_ar,
      coalesce(c.committee_name_ar, d.name_ar) as unit_name,
      b.ord,
      coalesce('c' || ur.committee_id::text, 'u' || p.id::text) as cluster,
      md.twitter_account, md.linkedin_account,
      p.public_slug
    from profiles p
    join user_roles ur on ur.user_id = p.id and ur.is_active = true
    join roles r       on r.role_name = ur.role_name
    join board_roles b on b.role_key = r.role_name
    left join committees  c on c.id = ur.committee_id
    left join departments d on d.id = ur.department_id
    left join member_details md on md.user_id = p.id
    where p.account_status = 'active'
    order by p.id, b.ord, ur.committee_id
  ),
  clustered as (
    select k.*,
      min(k.ord) over (partition by k.cluster) as cluster_ord,
      first_value(k.full_name) over (partition by k.cluster order by k.ord, k.full_name) as cluster_lead
    from picked k
  )
  select c.id, c.full_name, c.avatar_url, c.gender, c.role_ar, c.unit_name,
         c.twitter_account, c.linkedin_account, c.public_slug
  from clustered c
  order by c.cluster_ord, c.cluster_lead, c.ord, c.full_name;
$function$;

grant execute on function public.get_board_members() to anon, authenticated, service_role;


-- ٣. الصفحة العلنيّة — القطعتان صارتا رتبةً ووحدةَ إسناد.
create or replace function public.get_public_profile(p_slug text)
 returns jsonb
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select jsonb_build_object(
    'slug',       p.public_slug,
    'name',       coalesce(nullif(btrim(md.full_name_triple), ''), p.full_name),
    'avatar',     nullif(btrim(coalesce(p.avatar_url, '')), ''),
    'gender',     p.gender,
    'bio',        nullif(btrim(coalesce(p.bio, '')), ''),
    'joinedDate', p.joined_date,

    -- الرتبةُ ووحدةُ الإسناد، والجملةُ تُركَّب في `lib/positionLabel` وحدَه.
    'positions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'roleAr',   r.role_name_ar,
               'unitName', coalesce(c.committee_name_ar, d.name_ar),
               'since',    ur.assigned_at
             ) order by (r.holder_uniqueness = 'multi'), ur.assigned_at)
      from public.user_roles ur
      join public.roles r             on r.role_name = ur.role_name
      left join public.committees c   on c.id = ur.committee_id
      left join public.departments d  on d.id = ur.department_id
      where ur.user_id = p.id and ur.is_active
    ), '[]'::jsonb),

    'badges', coalesce((
      select jsonb_agg(x order by (x->>'earnedAt') is null, (x->>'sortOrder')::int)
      from (
        select jsonb_build_object(
                 'key', b.badge_key, 'name', b.name_ar, 'how', b.description_ar,
                 'icon', b.icon, 'sortOrder', b.sort_order,
                 'earnedAt', mb.earned_at, 'evidence', mb.evidence,
                 'current', case
                              when mb.id is not null then null
                              when b.rule_key = 'events_attended' then
                                (select count(*) from public.activity_reservations ar
                                 where ar.user_id = p.id and ar.attendance_status = 'attended')
                              when b.rule_key = 'tenure_days' and p.joined_date is not null then
                                (current_date - p.joined_date)
                            end,
                 'threshold', case when mb.id is null then b.threshold end
               ) as x
        from public.badges b
        left join public.member_badges mb on mb.badge_id = b.id and mb.user_id = p.id
        where b.is_active and (mb.id is not null or b.show_locked)
      ) s
    ), '[]'::jsonb),

    'college', nullif(btrim(coalesce(md.college, '')), ''),
    'major',   nullif(btrim(coalesce(md.major, '')), ''),
    'degree',  nullif(btrim(coalesce(md.academic_degree, '')), ''),

    'links', jsonb_strip_nulls(jsonb_build_object(
      'twitter',   nullif(btrim(coalesce(md.twitter_account, '')), ''),
      'instagram', nullif(btrim(coalesce(md.instagram_account, '')), ''),
      'tiktok',    nullif(btrim(coalesce(md.tiktok_account, '')), ''),
      'linkedin',  nullif(btrim(coalesce(md.linkedin_account, '')), '')
    ))
  )
  from public.profiles p
  left join public.member_details md on md.user_id = p.id
  where p.public_slug = p_slug
    and p.account_status = 'active'
    and coalesce(nullif(btrim(md.full_name_triple), ''), p.full_name) is not null
    and exists (select 1 from public.user_roles ur where ur.user_id = p.id and ur.is_active);
$function$;


-- ٤. الإنذارات — تسقط أعمدةُ الوحدة الملازمة.
drop function if exists public.warnings_for_reader(uuid);

create function public.warnings_for_reader(p_actor uuid)
 returns table(
   id uuid, user_id uuid, member_name text, member_avatar text, member_gender text,
   member_status text, member_phone text, committee_id integer, committee_name text,
   role_at_issue text, role_ar text,
   category text, reason text, occurred_on date, status text, created_at timestamp with time zone,
   issuer_name text, cancelled_at timestamp with time zone, cancel_reason text, canceller_name text,
   caused_termination boolean, ordinal integer, active_count integer, may_manage boolean
 )
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  with visible as (
    select w.* from member_warnings w where can_view_warnings_of(p_actor, w.user_id)
  ), ranked as (
    select v.*,
      case when v.status = 'active'
        then row_number() over (partition by v.user_id, v.status order by v.created_at)
      end as ord
    from visible v
  )
  select r.id, r.user_id, p.full_name, p.avatar_url, p.gender, p.account_status, p.phone,
         r.committee_id, c.committee_name_ar, r.role_at_issue, ro.role_name_ar,
         r.category, r.reason, r.occurred_on, r.status, r.created_at, ip.full_name,
         r.cancelled_at, r.cancel_reason, cp.full_name, r.caused_termination,
         r.ord::integer,
         (select count(*)::integer from member_warnings a where a.user_id = r.user_id and a.status = 'active'),
         can_issue_warning(p_actor, r.user_id)
  from ranked r
  join profiles p on p.id = r.user_id
  left join committees c on c.id = r.committee_id
  left join roles ro     on ro.role_name = r.role_at_issue
  left join profiles ip on ip.id = r.issued_by
  left join profiles cp on cp.id = r.cancelled_by
  order by r.created_at desc;
$function$;

grant execute on function public.warnings_for_reader(uuid) to authenticated, service_role;

drop function if exists public.members_i_may_warn(uuid);

create function public.members_i_may_warn(p_actor uuid)
 returns table(
   user_id uuid, name text, phone text, avatar text, gender text,
   committee_id integer, committee_name text, role_ar text,
   active_count integer, joined_date date
 )
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select p.id, p.full_name, p.phone, p.avatar_url, p.gender,
         ur.committee_id, c.committee_name_ar, ro.role_name_ar,
         (select count(*)::integer from member_warnings w where w.user_id = p.id and w.status = 'active'),
         p.joined_date
  from profiles p
  left join lateral (
    select u.committee_id, u.role_name from user_roles u
    where u.user_id = p.id and u.is_active
    order by (u.committee_id is not null) desc, u.assigned_at limit 1
  ) ur on true
  left join committees c on c.id = ur.committee_id
  left join roles ro     on ro.role_name = ur.role_name
  where p.account_status = 'active' and can_issue_warning(p_actor, p.id);
$function$;

grant execute on function public.members_i_may_warn(uuid) to authenticated, service_role;


-- ٥. كاتبا اللقطة (دليلُ الوسام · بديلُ مسمّى الشهادة) — الوحدةُ من الإسناد كسائرهم،
--    فتسقط `position_line` بمعاملاتها الخمسة ويحلّ محلّها وصلٌ بمسافة لا غير.
drop function if exists public.position_line(text, integer, text, integer, text);

create or replace function public.position_title_of(p_user uuid)
 returns text
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  with seats as (
    select
      ur.is_active,
      ur.assigned_at,
      nullif(btrim(coalesce(r.role_name_ar, '') || coalesce(' ' || coalesce(unit.committee_name_ar, dept.name_ar), '')), '') as title
    from user_roles ur
    join roles r on r.role_name = ur.role_name
    left join committees  unit on unit.id = ur.committee_id
    left join departments dept on dept.id = ur.department_id
    where ur.user_id = p_user
  )
  select coalesce(
    (select string_agg(title, ' و' order by assigned_at) from seats where is_active and title is not null),
    (select title from seats where title is not null order by assigned_at desc limit 1)
  );
$function$;

create or replace function public.badge_awards()
 returns table(user_id uuid, badge_id uuid, earned_at timestamp with time zone, evidence text)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select p.id, b.id,
         (p.joined_date + make_interval(days => b.threshold))::timestamptz,
         'انضمّ إلى أديب في ' || to_char(p.joined_date, 'YYYY-MM-DD')
  from public.badges b
  join public.profiles p
    on p.joined_date is not null
   and p.joined_date + make_interval(days => b.threshold) <= current_date
  where b.is_active and b.kind = 'computed' and b.rule_key = 'tenure_days'
  union all
  select a.uid, b.id, a.attended_at, b.description_ar
  from public.badges b
  join (
    select r.user_id as uid, r.attended_at,
           row_number() over (partition by r.user_id order by r.attended_at, r.id) as n
    from public.activity_reservations r
    where r.attendance_status = 'attended' and r.attended_at is not null
  ) a on a.n = b.threshold
  where b.is_active and b.kind = 'computed' and b.rule_key = 'events_attended'
  union all
  select x.uid, b.id, x.first_at, 'تولّى منصب ' || x.title
  from public.badges b
  cross join lateral (
    select distinct on (ur.user_id)
      ur.user_id as uid,
      ur.assigned_at as first_at,
      nullif(btrim(coalesce(r.role_name_ar, '') || coalesce(' ' || coalesce(c.committee_name_ar, d.name_ar), '')), '') as title
    from public.user_roles ur
    join public.roles r on r.role_name = ur.role_name
    left join public.committees  c on c.id = ur.committee_id
    left join public.departments d on d.id = ur.department_id
    where r.holder_uniqueness is distinct from 'multi' and ur.assigned_at is not null
    order by ur.user_id, ur.assigned_at
  ) x
  where b.is_active and b.kind = 'computed' and b.rule_key = 'unit_leadership'
    and x.title is not null
  union all
  select c.user_id, b.id, min(c.submitted_at), 'ترشّح لانتخابات أديب'
  from public.badges b
  join public.election_candidates c on c.status in ('approved','withdrawn') and c.submitted_at is not null
  where b.is_active and b.kind = 'computed' and b.rule_key = 'election_candidacy'
  group by c.user_id, b.id;
$function$;

-- الأدلّة المحفوظة تُعاد كتابتُها من الحاسبة نفسها (لقطةٌ لا تُصلحها الحاسبةُ وحدها).
update public.member_badges mb
   set evidence = a.evidence
  from public.badge_awards() a
 where a.user_id = mb.user_id
   and a.badge_id = mb.badge_id
   and mb.evidence is distinct from a.evidence;
