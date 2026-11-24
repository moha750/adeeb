-- ═══ الصفحةُ العلنيّةُ للمتطوّع أيضًا (محمد ٢٠٢٦-١١-٢٤) ═══
--
-- كانت `get_public_profile` و`my_public_slug` تُفتحان لمن له منصبٌ قائم وحده (العضو)، فكان لكلّ متطوّعٍ رابطٌ محجوزٌ يرجع «غير موجودة»،
-- ولا يرى في «حسابي» قسمَ صفحته. ووعدته صفحةُ الانضمام «عملُك مرصود»، فصار له ما للعضو: صفحةٌ تقول من هو وما عملُه.
--
-- • تُفتح لمن له منصبٌ قائم (كما كانت) **أو متطوّعٍ نشط** (`is_active_volunteer`). والحجبُ كما هو: لا بريدَ ولا جوّالَ ولا ميلاد.
-- • `standing`: «member» لمن له منصب، و«volunteer» لغيره — تقول للشاشة أيَّ بطاقةٍ تُري.
-- • `volunteer` (للمتطوّع وحده): منذ متى يتطوّع (العودةُ إن عاد، وإلّا التقديم)، وكم فرصةً حضرها، وساعاتُه من شهاداته القائمة —
--   وهي ما يراه في بوّابته («رحلتك»).
-- • وسامُ «سنةٌ في أديب» المقفلُ لا يُعرض لمن لا عضويّةَ له: هو وسامُ عضويّة، فيبدو له هدفًا لا طريقَ إليه. (ومن ناله قبلُ يبقى له)
-- والصلاحيّاتُ كما هي (`create or replace` يُبقي المنح).

create or replace function public.get_public_profile(p_slug text)
 returns jsonb
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  with who as (
    select p.*,
           exists (select 1 from public.user_roles ur where ur.user_id = p.id and ur.is_active) as has_role
    from public.profiles p
    where p.public_slug = p_slug
  )
  select jsonb_build_object(
    'slug',       p.public_slug,
    'standing',   case when p.has_role then 'member' else 'volunteer' end,
    'name',       coalesce(nullif(btrim(md.full_name_triple), ''), p.full_name),
    'avatar',     nullif(btrim(coalesce(p.avatar_url, '')), ''),
    'gender',     p.gender,
    'bio',        nullif(btrim(coalesce(p.bio, '')), ''),
    'joinedDate', p.joined_date,
    'volunteer',  case when not p.has_role then (
      select jsonb_build_object(
        'since',  coalesce(v.returned_at, v.applied_at)::date,
        'joined', (select count(*) from public.volunteer_applications a where a.user_id = p.id and a.attendance = 'attended'),
        'hours',  (select coalesce(sum(c.hours), 0) from public.participation_certificates c where c.user_id = p.id and c.status = 'active')
      )
      from public.volunteers v where v.user_id = p.id
    ) end,
    'positions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'roleAr',   r.role_name_ar,
               'unitName', coalesce(c.committee_name_ar, d.name_ar),
               'since',    ur.assigned_at,
               'acting',   ur.is_acting,
               'until',    ur.acting_until
             ) order by ur.is_acting, (r.holder_uniqueness = 'multi'), ur.assigned_at)
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
        where b.is_active
          and (mb.id is not null or (b.show_locked and (p.has_role or b.rule_key is distinct from 'tenure_days')))
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
  from who p
  left join public.member_details md on md.user_id = p.id
  where p.account_status = 'active'
    and p.deleted_at is null
    and p.deletion_requested_at is null
    and coalesce(nullif(btrim(md.full_name_triple), ''), p.full_name) is not null
    and (p.has_role or public.is_active_volunteer(p.id));
$function$;

create or replace function public.my_public_slug()
 returns text
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select p.public_slug
  from public.profiles p
  where p.id = auth.uid()
    and p.public_slug is not null
    and p.account_status = 'active'
    and (exists (select 1 from public.user_roles ur where ur.user_id = p.id and ur.is_active)
         or public.is_active_volunteer(p.id));
$function$;
