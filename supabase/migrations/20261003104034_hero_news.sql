-- أخبارُ الصدر — الشرائحُ التي يعرضها صدرُ الصفحة الرئيسية تصير اختيارًا من اللوحة
--
-- ## ما الذي يتحرّك
-- عارضُ الصدر (`app/_components/heroSlides.ts`) يأخذ اليومَ أحدثَ أربعةِ أخبارٍ منشورةٍ
-- لها غلاف، والمالكُ قال «نختارها». فهذا الجدولُ هو الاختيار: خبرٌ في صفٍّ، وترتيبُه
-- ترتيبُ مروره في العارض. وبابُه قسمٌ في «اللوحة الإعلانية» (طلبُ المالك ٢٠٢٦-١٠-٠٣).
--
-- ## ولمَ جدولٌ لا `news.is_featured`
-- `is_featured` يرسم شارةَ «مميّز» على الخبر في `/news` وصفحةِ المقال، ويقلبه رئيسُ
-- التحرير من غرفته. فلو صار هو بابَ الصدر لَتزوّج القراران: من أراد خبرًا في الصدر
-- شارَه للقارئ بالضرورة. ثمّ إنّه عَلَمٌ لا ترتيبَ فيه، والعارضُ يمرّ بترتيب.
--
-- ## والقفلُ قفلُ الغرفة `manage_announcements`
-- القسمُ في غرفة اللوحة الإعلانية، فمن ملكها ملكه. ولا قفلَ جديدًا يُمنَح.
--
-- ## والبذرةُ ما يراه الزائرُ اليوم
-- الأربعةُ التي يعرضها الصدرُ الآن تُنقل كما هي وبترتيبها، فلا يتبدّل شيءٌ أمام الزائر
-- بترتيبٍ موضوعُه من يختار لا ما يُختار. والشرطُ يجعله مُعادًا بلا أثر.
--
-- ## وكيف طُبِّق (٢٠٢٦-١٠-٠٣، بإذن المالك)
-- `apply_migration` في أداة Supabase علِق ثلاثَ مرّاتٍ حتّى انقضت مهلتُه، وكذلك
-- `execute_sql` متى حمل `drop …`: الأداةُ تنتظر تأكيدَ «عبارةٍ هدّامة» لا يصل.
-- فطُبِّق أجزاءً بـ`execute_sql` بلا `drop` (السياساتُ لم تكن موجودةً أصلًا)، ثمّ
-- سُجِّل صفُّه في `supabase_migrations.schema_migrations` بهذه النسخة يدويًّا.
-- والملفُّ يبقى مُعادًا بلا أثر كما هو. **ولمن بعدي:** ترحيلٌ فيه `drop` يُقسَم.

begin;

-- ═══ (١) الجدول ═════════════════════════════════════════════════════════════
create table if not exists public.hero_news (
  -- الخبرُ مفتاحٌ: لا يُعرَض خبرٌ مرّتين. وحذفُه من الغرفة يُسقطه من الصدر معه.
  news_id     uuid primary key references public.news(id) on delete cascade,
  sort        integer not null default 0,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

comment on table public.hero_news is
  'أخبارُ الصدر — الشرائحُ المختارة لعارض الصفحة الرئيسية بترتيبها، تُدار من /dashboard/website/announcements.';

create index if not exists hero_news_sort_idx on public.hero_news (sort, created_at);

-- ═══ (٢) الحراسة ════════════════════════════════════════════════════════════
-- القراءةُ للعموم لأنّ الصدرَ يُرسَم لزائرٍ بلا جلسة، لكن لا يُكشف إلّا صفُّ خبرٍ منشور:
-- خبرٌ أُرشف وبقي في الاختيار لا يُعلَن معرّفُه لمن لا يرى الخبرَ نفسَه.
alter table public.hero_news enable row level security;

drop policy if exists hero_news_read on public.hero_news;
create policy hero_news_read on public.hero_news
  for select to anon, authenticated
  using (
    exists (select 1 from public.news n where n.id = news_id and n.workflow_status = 'published')
    or check_user_permission((select auth.uid()), 'manage_announcements')
  );

-- والكتابةُ لصاحب القفل. والغرفةُ تكتب بمفتاح الخدمة (التفويضُ عند الباب)،
-- فهذه السياسةُ حارسُ من ينادي القاعدةَ من المتصفّح مباشرةً.
drop policy if exists hero_news_write on public.hero_news;
create policy hero_news_write on public.hero_news
  for all to authenticated
  using (check_user_permission((select auth.uid()), 'manage_announcements'))
  with check (check_user_permission((select auth.uid()), 'manage_announcements'));

grant select on public.hero_news to anon, authenticated;
grant insert, update, delete on public.hero_news to authenticated;

-- ═══ (٣) البذرة: ما يعرضه الصدرُ اليومَ بترتيبه ═════════════════════════════
insert into public.hero_news (news_id, sort)
select n.id, (row_number() over (order by n.published_at desc nulls last) - 1)::int
from public.news n
where n.workflow_status = 'published'
  and n.image_url is not null
  and not exists (select 1 from public.hero_news)
order by n.published_at desc nulls last
limit 4;

commit;
