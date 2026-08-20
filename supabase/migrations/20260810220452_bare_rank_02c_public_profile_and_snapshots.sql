-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260810220452   الاسم: bare_rank_02c_public_profile_and_snapshots

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

drop function if exists public.position_line(text, integer, text, integer, text);

update public.member_badges mb
   set evidence = a.evidence
  from public.badge_awards() a
 where a.user_id = mb.user_id
   and a.badge_id = mb.badge_id
   and mb.evidence is distinct from a.evidence;
