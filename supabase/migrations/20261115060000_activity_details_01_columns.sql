-- تفاصيلُ الفعاليّة في صفحتها العامّة (قرار محمد ٢٠٢٦-١١-١٥، قالبُ «القراءة»): ما تذكره ملصقاتُ أدِيب ولم يكن في القاعدة.
--   · شهادةُ الحضور: تُمنح لمن يحضر أم لا.
--   · آخرُ موعدٍ للتسجيل: بعده يُرفض الحجز (`book_activity_seat`، الهجرة 03).
--   · خبرُ التغطية: الخبرُ يعرف فعاليّتَه، فتدلّ الفعاليّةُ المنتهيةُ على خبرها.
--   · الضيوفُ والمقدّمون: جدولٌ بأسمائهم وصفاتهم وترتيبهم.

alter table public.activities
  add column if not exists has_certificate boolean not null default false,
  add column if not exists booking_closes_at timestamptz;

alter table public.news
  add column if not exists activity_id uuid references public.activities(id) on delete set null;
create index if not exists news_activity_id_idx on public.news(activity_id) where activity_id is not null;

-- الصفةُ مفتاحٌ والجنسُ مفتاح، والاسمُ يُركَّب في التطبيق بتأنيثه (ضيف/ضيفة، محاور/محاورة، مقدّم/مقدّمة، مدرّب/مدرّبة)
-- ومرآتُها `lib/activities` (GUEST_ROLES) — لا تُضاف قيمةٌ هنا دون هناك. واللقبُ اختياريّ من قائمةٍ ثابتة، لأنّ الاسمَ عربيٌّ خالص بلا نقطة.
create table if not exists public.activity_guests (
  id bigint generated always as identity primary key,
  activity_id uuid not null references public.activities(id) on delete cascade,
  name text not null constraint activity_guests_name_arabic_check check (is_arabic_name(name)),
  honorific text constraint activity_guests_honorific_check check (honorific is null or honorific in ('أ.', 'د.', 'م.', 'أ.د.')),
  role text not null constraint activity_guests_role_check check (role in ('guest', 'moderator', 'host', 'trainer')),
  gender text not null constraint activity_guests_gender_check check (gender in ('male', 'female')),
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists activity_guests_activity_idx on public.activity_guests(activity_id, position);

-- القراءةُ لمن يقرأ الفعاليّةَ نفسها (المنشورة للجميع، وكلُّها لمن يدير الفعاليّات)، والكتابةُ بمفتاح الخدمة من أفعال اللوحة وحدها — لا سياسةَ كتابة
alter table public.activity_guests enable row level security;
create policy activity_guests_select on public.activity_guests for select to anon, authenticated
  using (exists (select 1 from public.activities a where a.id = activity_id and (a.is_published or check_user_permission((select auth.uid()), 'manage_activities'))));
