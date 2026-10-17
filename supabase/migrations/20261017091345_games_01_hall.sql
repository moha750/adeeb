-- ═══════════════════════════════════════════════════════════════════════════
-- «ألعاب أدِيبيّة» في القاعدة (٢٠٢٦-١٠-١٧) — الصالةُ تُدار من اللوحة لا من الكود.
--
-- قراراتُ المالك:
--  · غرفةٌ في اللوحة تدير ألعابَ أدِيب: الألعابُ نفسُها (ظهورُها في الصالة وترتيبُها وسطرُها
--    ونغمتُها ومقطعُها)، والمسابقاتُ التي يعلنها شريطُ «الحدث الجاري»، وإحصائيّاتُ كلّ لعبة.
--  · يملكها **الرئيسان وحدهما** (`manage_games`).
--
-- وحدُّ ما تفعله اللوحة، بصدق: **اللعبةُ نفسُها كود** (صفحةٌ مكتفيةٌ بنفسها في `public/games/*`،
-- وخادمٌ يحكم نتيجتَها كـ`darb_*`). فاللوحةُ تقرّر ما يُعرض في الصالة وكيف، ولا تصنع لعبة.
-- وكذلك المسابقة: صفُّها هنا **إعلانٌ** يغذّي الشريط، وقواعدُ الفوز فيها تبقى في اللعبة
-- (مسابقةُ أكواب oos حكمها `darb_contest` ومنطقُ `darb_*`، لا هذا الجدول).
--
-- كان مصدرُ الصالة `app/games/_components/catalog.ts`، ويُحذف بعد هذا الترحيل.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ✅ مطبَّقٌ على الإنتاج ٢٠٢٦-١٠-١٧ بإذن المالك (بأداة Supabase باسم `games_01_hall`، الإصدار 20261017091345).

-- ═══ (١) الألعاب ═══════════════════════════════════════════════════════════
create table public.games (
  slug          text primary key
                check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 40),
  name          text not null check (char_length(btrim(name)) between 2 and 30),
  -- سطرٌ واحدٌ على لوحة الكابينة: سقفُه ٩٠ محرفًا كي تتساوى الكبائنُ مهما اختلفت ألعابُها.
  line          text not null check (char_length(btrim(line)) between 10 and 90),
  -- النغمةُ اسمٌ له سطرُه في `components.css` (`.agm [data-tone="…"]`). وكلُّ نغمةٍ جديدةٍ
  -- ترحيلٌ وسطرُ CSS معًا، والقائمةُ في `lib/games/vocab.ts` تطابق هذا القيد.
  tone          text not null check (tone in ('darb', 'amber', 'sky', 'violet')),
  -- الرابطان مساران داخل الموقع لا روابطُ خارجيّة: الصالةُ لا تُخرج زائرَها من أدِيب.
  play_path     text not null check (play_path ~ '^/[^/]' and char_length(play_path) <= 120),
  board_path    text check (board_path ~ '^/[^/]' and char_length(board_path) <= 120),
  -- مقطعُ الشاشة وصورتُه الثابتة معًا أو لا شيء (بلا مقطعٍ تعرض الشاشةُ «بلا إشارة»).
  attract_video  text check (char_length(attract_video) <= 500),
  attract_poster text check (char_length(attract_poster) <= 500),
  in_hall       boolean not null default false,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  updated_by    uuid references auth.users(id) on delete set null,
  constraint games_attract_pair check ((attract_video is null) = (attract_poster is null))
);
comment on table public.games is
  'ألعابُ أدِيب كما تعرضها صالةُ /games. اللعبةُ نفسُها كود؛ هذا الصفُّ ظهورُها وهيئتُها.';

create trigger games_updated_at before update on public.games
  for each row execute function public.set_updated_at_now();

-- ═══ (٢) المسابقات: إعلانُ الشريط ═════════════════════════════════════════
create table public.game_events (
  id          uuid primary key default gen_random_uuid(),
  game_slug   text not null references public.games(slug) on update cascade on delete cascade,
  title       text not null check (char_length(btrim(title)) between 4 and 60),
  -- الجوائزُ جملةً واحدة: الشريطُ ثلاثةُ أسطرٍ في الجوّال، والجملةُ ثالثُها.
  note        text not null check (char_length(btrim(note)) between 4 and 160),
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id) on delete set null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null,
  constraint game_events_window check (ends_at > starts_at)
);
comment on table public.game_events is
  'مسابقاتُ الألعاب كما يعلنها شريطُ «الحدث الجاري» في /games. إعلانٌ لا حَكَم: قواعدُ الفوز في اللعبة.';
create index game_events_ends_at on public.game_events (ends_at desc);

create trigger game_events_updated_at before update on public.game_events
  for each row execute function public.set_updated_at_now();

-- ═══ (٣) الحراسة: قراءةٌ للجميع، والكتابةُ بمفتاح الخدمة وحده ════════════════
-- لا سرَّ في اسم لعبةٍ مخفيّة ولا في إعلان مسابقة. والكتابةُ أفعالُ خادمٍ تفحص القدرةَ
-- ثمّ تكتب بمفتاح الخدمة (نمطُ الرعاة والأنظمة)، فلا سياسةَ كتابةٍ للمتصفّح.
alter table public.games enable row level security;
alter table public.game_events enable row level security;
revoke insert, update, delete, truncate on public.games, public.game_events from anon, authenticated;
create policy games_read on public.games for select to anon, authenticated using (true);
create policy game_events_read on public.game_events for select to anon, authenticated using (true);

