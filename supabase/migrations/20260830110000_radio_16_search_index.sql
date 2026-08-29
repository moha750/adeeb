-- ══════════════════════════════════════════════════════════════════════════════
-- إذاعة أدِيب م١٦: أعمدةُ البحث المطبَّعة وفهارسُها
--
-- ⚠️ مكتوبٌ ينتظر إذنَ المالك. لا يُنفَّذ إلّا بكلمته.
-- ⚠️ **أثقلُ ما في السبعة قفلًا.** والملفُّ معاملةٌ واحدة، فقفلُ
--    `ACCESS EXCLUSIVE` الذي يأخذه أوّلُ `alter table` **لا يُفكّ قبل
--    `commit`**: فالنافذةُ تشمل إعادةَ كتابة الجدولين **وبناءَ الفهارس الثلاثة
--    معًا**، لا إعادةَ الكتابة وحدها. وهو يحجب القراءةَ لا الكتابةَ فقط.
--    اليومَ لحظيٌّ (برنامجٌ وثلاثُ حلقاتٍ و٣٠٬٨٨٦ حرفَ تفريغ)؛ ومع الآلاف
--    **يُجدوَل في ساعةٍ هادئة**، أو تُقطَع الفهارسُ إلى ترحيلٍ بلا معاملةٍ
--    وتُبنى `concurrently`.
--
-- ## ⚠️ وقاعدةٌ تلزم من يعدّل `arabic_norm` يومًا
-- الأعمدةُ أدناه **مولَّدةٌ مخزَّنة**، وفهرسُ `radio_topics_name_norm_key`
-- فهرسُ تعبير. و`create or replace function` **لا يُعيد حسابَ مخزونٍ ولا
-- يُعيد بناءَ فهرس**. فمن عدّل الدالّةَ لزمه في الترحيل نفسِه: إسقاطُ العمودين
-- المولَّدين وإعادتُهما، و`reindex` للفهرس الفريد. وإلّا استُعلم بالتطبيع
-- الجديد وقُورن بمخزونٍ طُبِّع بالقديم، فتخلو النتائجُ **ويبدو البحثُ سليمًا**
-- — وهو العطلُ بعينه الذي كُتب م١٠ لمنعه.
--
-- ## ما يعالجه
-- البحثُ اليومَ يقع في الخادم على حوضٍ محدود (`SEARCH_POOL = 120`) لأنّه لا
-- عمودَ مطبَّعًا في القاعدة. وهو يصمد إلى بضع مئاتٍ من الحلقات ثمّ يسقط.
-- ══════════════════════════════════════════════════════════════════════════════

begin;

/* `pg_trgm` غيرُ منصَّبةٍ اليوم (قِيس ٢٠٢٦-٠٨-٣٠). وهي لا `tsvector` لأنّ
   بحثَنا **جزءُ كلمةٍ لا كلمةٌ كاملة**: من كتب «منعط» يجب أن يجد «منعطف»،
   ولا مُجذِّرَ عربيًّا في Postgres يفعلها. */
create extension if not exists pg_trgm with schema extensions;

/* ══ البرامج ══════════════════════════════════════════════════════════════════ */
alter table public.radio_shows
  add column if not exists search_norm text
    generated always as (
      public.arabic_norm(coalesce(title, '') || ' ' || coalesce(tagline, '') || ' ' || coalesce(description, ''))
    ) stored;

create index if not exists radio_shows_search_trgm
  on public.radio_shows using gin (search_norm extensions.gin_trgm_ops);

/* ══ الحلقات: عمودان لا واحد ══════════════════════════════════════════════════
   العنوانُ والملخّصُ في عمود، والتفريغُ في آخر. والسببُ أنّ نطاقَي البحث
   مختلفان في الواجهة («حلقات» و«داخلَ الكلام»)، فلو جُمعا في عمودٍ واحدٍ لعاد
   البحثُ عن عنوانٍ بنتائجَ من متن الكلام ولا سبيل إلى فصلها.
   والتفريغُ ضخم، فعمودُه وحدَه يُفهرَس ولا يُقرأ في الكشوف. */
alter table public.radio_episodes
  add column if not exists search_norm text
    generated always as (
      public.arabic_norm(coalesce(title, '') || ' ' || coalesce(summary, ''))
    ) stored,
  add column if not exists transcript_norm text
    generated always as (public.arabic_norm(coalesce(transcript, ''))) stored;

create index if not exists radio_episodes_search_trgm
  on public.radio_episodes using gin (search_norm extensions.gin_trgm_ops);
create index if not exists radio_episodes_transcript_trgm
  on public.radio_episodes using gin (transcript_norm extensions.gin_trgm_ops);

comment on column public.radio_shows.search_norm is
  'اسمُ البرنامج وجملتُه ووصفُه مطبَّعةً. يُستعلَم بـarabic_norm نفسِها، وإلّا لم يجد أحدٌ شيئًا وبدا البحثُ سليمًا.';
comment on column public.radio_episodes.transcript_norm is
  'نصُّ الحلقة مطبَّعًا. عمودٌ مستقلٌّ لأنّ «داخلَ الكلام» نطاقٌ مستقلٌّ في الواجهة، ولأنّه ضخمٌ فلا يُقرأ في الكشوف.';

commit;
