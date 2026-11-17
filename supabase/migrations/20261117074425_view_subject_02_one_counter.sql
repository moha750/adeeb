-- **العدّادُ الواحد: كلُّ مشاهدةٍ تُعدّ من موضوعها المُعلَن** (٢٠٢٦-١١-١٧). القصّةُ كاملةً في ٠١.
--
-- يُطبَّق **بعد** نشر دالّة الحافّة التي تكتب `subject_kind` و`subject_id`. وفيه أربعُ خطوات في معاملةٍ
-- واحدة: نسبُ ما مضى إلى موضوعه، ثمّ تصحيحُ أرقام الأخبار، ثمّ هدمُ العدّاد المخمِّن، ثمّ العدّادُ الواحد.

-- **قفلُ الجدول أوّلًا** (مراجعةٌ مستقلّة): التصحيحُ في ٣ يقفل صفوفَ الأخبار، وزيارةٌ تُدرج أثناءه يوقظ
-- مُشغِّلُها القديمُ تحديثَ الخبر نفسه، ثمّ يطلب هدمُ المُشغِّل قفلًا حصريًّا ينتظرها: طريقٌ مسدود تضيع فيه
-- زيارةٌ أو يُلغى الترحيل. وزيارةٌ تُثبَّت بين لقطة التصحيح والهدم يعدّها التخمينُ وحده. فيُقفل الجدولُ
-- للكتابة من أوّل المعاملة إلى آخرها (ثوانٍ)، والزياراتُ تنتظر ثمّ تُدرج تحت المُشغِّل الجديد.
lock table public.site_pageviews in share row exclusive mode;

-- ═══ ١) قارئُ الروابط القديمة — لمرّةٍ واحدةٍ ثمّ يموت ═════════════════════
--
-- الزياراتُ الماضية لم يُعلَن موضوعُها، فلا سبيلَ إليه إلّا رابطُها. فيُقرأ هنا **مرّةً واحدة** بالقاعدة
-- التي تقرأ بها الصفحةُ نفسُها رابطَها (فكُّ الترميز ثمّ مطابقةُ المسمّى أو المعرّف مطابقةً تامّة)،
-- لا بتخمين ذيل. وفي `pg_temp` عن قصد: لا يبقى في القاعدة قارئُ روابطَ يُغري أحدًا بالعودة إليه.

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

create function pg_temp.vs_subject(p text, out kind text, out sid text)
language plpgsql stable as $$
declare
  seg  text;
  hits int;
begin
  if p ~ '^/news/[^/]+$' then
    seg := pg_temp.vs_decode(substring(p from 7));
    if coalesce(seg, '') = '' then return; end if;
    if seg ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      select 'news', n.id::text into kind, sid from public.news n where n.id = lower(seg)::uuid;
    else
      select 'news', n.id::text into kind, sid from public.news n where n.slug = seg;
      -- المقصوصُ (٥٠٠ حرف) بدايةُ مسمّاه: يُقبل إن لم يبدأ به إلّا خبرٌ واحد.
      if sid is null and length(p) >= 500 then
        select count(*) into hits from public.news n where starts_with(n.slug, seg);
        if hits = 1 then
          select 'news', n.id::text into kind, sid from public.news n where starts_with(n.slug, seg);
        end if;
      end if;
    end if;
  elsif p ~ '^/library/[^/]+$' then
    seg := pg_temp.vs_decode(substring(p from 10));
    select 'book', b.id::text into kind, sid from public.library_books b where b.slug = seg;
  elsif p ~ '^/s/[^/]+$' then
    select 'survey', s.id::text into kind, sid from public.surveys s where s.code = substring(p from 4);
  elsif p ~ '^/surveys/[0-9]{1,9}$' then
    select 'survey', s.id::text into kind, sid from public.surveys s where s.id = substring(p from 10)::int;
  end if;
end $$;

-- ═══ ٢) نسبُ ما مضى إلى موضوعه ═══════════════════════════════════════════
--
-- للأخبار والكتب والاستبيانات معًا، كي يصدق العمودُ على التاريخ كلّه. ولا يُعدّ هنا شيء: المُشغِّلُ
-- لم يولد بعد، وأرقامُ الكتب والاستبيانات عدّتها آلتاها في وقتها فلا تُمسّ.
with r as (
  select v.id, s.kind, s.sid
    from public.site_pageviews v
   cross join lateral pg_temp.vs_subject(v.page_path) s
   where v.subject_kind is null
     and v.page_path ~ '^/(news|library|s|surveys)/'
     and s.kind is not null
)
update public.site_pageviews v
   set subject_kind = r.kind, subject_id = r.sid
  from r
 where v.id = r.id;

