-- ٢٠٢٦-٠٨-٢٠ — مصدرُ الزيارة: موقعٌ أم تطبيق.
--
-- صار للنادي بابان يُدخَل منهما: adeeb.club وتطبيقُ الجوّال. وكلاهما يكتب في هذا الجدول،
-- فلولا عمودٌ يفرزهما لاختلط جمهوران في رقمٍ واحدٍ لا يصفُ أحدَهما.
--
-- وكان الفرزُ ممكنًا بمخطَّط `page_url` (`adeeb://`)، وهو ما جرى به العملُ يومًا واحدًا؛
-- والعمودُ الصريحُ أصدق: العنوانُ عرَضٌ يتبدّل، والمصدرُ واقعةٌ تُعلَن.
--
-- والافتراضُ `web` عمدًا: كلُّ ما مضى منذ مايو ٢٠٢٦ زياراتُ موقع، ولا يُعاد تفسيرُ الماضي.

alter table public.site_pageviews
  add column if not exists source text not null default 'web';

alter table public.site_pageviews
  drop constraint if exists site_pageviews_source_check;

alter table public.site_pageviews
  add constraint site_pageviews_source_check check (source in ('web', 'app'));

-- الصفوفُ الثلاثةُ والثلاثون التي كتبها التطبيقُ اليوم تُنسَب إلى بابها
update public.site_pageviews
   set source = 'app'
 where page_url like 'adeeb://%';

comment on column public.site_pageviews.source is
  'بابُ الزيارة: web للموقع، app لتطبيق الجوّال. تكتبه دالّةُ الحافّة track-pageview.';
