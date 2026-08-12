-- من يقرأ يأخذ القطعتين خامًا — والجملةُ تُركَّب في `lib/positionLabel` وحدَه.
--
-- ثلاثُ دوالٍّ كانت تُخرج نصًّا جاهزًا فحفرت قواعدَ التسمية في SQL نسخةً ثانية، وسقط من
-- كلٍّ منها شيء. صارت تُخرج ما تعرفه القاعدة وحدها (الرتبة · وحدتها الأمّ · وحدة الإسناد)،
-- ويُركّب القارئُ الجملة بالقاعدة الواحدة. وهي سُنّةُ `get_public_profile` القائمة.
--
-- ولذلك تتغيّر أشكالُ الإخراج، فتُسقَط الدوالُّ وتُبنى: `create or replace` لا يبدّل شكلًا.

-- ١. أهل الدفّة في الصفحة الرئيسيّة — كانت تصل الاسم بوحدته في SQL، والواجهةُ تصلهما
--    بمسافةٍ ساذجة بلا دمج التماسّ («منسّق قسم قسم الإنتاج الإعلامي»).
drop function if exists public.get_board_members();

create function public.get_board_members()
 returns table(
   id uuid, full_name text, avatar_url text, gender text,
   role_ar text, home_committee_id integer, home_name text,
   committee_id integer, unit_name text,
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
      r.home_committee_id,
      hc.committee_name_ar as home_name,
      ur.committee_id,
      coalesce(c.committee_name_ar, d.name_ar) as unit_name,
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
         c.role_ar, c.home_committee_id, c.home_name,
         c.committee_id, c.unit_name,
         c.twitter_account, c.linkedin_account, c.public_slug
  from clustered c
  order by c.cluster_ord, c.cluster_lead, c.ord, c.full_name;
$function$;

grant execute on function public.get_board_members() to anon, authenticated, service_role;


-- ٢. كشفُ الإنذارات — كان يُخرج `role_name_ar` عاريًا (رتبةٌ بلا وحدةٍ أمّ)، فصحّ بمصادفةٍ
--    وحدها: وحدةُ الإسناد في أدوار الإدارات هي وحدتُها الأمّ نفسُها اليوم. تُضاف القطعتان
--    الناقصتان فيصير الصدق قاعدةً لا مصادفة.
drop function if exists public.warnings_for_reader(uuid);

create function public.warnings_for_reader(p_actor uuid)
 returns table(
   id uuid, user_id uuid, member_name text, member_avatar text, member_gender text,
   member_status text, member_phone text, committee_id integer, committee_name text,
   role_at_issue text, role_ar text, role_home_committee_id integer, role_home_name text,
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
         ro.home_committee_id, hc.committee_name_ar,
         r.category, r.reason, r.occurred_on, r.status, r.created_at, ip.full_name,
         r.cancelled_at, r.cancel_reason, cp.full_name, r.caused_termination,
         r.ord::integer,
         (select count(*)::integer from member_warnings a where a.user_id = r.user_id and a.status = 'active'),
         can_issue_warning(p_actor, r.user_id)
  from ranked r
  join profiles p on p.id = r.user_id
  left join committees c  on c.id = r.committee_id
  left join roles ro      on ro.role_name = r.role_at_issue
  left join committees hc on hc.id = ro.home_committee_id
  left join profiles ip on ip.id = r.issued_by
  left join profiles cp on cp.id = r.cancelled_by
  order by r.created_at desc;
$function$;

grant execute on function public.warnings_for_reader(uuid) to authenticated, service_role;


-- ٣. من يجوز إنذارُهم — المطبُّ نفسه، والعلاج نفسه.
drop function if exists public.members_i_may_warn(uuid);

create function public.members_i_may_warn(p_actor uuid)
 returns table(
   user_id uuid, name text, phone text, avatar text, gender text,
   committee_id integer, committee_name text,
   role_ar text, role_home_committee_id integer, role_home_name text,
   active_count integer, joined_date date
 )
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select p.id, p.full_name, p.phone, p.avatar_url, p.gender,
         ur.committee_id, c.committee_name_ar,
         ro.role_name_ar, ro.home_committee_id, hc.committee_name_ar,
         (select count(*)::integer from member_warnings w where w.user_id = p.id and w.status = 'active'),
         p.joined_date
  from profiles p
  left join lateral (
    select u.committee_id, u.role_name from user_roles u
    where u.user_id = p.id and u.is_active
    order by (u.committee_id is not null) desc, u.assigned_at limit 1
  ) ur on true
  left join committees c  on c.id = ur.committee_id
  left join roles ro      on ro.role_name = ur.role_name
  left join committees hc on hc.id = ro.home_committee_id
  where p.account_status = 'active' and can_issue_warning(p_actor, p.id);
$function$;

grant execute on function public.members_i_may_warn(uuid) to authenticated, service_role;
