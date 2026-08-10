-- ══════════════════════════════════════════════════════════════════════════════
-- **البروفايل العلنيّ** — عنوانٌ في `profiles`، وبابٌ واحدٌ يحرس الخصوصيّة
--
-- **لماذا انتقل العنوان؟** كان `member_details.profile_slug`، و`member_details` يشترط
-- رقمَ هويّةٍ وتاريخَ ميلادٍ ودرجةً علميّة (`not null`)، فخمسةَ عشرَ صاحبَ منصبٍ فعّالٍ
-- لا سجلَّ لهم فيه — **وفيهم نائبُ لجنة**. وحجبُ صفحةِ رجلٍ لأنّ الموارد لم تُدخِل رقمَ
-- هويّته حجبٌ بلا علّة: العنوانُ يخصّ **الشخص**، وبيتُ الشخص `profiles`.
--
-- فصار `profiles.public_slug` المصدرَ الواحد. و`member_details.profile_slug` لا يقرؤه
-- بعد اليوم أحد (V1 ميّت، ولا دالّةَ ولا سياسةَ تمسّه إلّا مولِّدَه)، **وإعدامُه دَينٌ
-- يُنفَّذ بإذنٍ صريح** مع مولِّده `generate_profile_slug` ومُطلِقه `auto_generate_profile_slug`.
--
-- والبابُ واحد: `get_public_profile(slug)` تُرجِع ما يُنشَر وحدَه. فما ليس مذكورًا فيها
-- لا يُنشَر: البريدُ والجوّالُ والميلادُ والهويّةُ والرقمُ الأكاديميُّ واللونُ المفضّل
-- **والإنذارات** والحجوزاتُ التي لم تُحضَر. محجوبةٌ بأنّها غيرُ مكتوبةٍ لا باختيارِ شاشة.
-- ══════════════════════════════════════════════════════════════════════════════


-- ═══ ١) العنوانُ ينتقل إلى صاحبه ══════════════════════════════════════════════

alter table public.profiles add column if not exists public_slug text;

comment on column public.profiles.public_slug is
  'عنوانُ الصفحة العلنيّة /m/<slug>. المصدرُ الواحد، خلَفُ member_details.profile_slug.';

create unique index if not exists profiles_public_slug_key
  on public.profiles (public_slug) where public_slug is not null;

-- المولِّد: كالقديم في سلوكه، إلّا أنّه ينظر إلى المصدر الجديد وينقّي ما يكسر العنوان
create or replace function public.generate_public_slug(p_name text, p_user_id uuid)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  base_slug  text;
  final_slug text;
  counter    integer := 0;
begin
  base_slug := lower(btrim(regexp_replace(coalesce(p_name, ''), '\s+', '-', 'g')));
  base_slug := regexp_replace(base_slug, '[^[:alnum:]\-]', '', 'g');
  base_slug := regexp_replace(base_slug, '-{2,}', '-', 'g');
  base_slug := btrim(base_slug, '-');

  if base_slug = '' then
    base_slug := 'member-' || substring(p_user_id::text, 1, 8);
  end if;

  final_slug := base_slug;
  while exists (select 1 from public.profiles where public_slug = final_slug and id <> p_user_id) loop
    counter := counter + 1;
    final_slug := base_slug || '-' || counter::text;
  end loop;

  return final_slug;
end;
$$;

-- ثمّ يُورَّث الموجود: مئةٌ واثنان وستّون عنوانًا مكتوبةً منذ V1 تبقى كما هي،
-- فالرابطُ الذي نُشر لا يُكسَر.
update public.profiles p
set public_slug = md.profile_slug
from public.member_details md
where md.user_id = p.id
  and coalesce(md.profile_slug, '') <> ''
  and p.public_slug is null
  -- الموقوفُ لا تُحرَّر بياناتُه (حارسُ `guard_terminated_membership_profile`)، ولا صفحةَ
  -- علنيّةَ له على كلّ حال. فإن رجعت عضويّتُه ولّد له الخطّافُ عنوانَه.
  and p.account_status <> 'suspended'
  and not exists (select 1 from public.profiles q where q.public_slug = md.profile_slug);