-- ═══ (٤) القدرة: للرئيسين ═════════════════════════════════════════════════
insert into public.permissions (permission_key, permission_name_ar, description, category)
select 'manage_games', 'إدارة الألعاب',
       'ألعابُ أدِيب ومسابقاتُها وإحصائيّاتُها في /dashboard/games', 'website'
where not exists (select 1 from public.permissions p where p.permission_key = 'manage_games');

insert into public.role_permissions (role_name, permission_id)
select r.role_name, p.id
from (values ('club_president'), ('executive_council_president')) as r(role_name)
join public.permissions p on p.permission_key = 'manage_games'
where not exists (
  select 1 from public.role_permissions x
  where x.role_name = r.role_name and x.permission_id = p.id
);

-- ═══ (٥) دلوُ الألعاب: مقطعُ الشاشة وصورتُه ══════════════════════════════════
-- علنيٌّ للقراءة، ولا سياسةَ كتابة: الرفعُ برابطٍ موقَّعٍ يصكّه الخادم (القاعدة ١٤ ونمطُ الأخبار).
-- والحدُّ ١٥ ميغابايت: مقطعُ «دربك خضر» نحو ميغابايت، والسقفُ رحبٌ لمقطعٍ أطول لا لفيلم.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('games', 'games', true, 15728640,
        array['video/mp4', 'video/webm', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- ═══ (٦) إحصائيّاتُ «بنك أدِيب» ══════════════════════════════════════════════
-- أختُ `darb_stats`: جولاتُ الركن كلُّها، ومن لعب (بالاسم كما كُتب على التابلت، فالركنُ بلا حساب)،
-- والنتائجُ والمستوياتُ واللغتان، وكلُّ يومٍ بتوقيت الرياض. للخادم وحده (تولد مغلقة).
create or replace function public.bank_stats()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'plays',   (select count(*) from bank_plays),
    'players', (select count(distinct lower(btrim(name))) from bank_plays),
    'first',   (select min(played_at) from bank_plays),
    'last',    (select max(played_at) from bank_plays),
    'results', coalesce((select jsonb_object_agg(result, n) from
                 (select result, count(*) n from bank_plays group by result) r), '{}'::jsonb),
    'levels',  coalesce((select jsonb_object_agg(coalesce(level, 'none'), n) from
                 (select level, count(*) n from bank_plays group by level) l), '{}'::jsonb),
    'langs',   coalesce((select jsonb_object_agg(lang, n) from
                 (select lang, count(*) n from bank_plays group by lang) g), '{}'::jsonb),
    'days',    coalesce((select jsonb_agg(jsonb_build_object('day', d, 'plays', n) order by d) from
                 (select (played_at at time zone 'Asia/Riyadh')::date d, count(*) n
                    from bank_plays group by 1) x), '[]'::jsonb)
  );
$$;
revoke all on function public.bank_stats() from public, anon, authenticated;

-- ═══ (٧) البذرة ═══════════════════════════════════════════════════════════
-- «دربك خضر» كما في `catalog.ts`، إلّا سطرَها: كان «اجمع أكوابَ oos» من أيّام المسابقة،
-- واللعبةُ تجمع التمرَ منذ ٢٠٢٦-٠٩-٢٨ (darb_09_tamr). و«بنك أدِيب» ركنُ معرضٍ على تابلت،
-- فيُسجَّل لإحصائيّاته ولا يدخل الصالة.
insert into public.games (slug, name, line, tone, play_path, board_path, attract_video, attract_poster, in_hall, sort_order)
values
  ('darbak-khadar', 'دربك خضر',
   'لعبةُ عَدْوٍ لليوم الوطنيّ في جوّالك: اجمع التمرَ واسبق إلى رأس اللوحة.',
   'darb', '/games/darbak-khadar/play', '/games/darbak-khadar',
   '/games/cabinets/darbak-khadar.mp4', '/games/cabinets/darbak-khadar.jpg', true, 0),
  ('bank-adeeb', 'بنك أدِيب',
   'ركنُ بنك الأسئلة في معرض اليوم الوطنيّ: اختر مستواك وأجب قبل أن ينفد الوقت.',
   'amber', '/bank', null, null, null, false, 1)
on conflict (slug) do nothing;

-- ومسابقةُ أكواب oos ذكرى في سجلّ المسابقات بنافذتها من `darb_contest`، فلا يعلنها الشريط.
insert into public.game_events (game_slug, title, note, starts_at, ends_at)
select 'darbak-khadar', 'مسابقة أكواب oos في دربك خضر',
       'رصيدٌ في محفظة مقهى oos للأكثر جمعًا للأكواب: 30 ريالًا للأوّل، و20 للثاني، و10 للثالث.',
       c.starts_at, c.ends_at
from public.darb_contest c
where c.id = 1
  and not exists (select 1 from public.game_events e where e.game_slug = 'darbak-khadar');

commit;