-- ═══ ٣) تصحيحُ أرقام الأخبار ══════════════════════════════════════════════
--
-- ما عدّه التخمينُ يُطرح، وما ثبت موضوعُه يُضاف. فالرقمُ الجديد = القديم − ما عُدّ بالتخمين + ما ثبت.
-- بهذا يُردّ ما ضاع (خبرُ القهوة) ويُسحب ما عُدّ لغير صاحبه إن وُجد، ويبقى أساسُ V1 (المسارُ العامّ
-- `/news/news-detail.html` لم يُعدّ بالتخمين ولا ينتسب الآن) كما هو.
with h as (
  select public.news_id_of_path(page_path) as id, count(*) as k
    from public.site_pageviews
   where not is_bot and page_path like '/news/%'
   group by 1
),
e as (
  select subject_id::uuid as id, count(*) as k
    from public.site_pageviews
   where not is_bot and subject_kind = 'news'
   group by 1
),
d as (
  select coalesce(e.id, h.id) as id, coalesce(e.k, 0) - coalesce(h.k, 0) as delta
    from h full join e on e.id = h.id
   where coalesce(e.id, h.id) is not null
)
update public.news n
   set views = greatest(0, coalesce(n.views, 0) + d.delta)
  from d
 where n.id = d.id and d.delta <> 0;

-- ═══ ٤) هدمُ العدّاد المخمِّن ═════════════════════════════════════════════
drop trigger if exists site_pageviews_bump_news_views on public.site_pageviews;
drop function if exists public.news_views_from_pageview();
drop function if exists public.news_id_of_path(text);

-- ═══ ٥) الموضوعُ يُكتب مرّةً ولا يتبدّل ═══════════════════════════════════
--
-- فالزيارةُ الواحدة لا تُعدّ لموضوعين، ولا تُعدّ مرّتين بإعادة الكتابة.
create or replace function public.pageview_subject_frozen()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.subject_kind is not null then
    new.subject_kind := old.subject_kind;
    new.subject_id   := old.subject_id;
  end if;
  return new;
end $$;

drop trigger if exists site_pageviews_subject_frozen on public.site_pageviews;
create trigger site_pageviews_subject_frozen
before update of subject_kind, subject_id on public.site_pageviews
for each row execute function public.pageview_subject_frozen();

-- ═══ ٦) العدّادُ الواحد ═══════════════════════════════════════════════════
--
-- يعدّ حين يولد الموضوعُ في الزيارة: مع إدراجها (أعلنته الصفحةُ قبل الإرسال)، أو بتحديثها من فراغٍ
-- إلى موضوع (أعلنته بعده، كصفحةٍ تتدفّق). ولا يعدّ الروبوت. والنبضاتُ لا تمسّ عمودَي الموضوع
-- فلا يوقظه مرورُها. ولكلّ نوعٍ عمودُه القائم، فلا يتغيّر شيءٌ عند من يقرأ الأرقام.
-- ولا يُعدّ إلّا ما تعرضه صفحتُه للناس (منشورٌ، وكتابٌ منشور، واستبيانٌ قائم): فطلبٌ مصنوعٌ يحمل
-- معرّفَ مسوّدةٍ لا يرفع لها رقمًا.
create or replace function public.pageview_count_subject()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.subject_kind is null or new.is_bot then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.subject_kind is not null then
    return new;
  end if;

  case new.subject_kind
    when 'news' then
      update public.news set views = coalesce(views, 0) + 1
       where id = new.subject_id::uuid and workflow_status = 'published';
    when 'book' then
      update public.library_books set views = coalesce(views, 0) + 1
       where id = new.subject_id::uuid and status = 'published';
    when 'survey' then
      update public.surveys set total_views = coalesce(total_views, 0) + 1
       where id = new.subject_id::integer and status = 'active' and archived_at is null and deleted_at is null;
    else
      -- نوعٌ أُضيف إلى القيد ولم يُضف هنا: لا يُعدّ، ولا تسقط الزيارة.
      null;
  end case;
  return new;
end $$;

comment on function public.pageview_count_subject() is
  'العدّادُ الواحد لمشاهدات الخبر والكتاب والاستبيان: يعدّ الموضوعَ الذي أعلنته الصفحةُ لا ما يُستنتج من رابطها.';

drop trigger if exists site_pageviews_count_subject on public.site_pageviews;
create trigger site_pageviews_count_subject
after insert or update of subject_kind, subject_id on public.site_pageviews
for each row execute function public.pageview_count_subject();
