-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260728043900   الاسم: create_radio_system

-- ══ إذاعة أدِيب — م١: أساس القاعدة ═══════════════════════════════════════
-- القرارات الحاكمة: مسموعةٌ لا مرئيّة · مقدّمٌ واحد عضوٌ من أدِيب بلا ضيوف ·
-- قناةٌ واحدة تحتها البرامج · الصوت والصور في مخزنٍ خارجيّ (R2) والقاعدة تحفظ
-- المسار لا الملفّ · الصلاحيّة قدرةٌ لا رتبة (manage_radio).

/* ── المحطّة: صفٌّ واحد يحمل هويّة الخلاصة المشتركة ─────────────────── */
create table public.radio_station (
  id               integer primary key default 1 check (id = 1),
  name             text not null default 'إذاعة أدِيب',
  tagline          text,
  description      text,
  logo_path        text,
  feed_author      text not null default 'نادي أدِيب',
  feed_owner_email text,
  itunes_category  text not null default 'Arts',
  language         text not null default 'ar',
  copyright        text,
  explicit         boolean not null default false,
  updated_at       timestamptz not null default now()
);
comment on table public.radio_station is 'محطّة إذاعة أدِيب — صفٌّ واحد (id=1) يحمل بيانات خلاصة RSS المشتركة لكلّ البرامج';
insert into public.radio_station (id) values (1);

