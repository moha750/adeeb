-- **هدمُ آلتَي العدّ القديمتين** (٢٠٢٦-١١-١٧). القصّةُ في ٠١.
--
-- يُطبَّق **بعد رفع الموقع** الذي تُعلن فيه صفحتا الكتاب والاستبيان موضوعَهما: قبله ما زال الموقعُ
-- الحيّ يناديهما، ونداؤهما هو ما يعدّ. وبعده لا ينادي أحد، فبقاؤهما بابٌ مفتوح:
-- `library_increment_views` ممنوحةٌ لـ anon، فكلُّ من يحمل المفتاحَ العامّ يرفع مشاهداتِ كتابٍ بحلقة.
-- ومعه في المستودع: حذفُ `legacyNewsSubject` من دالّة الحافّة ونشرُها، وتوليدُ `database.types.ts`.

drop function if exists public.library_increment_views(uuid);
drop function if exists public.increment_survey_views(integer);

-- ═══ نسبُ زيارات الكتب والاستبيانات بين ٠٢ والرفع ═══════════════════════════
--
-- في تلك الفترة كان الموقعُ القديمُ يعدّهما بالآلتين، والمَعبرُ لا يعرف إلّا الخبر، فبقيت زياراتُهما بلا
-- موضوع. تُنسب هنا ليصدق العمودُ على التاريخ كلّه، **والعدّادُ موقوفٌ أثناء النسب**: الآلتان عدّتاها في
-- وقتها، فلو أيقظها النسبُ لعُدّت مرّتين. (المكتبةُ: المسمّى بعد فكّ ترميزه؛ الاستبيان: رمزُه القصير.)
-- قارئُ الرابط نفسُه الذي في ٠٢، لمرّةٍ واحدةٍ في `pg_temp`.
create function pg_temp.vs_decode(p text) returns text
language plpgsql immutable as $$
declare
  b bytea := ''::bytea;
  t text;
  i int;
begin
  -- رابطٌ قصّته الدالّةُ القديمة عند ٥٠٠ حرف قد ينتهي بنصف رمز (`%D` أو `%`): يُسقط.
  p := regexp_replace(p, '%[0-9A-Fa-f]?$', '');
  for t in
    select r.m[1] from regexp_matches(p, '%[0-9A-Fa-f]{2}|[^%]+|%', 'g') with ordinality as r(m, o) order by r.o
  loop
    b := b || case when t ~ '^%[0-9A-Fa-f]{2}$' then decode(substr(t, 2), 'hex') else convert_to(t, 'UTF8') end;
  end loop;
  -- والقصُّ قد يشقّ حرفًا عربيًّا (بايتان): يُسقط ما لا يكتمل، ثلاثةُ بايتاتٍ على الأكثر.
  for i in 0..3 loop
    exit when length(b) - i < 0;
    begin
      return convert_from(substring(b from 1 for length(b) - i), 'UTF8');
    exception when others then
      null;
    end;
  end loop;
  return null;
end $$;

lock table public.site_pageviews in share row exclusive mode;
alter table public.site_pageviews disable trigger site_pageviews_count_subject;

with r as (
  select v.id,
         coalesce(
           (select 'book:' || b.id::text from public.library_books b
             where '/library/' || b.slug = v.page_path
                or b.slug = pg_temp.vs_decode(substring(v.page_path from 10))
             limit 1),
           (select 'survey:' || s.id::text from public.surveys s
             where '/s/' || s.code = v.page_path limit 1)
         ) as subj
    from public.site_pageviews v
   where v.subject_kind is null
     and v.page_path ~ '^/(library|s)/[^/]+$'
)
update public.site_pageviews v
   set subject_kind = split_part(r.subj, ':', 1),
       subject_id   = split_part(r.subj, ':', 2)
  from r
 where v.id = r.id and r.subj is not null;

alter table public.site_pageviews enable trigger site_pageviews_count_subject;
