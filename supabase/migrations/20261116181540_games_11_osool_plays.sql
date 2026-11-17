-- «مدارس الأصول الأهلية»: سجلُّ اللعب (طلبُ المالك ليلةَ الإطلاق ٢٠٢٦-١١-١٦: كم دخل، كم أكمل، كم أُصدرت له شهادة، وما أسماؤهم).
-- صفٌّ لكلّ فتحٍ للعبة (kind = open) ولكلّ جولة (kind = round). المعرّفاتُ تولَّد في الجهاز فإعادةُ الإرسال لا تكرّر الصفّ.
-- player: معرّفُ الجهاز (يبقى في المتصفّح) فيُفرَّق بين الأشخاص والجولات. user_id: صاحبُ الحساب إن كان داخلًا،
-- ويُقرأ من جلسته في الخادم لا ممّا ترسله الصفحة («الجلسةُ هي الحقيقة»).
-- لا يقرأ الجدولَ ولا يكتبه إلا الخادمُ بمفتاح الخدمة (مسار /api/games/osool)، فلا منحَ لأحد.
--
-- ✅ مطبَّقٌ على الإنتاج ٢٠٢٦-١١-١٦ (بأداة Supabase باسم `games_11_osool_plays`، الإصدار 20261116181540).
create table public.osool_plays (
  id          uuid primary key,
  visit       uuid not null,
  player      uuid not null,
  user_id     uuid references auth.users(id) on delete set null,
  kind        text not null check (kind in ('open', 'round')),
  at          timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  majlis      text check (majlis in ('m', 'f')),
  name        text check (char_length(name) between 1 and 24),
  outcome     text check (outcome in ('playing', 'won', 'lost')),
  faults      jsonb,
  hearts      smallint check (hearts between 0 and 3),
  grades      smallint[] check (grades is null or array_length(grades, 1) = 3),
  secs        integer check (secs between 0 and 86400),
  cert_saved  boolean not null default false,
  cert_shared boolean not null default false,
  device      text check (device in ('ios', 'android', 'desktop')),
  ref         text check (char_length(ref) <= 60)
);
create index osool_plays_at on public.osool_plays (at desc);
create index osool_plays_player on public.osool_plays (player);
create index osool_plays_user on public.osool_plays (user_id) where user_id is not null;
alter table public.osool_plays enable row level security;
revoke all on table public.osool_plays from public, anon, authenticated;
