-- ══════════════════════════════════════════════════════════════════════════════
-- إذاعة أدِيب م١٣: الوسومُ الموضوعيّة
--
-- ⚠️ مكتوبٌ ينتظر إذنَ المالك. لا يُنفَّذ إلّا بكلمته.
--
-- ## لماذا
-- المصنِّفُ الوحيدُ اليومَ عمودُ `tone`، وهو **خمسُ نغماتٍ لونيّة** وُضعت
-- للهويّة لا للدلالة. فعند مئة برنامجٍ يتقاسم كلُّ عشرين برنامجًا لونًا واحدًا،
-- فيسقط اللونُ عن التمييز ولا يخلفه شيء.
--
-- ## وجدولٌ مغلقٌ لا وسومٌ حرّة
-- الوسمُ الحرُّ يتناسل مترادفاتُه: «شعر» و«الشعر» و«شِعر» ثلاثةُ أبوابٍ إلى
-- شيءٍ واحد. فالجدولُ يحرّره صاحبُ `manage_radio` وحدَه، والزائرُ يختار ممّا فيه.
--
-- ## والتفرّدُ بالمعنى لا بالبايت
-- فهرسٌ فريدٌ على `arabic_norm(name)` لا على `name`: بدونه يمرّ «شعر» و«شعر »
-- و«شِعر» ثلاثةَ صفوف. ولذلك يتبع هذا الملفُّ م١٠.
-- ══════════════════════════════════════════════════════════════════════════════

begin;

create table if not exists public.radio_topics (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null,
  name       text not null,
  "order"    integer not null default 0,
  created_at timestamptz not null default now(),
  constraint radio_topics_slug_shape check (slug ~ '^[a-z0-9-]{2,40}$'),
  constraint radio_topics_name_len   check (char_length(btrim(name)) between 2 and 40)
);

create unique index if not exists radio_topics_slug_key on public.radio_topics (slug);
/* التفرّدُ بالمعنى: «شعر» و«شعر » و«شِعر» صنفٌ واحد. */
create unique index if not exists radio_topics_name_norm_key
  on public.radio_topics (public.arabic_norm(name));

comment on table public.radio_topics is
  'تصنيفاتٌ مغلقةٌ يحرّرها صاحبُ manage_radio. خلَفُ عمود tone الذي كان خمسَ نغماتٍ لونيّةٍ لا دلالة.';

create table if not exists public.radio_show_topics (
  show_id  uuid not null references public.radio_shows(id)  on delete cascade,
  topic_id uuid not null references public.radio_topics(id) on delete cascade,
  primary key (show_id, topic_id)
);

create index if not exists radio_show_topics_topic_idx
  on public.radio_show_topics (topic_id);

/* ══ الحراسة: قراءةٌ للعموم، وكتابةٌ لصاحب القدرة وحدَه ══════════════════════ */
alter table public.radio_topics      enable row level security;
alter table public.radio_show_topics enable row level security;

drop policy if exists radio_topics_public_read on public.radio_topics;
create policy radio_topics_public_read on public.radio_topics for select using (true);

drop policy if exists radio_topics_admin_write on public.radio_topics;
create policy radio_topics_admin_write on public.radio_topics for all
  using (public.check_user_permission((select auth.uid()), 'manage_radio'))
  with check (public.check_user_permission((select auth.uid()), 'manage_radio'));

drop policy if exists radio_show_topics_public_read on public.radio_show_topics;
create policy radio_show_topics_public_read on public.radio_show_topics for select using (true);

drop policy if exists radio_show_topics_admin_write on public.radio_show_topics;
create policy radio_show_topics_admin_write on public.radio_show_topics for all
  using (public.check_user_permission((select auth.uid()), 'manage_radio'))
  with check (public.check_user_permission((select auth.uid()), 'manage_radio'));

revoke all on public.radio_topics, public.radio_show_topics from anon, authenticated;
grant select on public.radio_topics, public.radio_show_topics to anon, authenticated;
grant insert, update, delete on public.radio_topics, public.radio_show_topics to authenticated;

/* ══ بذرةٌ أوّلى: ثمانيةٌ تناسب ناديًا أدبيًّا ═════════════════════════════════
   وليست حكمًا نهائيًّا — تُحرَّر من اللوحة. والغرضُ ألّا ينزل السطحُ فارغًا. */
insert into public.radio_topics (slug, name, "order") values
  ('hiwar',    'حوار',   1),
  ('qiraa',    'قراءة',  2),
  ('shiar',    'شعر',    3),
  ('naqd',     'نقد',    4),
  ('sard',     'سرد',    5),
  ('kitaba',   'كتابة',  6),
  ('sira',     'سيرة',   7),
  ('tarjama',  'ترجمة',  8)
on conflict (slug) do nothing;

commit;