-- ومن لا عنوانَ له يُولَّد له من اسمه
do $$
declare r record;
begin
  for r in
    select id, full_name from public.profiles
    where public_slug is null
      and coalesce(btrim(full_name), '') <> ''
      and account_status <> 'suspended'
    order by created_at
  loop
    update public.profiles
    set public_slug = public.generate_public_slug(r.full_name, r.id)
    where id = r.id;
  end loop;
end $$;

-- ولا يُولَد صاحبُ اسمٍ بلا عنوانٍ بعد اليوم
create or replace function public.fill_public_slug()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(btrim(new.public_slug), '') = '' and coalesce(btrim(new.full_name), '') <> '' then
    new.public_slug := public.generate_public_slug(new.full_name, new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_fill_public_slug on public.profiles;
create trigger trg_fill_public_slug
  before insert or update of full_name on public.profiles
  for each row execute function public.fill_public_slug();


-- ═══ ٢) بابُ الزائر ═══════════════════════════════════════════════════════════
--
-- وحدُّ النشر: حسابٌ نشطٌ + منصبٌ فعّالٌ + اسم. **ولا يُشترَط الاسمُ الثلاثيّ**:
-- ثلاثةٌ وخمسون من مئةٍ واثنين وثلاثين مؤهَّلًا لا ثلاثيَّ لهم، وحجبُهم لأجل حِليةٍ
-- خسارةٌ لا تُبرَّر. يُؤخَذ الثلاثيُّ إن وُجد وإلّا الاسمُ المعروض.

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

    -- المناصبُ الفعّالة، كلٌّ باسمه العربيّ ووحدته. والغريبُ يفهم «قائد لجنة الإعلام»
    -- ولا يفهم `committee_leader`. والقيادةُ تتقدّم العضويّة في الترتيب.
    'positions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'title', r.role_name_ar,
               'unit',  coalesce(c.committee_name_ar, d.name_ar),
               'since', ur.assigned_at
             ) order by (r.holder_uniqueness = 'multi'), ur.assigned_at)
      from public.user_roles ur
      join public.roles r            on r.role_name = ur.role_name
      left join public.committees c  on c.id = ur.committee_id
      left join public.departments d on d.id = ur.department_id
      where ur.user_id = p.id and ur.is_active
    ), '[]'::jsonb),

    -- الأوسمة: ما نالَه بتواريخه أوّلًا، ثمّ ما يُعرَض مقفلًا وما بلغَه منه
    'badges', coalesce((
      select jsonb_agg(x order by (x->>'earnedAt') is null, (x->>'sortOrder')::int)
      from (
        select jsonb_build_object(
                 'key',       b.badge_key,
                 'name',      b.name_ar,
                 'how',       b.description_ar,
                 'icon',      b.icon,
                 'sortOrder', b.sort_order,
                 'earnedAt',  mb.earned_at,
                 'evidence',  mb.evidence,
                 'current',   case
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

comment on function public.get_public_profile(text) is
  'بابُ الزائر إلى صفحةٍ علنيّة. ما ليس مذكورًا فيها لا يُنشَر، وقانونُ الخصوصيّة ههنا وحدَه.';

grant execute on function public.get_public_profile(text) to anon, authenticated;


-- ═══ ٣) عنوانُ صاحب الحساب لنفسه ══════════════════════════════════════════════
--
-- يحتاجه المحرِّرُ ليقول لصاحبه: «هذه صفحتُك، انشرها». ويُرجِع NULL لمن لم يبلغ الحدّ.

create or replace function public.my_public_slug()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.public_slug
  from public.profiles p
  where p.id = auth.uid()
    and p.public_slug is not null
    and p.account_status = 'active'
    and exists (select 1 from public.user_roles ur where ur.user_id = p.id and ur.is_active);
$$;

grant execute on function public.my_public_slug() to authenticated;
