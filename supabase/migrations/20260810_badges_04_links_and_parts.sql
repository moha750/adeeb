-- ══════════════════════════════════════════════════════════════════════════════
-- الروابطُ التي تقود إلى الصفحة، وقطعُ المنصب خامًا
--
-- **أوّلًا: `get_public_profile` تُعيد قطعَ المنصب لا جملتَه.** كانت تركّب «قائد لجنة
-- التصوير» في SQL، وتركيبُ الجملة مكتوبٌ في `lib/positionLabel` وحدَه (الرتبةُ ووحدتُها
-- الأمّ، والوحدةُ تُسكت إن كانت الأمّ نفسها). فنسخُه في القاعدة مصدرٌ ثانٍ يشيخ وحدَه.
--
-- **ثانيًا: `get_board_members` تحمل `public_slug`.** أهلُ الدفّة ستّةَ عشرَ اسمًا في
-- صفحة الهبوط بلا مقصد. والصفحةُ التي لا يقود إليها رابطٌ لا تُزار، فالفائدةُ تُولد من
-- الرابط لا من الصفحة.
-- ══════════════════════════════════════════════════════════════════════════════

create or replace function public.get_public_profile(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'slug',       p.public_slug,
    'name',       coalesce(nullif(btrim(md.full_name_triple), ''), p.full_name),
    'avatar',     nullif(btrim(coalesce(p.avatar_url, '')), ''),
    'gender',     p.gender,
    'bio',        nullif(btrim(coalesce(p.bio, '')), ''),
    'joinedDate', p.joined_date,

    'positions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'roleAr',          r.role_name_ar,
               'homeCommitteeId', r.home_committee_id,
               'homeName',        hc.committee_name_ar,
               'committeeId',     ur.committee_id,
               'unitName',        coalesce(c.committee_name_ar, d.name_ar),
               'since',           ur.assigned_at
             ) order by (r.holder_uniqueness = 'multi'), ur.assigned_at)
      from public.user_roles ur
      join public.roles r             on r.role_name = ur.role_name
      left join public.committees hc  on hc.id = r.home_committee_id
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
$$;

grant execute on function public.get_public_profile(text) to anon, authenticated;


-- ═══ أهلُ الدفّة يحملون عنوانَ صفحاتهم ════════════════════════════════════════
-- (تُسقَط أوّلًا: تغيُّرُ صفوف الإرجاع لا يقبله `create or replace`)

drop function if exists public.get_board_members();

create or replace function public.get_board_members()
returns table(id uuid, full_name text, avatar_url text, gender text, role_name text,
              unit_name text, twitter_account text, linkedin_account text, public_slug text)
language sql
stable
security definer
set search_path to 'public'
as $$
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
      r.role_name_ar || coalesce(' ' || hc.committee_name_ar, '') as role_name,
      case when ur.committee_id is not null and ur.committee_id = r.home_committee_id then null
           else coalesce(c.committee_name_ar, d.name_ar) end as unit_name,
      b.ord,
      coalesce('c' || ur.committee_id::text, 'u' || p.id::text) as cluster,
      md.twitter_account, md.linkedin_account,
      p.public_slug
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
    select k.*,
      min(k.ord) over (partition by k.cluster) as cluster_ord,
      first_value(k.full_name) over (partition by k.cluster order by k.ord, k.full_name) as cluster_lead
    from picked k
  )
  select c.id, c.full_name, c.avatar_url, c.gender,
         c.role_name, c.unit_name, c.twitter_account, c.linkedin_account, c.public_slug
  from clustered c
  order by c.cluster_ord, c.cluster_lead, c.ord, c.full_name;
$$;

grant execute on function public.get_board_members() to anon, authenticated;