/* ── البرامج ──────────────────────────────────────────────────────── */
create table public.radio_shows (
  id                     uuid primary key default gen_random_uuid(),
  title                  text not null,
  slug                   text not null unique,
  tagline                text,
  description            text,
  logo_path              text,
  tone                   text not null default 'brand'
                           check (tone in ('brand','neutral','success','warning','danger')),
  host_member_id         uuid not null references public.profiles(id) on delete restrict,
  producing_committee_id integer references public.committees(id) on delete set null,
  status                 text not null default 'draft'
                           check (status in ('draft','published','archived')),
  is_featured            boolean not null default false,
  "order"                integer not null default 0,
  published_at           timestamptz,
  created_by             uuid references public.profiles(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint radio_shows_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- لا يُنشَر برنامجٌ بلا شعارٍ ووصف: المنصّات ترفض خلاصةً ناقصةً هذين
  constraint radio_shows_publish_guard check (
    status <> 'published' or (logo_path is not null and description is not null)
  )
);
comment on table public.radio_shows is 'برامج إذاعة أدِيب — لكلّ برنامجٍ اسمه وشعاره ونغمته ومقدّمه (عضوٌ واحد)';
comment on column public.radio_shows.host_member_id is 'مقدّم البرنامج الحاليّ — يُختم منه مقدّمُ كلّ حلقةٍ جديدة';
comment on column public.radio_shows.tone is 'نغمة البرنامج من نظام النغمات (لا لون حرّ) — تعمّ بطاقته ومشغّله';
comment on column public.radio_shows.logo_path is 'مسار الشعار في مخزن الوسائط (R2) — مربّع 3000×3000، لا رابطٌ كامل';

/* ── الحلقات ──────────────────────────────────────────────────────── */
create table public.radio_episodes (
  id               uuid primary key default gen_random_uuid(),
  show_id          uuid not null references public.radio_shows(id) on delete cascade,
  season           integer not null default 1 check (season > 0),
  number           integer not null check (number > 0),
  title            text not null,
  slug             text not null,
  host_member_id   uuid not null references public.profiles(id) on delete restrict,
  summary          text,
  notes            text,
  audio_path       text,
  audio_mime       text not null default 'audio/mpeg',
  audio_bytes      bigint  check (audio_bytes is null or audio_bytes > 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  cover_path       text,
  transcript       text,
  status           text not null default 'draft'
                     check (status in ('draft','scheduled','published','archived')),
  publish_at       timestamptz,
  published_at     timestamptz,
  plays            integer not null default 0,
  downloads        integer not null default 0,
  explicit         boolean not null default false,
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (show_id, season, number),
  unique (show_id, slug),
  constraint radio_episodes_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- لا تُنشَر ولا تُجدوَل حلقةٌ بلا صوتٍ ومدّةٍ وحجم: الخلاصة تحملها للمنصّات
  constraint radio_episodes_publish_guard check (
    status not in ('published','scheduled')
    or (audio_path is not null and audio_bytes is not null and duration_seconds is not null)
  ),
  constraint radio_episodes_schedule_guard check (
    status <> 'scheduled' or publish_at is not null
  )
);
comment on table public.radio_episodes is 'حلقات إذاعة أدِيب — الصوت في مخزنٍ خارجيّ، والمعرّف id هو guid الحلقة في الخلاصة أبدًا';
comment on column public.radio_episodes.host_member_id is 'من قدّم هذه الحلقة — واقعةٌ ثابتة لا تتبدّل بتبدّل مقدّم البرنامج';
comment on column public.radio_episodes.audio_bytes is 'حجم الملفّ بالبايت — إلزاميّ للنشر (enclosure length في الخلاصة)';
comment on column public.radio_episodes.duration_seconds is 'المدّة بالثواني — تُقرأ آليًّا من الملفّ عند الرفع (itunes:duration)';
comment on column public.radio_episodes.downloads is 'تنزيلٌ عبر رابط التتبّع الأبديّ — استماع المشغّلات الخارجيّة';

/* ── منصّات البرنامج ──────────────────────────────────────────────── */
create table public.radio_show_platforms (
  id       uuid primary key default gen_random_uuid(),
  show_id  uuid not null references public.radio_shows(id) on delete cascade,
  platform text not null check (platform in (
             'spotify','apple','youtube','anghami','deezer','amazon','castbox',
             'x','instagram','tiktok')),
  url      text not null,
  "order"  integer not null default 0,
  unique (show_id, platform)
);
comment on table public.radio_show_platforms is 'روابط البرنامج في المنصّات — تُعرض شاراتٍ في صفحته';

/* ── فهارس القراءة ────────────────────────────────────────────────── */
create index radio_shows_status_idx    on public.radio_shows (status, "order");
create index radio_episodes_show_idx   on public.radio_episodes (show_id, season, number desc);
create index radio_episodes_public_idx on public.radio_episodes (status, published_at desc);

/* ── الحراسة: قراءةٌ عامّة للمنشور، وكتابةٌ بقدرة manage_radio ──────── */
alter table public.radio_station        enable row level security;
alter table public.radio_shows          enable row level security;
alter table public.radio_episodes       enable row level security;
alter table public.radio_show_platforms enable row level security;

create policy radio_station_public_read on public.radio_station
  for select to anon, authenticated using (true);
create policy radio_station_admin_write on public.radio_station
  for all to authenticated
  using (check_user_permission(auth.uid(), 'manage_radio'))
  with check (check_user_permission(auth.uid(), 'manage_radio'));

create policy radio_shows_public_read on public.radio_shows
  for select to anon, authenticated using (status = 'published');
create policy radio_shows_admin_write on public.radio_shows
  for all to authenticated
  using (check_user_permission(auth.uid(), 'manage_radio'))
  with check (check_user_permission(auth.uid(), 'manage_radio'));

create policy radio_episodes_public_read on public.radio_episodes
  for select to anon, authenticated using (
    status = 'published'
    and (publish_at is null or publish_at <= now())
    and exists (select 1 from public.radio_shows s
                where s.id = radio_episodes.show_id and s.status = 'published')
  );
create policy radio_episodes_admin_write on public.radio_episodes
  for all to authenticated
  using (check_user_permission(auth.uid(), 'manage_radio'))
  with check (check_user_permission(auth.uid(), 'manage_radio'));

create policy radio_platforms_public_read on public.radio_show_platforms
  for select to anon, authenticated using (
    exists (select 1 from public.radio_shows s
            where s.id = radio_show_platforms.show_id and s.status = 'published')
  );
create policy radio_platforms_admin_write on public.radio_show_platforms
  for all to authenticated
  using (check_user_permission(auth.uid(), 'manage_radio'))
  with check (check_user_permission(auth.uid(), 'manage_radio'));

/* ── القدرة ومنحها (مؤقّتًا كالمكتبة؛ تنتقل لمنسّق قسم الإنتاج الإعلاميّ
      بعد ترحيل «نطاق المِنحة») ───────────────────────────────────── */
insert into public.permissions (permission_key, permission_name_ar, description, category)
values ('manage_radio', 'إدارة الإذاعة',
        'إنشاء برامج إذاعة أدِيب وحلقاتها ورفع صوتها ونشرها', 'radio')
on conflict do nothing;

insert into public.role_permissions (role_id, role_name, permission_id)
select r.id, r.role_name, p.id
from public.roles r
cross join public.permissions p
where p.permission_key = 'manage_radio'
  and r.role_name in ('club_president', 'president_advisor')
on conflict do nothing;
