-- **الضيفُ من أدِيب** (محمد ٢٠٢٦-١١-١٥: «لو كان الضيفُ من أدِيب كشخص، الأفضلُ أن يُختار»): يُختار عضوًا من منتقي الأشخاص فيُربط بملفّه
-- (`member_id`) — فيظهر في صفحة الفعاليّة بوجهه، ويفتح صفحتَه العامّة إن كانت له. ومن خارج أدِيب يبقى اسمًا مكتوبًا كما كان.
-- والاسمُ يُنسخ من الملفّ عند الحفظ (فيبقى الصفُّ مقروءًا لو حُذف الملفّ: `on delete set null`).
alter table public.activity_guests
  add column if not exists member_id uuid references public.profiles(id) on delete set null;

-- **ضيوفُ الفعاليّة للزائر**: الصفُّ ومعه وجهُ العضو ورابطُ صفحته العامّة — والملفّاتُ محميّة، فيمرّان من هذا الباب وحدهما (الصورةُ
-- والمعرّفُ العامّ، لا بريدَ ولا جوّال). للمنشورة وحدها.
create or replace function public.get_activity_guests(p_activity_id uuid)
returns table(name text, honorific text, role text, gender text, avatar_url text, slug text)
language sql stable security definer set search_path = public, pg_temp
as $$
  select coalesce(p.full_name, g.name), g.honorific, g.role, coalesce(p.gender, g.gender), p.avatar_url, p.public_slug
  from public.activity_guests g
  join public.activities a on a.id = g.activity_id and a.is_published
  left join public.profiles p on p.id = g.member_id
  where g.activity_id = p_activity_id
  order by g.position;
$$;
-- صفحةُ الفعاليّة العامّة تقرؤها بمفتاح anon
grant execute on function public.get_activity_guests(uuid) to anon, authenticated;
