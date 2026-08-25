-- خمّن الكلمة — التصنيفُ صفٌّ يُدار لا نصٌّ يُكتَب (م٠ح)
-- طُبِّق ٢٠٢٦-٠٨-٢٦ بإذن المالك.
--
-- ## العلّة
-- كان التصنيفُ نصًّا حرًّا في كلّ كلمة، وقائمتُه **مشتقّةً** من `distinct` على
-- الكلمات. وثلاثةُ عيوبٍ في ذلك:
-- ١. **لا يُنشَأ تصنيفٌ قبل كلمته** — فلا يُهيَّأ البنكُ ثمّ يُملأ.
-- ٢. **الخطأُ المطبعيّ يصير تصنيفًا** («أدبية» و«أدبيّة» صنفان لا يجمعهما شيء).
-- ٣. **لا إعادةَ تسمية** — تصحيحُ اسمٍ يعني تحريرَ كلّ كلمةٍ تحته.
--
-- **وقرارُ المالك ٢٠٢٦-٠٨-٢٦: تُضاف التصنيفاتُ من بنك الكلمات.** فتصير جدولًا.
--
-- ## والمفتاحُ نصٌّ لا معرّفٌ مولَّد — عمدًا
-- `name` هو المفتاح، و`guess_word_bank.category` يشير إليه بـ**`on update cascade`**.
-- فإعادةُ التسمية تنساب على كلّ كلمةٍ تحته بلا `update` يدويٍّ ولا ترحيل. ومعرّفٌ
-- مولَّدٌ كان سيلزمه عمودٌ ثانٍ وضمٌّ في كلّ قراءة، بلا مقابلٍ يُذكَر لقائمةٍ من عشرات.
--
-- و`on delete restrict`: تصنيفٌ تحته كلماتٌ لا يُحذَف صامتًا فتصير كلماتُه يتامى.
-- الشاشةُ تقول «انقُلها أو احذفها أوّلًا»، والقاعدةُ تحرس ذلك ولا تتّكل على الشاشة.
--
-- ## ولا صفَّ يُكسَر
-- البنكُ خالٍ لحظةَ التطبيق (فُحِص)، فالمفتاحُ الأجنبيُّ يُضاف بلا استيفاءٍ تمهيديّ.
-- ويُبذَر «عامّة» لأنّه الافتراضُ المكتوبُ في عمود `category` منذ م٠ب.

create table if not exists public.guess_word_categories (
  name       text primary key check (length(btrim(name)) between 1 and 40),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

insert into public.guess_word_categories (name) values ('عامّة')
on conflict (name) do nothing;

alter table public.guess_word_bank
  drop constraint if exists guess_word_bank_category_fkey;

alter table public.guess_word_bank
  add constraint guess_word_bank_category_fkey
  foreign key (category) references public.guess_word_categories(name)
  on update cascade on delete restrict;

alter table public.guess_word_categories enable row level security;

-- القدرةُ نفسُها التي تفتح البنك: التصنيفُ جزءٌ من البنك لا غرفةٌ أخرى.
drop policy if exists gw_categories_read on public.guess_word_categories;
create policy gw_categories_read on public.guess_word_categories
  for select to authenticated
  using (public.check_user_permission((select auth.uid()), 'manage_games'));

drop policy if exists gw_categories_write on public.guess_word_categories;
create policy gw_categories_write on public.guess_word_categories
  for all to authenticated
  using (public.check_user_permission((select auth.uid()), 'manage_games'))
  with check (public.check_user_permission((select auth.uid()), 'manage_games'));

grant select, insert, update, delete on table public.guess_word_categories to authenticated;

-- **والنزعُ الصريحُ يلي المنحَ دائمًا** — درسُ م٠ج: امتيازاتُ Supabase الافتراضيّة
-- تُسنِد لكلّ جدولٍ جديدٍ في `public` كتابةً لـ`anon`، و`grant … to authenticated`
-- لا ينفيها.
revoke all on table public.guess_word_categories from anon;
revoke truncate on table public.guess_word_categories from authenticated;
