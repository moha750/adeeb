-- ═══ فريقُ الرؤية (2026-11-22) ═══
-- لكلّ رؤيةٍ فريقُها (محمد ٢٠٢٦-١١-٠٣): مشرفٌ عامّ، وقائدٌ للرؤية، وقائدٌ لكلّ مسار. كان في الكود معاينةً،
-- فصار هنا يُدار من تبويب «متابعة الرؤية» (محمد ٢٠٢٦-١١-٢٢: «نفّذ»).
-- والمقعدُ يحمل حسابًا (`profile_id`) أو اسمًا مكتوبًا لمن لا حساب له بعد (`name` و`gender`)، لا الاثنين:
-- قائدُ مسار الصدى لم يسجّل بعد، فيُكتب اسمه ثمّ يُربط بحسابه حين يسجّل. والمقعدُ الشاغر لا صفَّ له.

create table public.vision_team (
  id          bigint generated always as identity primary key,
  vision_id   bigint not null references public.visions(id) on delete cascade,
  role        text not null check (role in ('supervisor', 'leader', 'track')),
  track_id    bigint references public.vision_tracks(id) on delete cascade,
  profile_id  uuid references public.profiles(id) on delete cascade,
  name        text check (name is null or char_length(btrim(name)) between 2 and 80),
  gender      text check (gender is null or gender in ('male', 'female')),
  updated_by  uuid references public.profiles(id) on delete set null,
  updated_at  timestamptz not null default now(),
  check ((role = 'track') = (track_id is not null)),
  check ((profile_id is null) <> (name is null)),
  check (profile_id is null or gender is null)
);

-- مقعدٌ واحدٌ لكلّ دور، ولكلّ مسار
create unique index vision_team_seat on public.vision_team (vision_id, role, coalesce(track_id, 0));

alter table public.vision_team enable row level security;
revoke all on public.vision_team from anon, authenticated;

-- فريقُ «رؤية الهلال» كما سمّاه محمد
insert into public.vision_team (vision_id, role, track_id, profile_id, name, gender)
select v.id, s.role, t.id, s.profile_id::uuid, s.name, s.gender
from public.visions v
cross join (values
  ('supervisor', null::int, 'f4a1cd18-9a27-4316-bb7a-ba8fd363bac1', null, null),
  ('leader',     null,      '17dce2b9-72bf-4a92-937f-6be273022852', null, null),
  ('track',      1,         'f4a1cd18-9a27-4316-bb7a-ba8fd363bac1', null, null),
  ('track',      2,         '86a3163e-ab57-4ca8-86ca-d172046f5b97', null, null),
  ('track',      3,         null, 'محمد السماعيل', 'male'),
  ('track',      4,         '8dd48fe4-d01f-4fa9-90bc-1bcaf154fe22', null, null)
) as s(role, track_position, profile_id, name, gender)
left join public.vision_tracks t on t.vision_id = v.id and t.position = s.track_position
where v.slug = 'hilal';

-- الفريقُ في الدالّة العلنيّة: الاسمُ والجنس، والصورةُ ورابطُ الصفحة لمن هو عضوٌ قائمٌ وحده (قانونُ `get_public_structure` نفسُه)
create or replace function public.get_public_vision(p_slug text default null)
returns jsonb
language sql
stable security definer
set search_path to 'public', 'pg_temp'
as $function$
  with v as (
    select * from public.visions
    where status in ('active', 'closed') and (p_slug is null or slug = p_slug)
    order by (status = 'active') desc, starts_on desc
    limit 1
  )
  select (
    select jsonb_build_object(
      'slug', v.slug,
      'name', v.name,
      'starts_on', v.starts_on,
      'horizon_label', v.horizon_label,
      'horizon_on', v.horizon_on,
      'status', v.status,
      'tracks', coalesce((
        select jsonb_agg(jsonb_build_object(
          'position', t.position,
          'name', t.name,
          'summary', t.summary,
          'icon', t.icon,
          'goals', coalesce((
            select jsonb_agg(jsonb_build_object(
              'id', g.id, 'cluster', g.cluster, 'title', g.title, 'detail', g.detail,
              'target', g.target, 'owner', g.owner, 'due_on', g.due_on,
              'status', g.status, 'done_at', g.done_at
            ) order by g.position)
            from public.vision_goals g where g.track_id = t.id
          ), '[]'::jsonb)
        ) order by t.position)
        from public.vision_tracks t where t.vision_id = v.id
      ), '[]'::jsonb),
      'team', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', m.id,
          'role', m.role,
          'track', t.position,
          'name', coalesce(p.full_name, m.name),
          'gender', coalesce(p.gender, m.gender),
          'avatar', case when p.account_status = 'active' and p.joined_date is not null then p.avatar_url end,
          'slug', case when p.account_status = 'active' and p.joined_date is not null then p.public_slug end
        ) order by m.id)
        from public.vision_team m
        left join public.vision_tracks t on t.id = m.track_id
        left join public.profiles p on p.id = m.profile_id
        where m.vision_id = v.id
      ), '[]'::jsonb),
      'archive', coalesce((
        select jsonb_agg(jsonb_build_object(
          'slug', o.slug, 'name', o.name, 'starts_on', o.starts_on,
          'horizon_label', o.horizon_label, 'status', o.status,
          'total', (select count(*) from public.vision_goals g join public.vision_tracks t on t.id = g.track_id where t.vision_id = o.id),
          'done', (select count(*) from public.vision_goals g join public.vision_tracks t on t.id = g.track_id where t.vision_id = o.id and g.status = 'done')
        ) order by o.starts_on desc)
        from public.visions o where o.status in ('active', 'closed') and o.id <> v.id
      ), '[]'::jsonb)
    )
    from v
  );
$function$;
