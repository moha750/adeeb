-- «لا فصلَ بلا عنوان» في القاعدة (محمد ٢٠٢٦-١١-١٧: «لا يُكتب فصلٌ إلّا بعنوان»؛ أذن بالتطبيق ١٣:٠١).
-- المحرّرُ يمنعه (`missingForPublish` في `dashboard/news/vocab.ts`)، وهذا حارسُه في القاعدة: صفحةُ الخبر ترسم كلَّ فصلٍ لوحًا باسمه
-- ويُفهرَس باسمه، ففصلٌ بلا عنوانٍ لوحٌ فارغ. يطابق قاعدةَ المحرّر: الفصلُ الذي فيه متنٌ يلزمه عنوان، والفارغُ كلُّه لا يُحسب.
-- قبل التطبيق: صفرُ خبرٍ منشورٍ يخالفه (عُنونت الأخبارُ الخمسةَ عشر في اليوم نفسه).

create or replace function public.news_blocks_titled(b jsonb)
returns boolean
language sql
immutable parallel safe
set search_path to ''
as $$
  select b is null or not exists (
    select 1
    from jsonb_array_elements(b) as e
    where btrim(coalesce(e ->> 'body', '')) <> ''
      and btrim(coalesce(e ->> 'heading', '')) = ''
  );
$$;

-- يُنادى من قيد التحقّق، فيلزمه EXECUTE لكلّ دورٍ يكتب في `news` (الدوالُّ الجديدة تولد مغلقة). دالّةٌ نقيّةٌ لا تقرأ شيئًا
grant execute on function public.news_blocks_titled(jsonb) to authenticated, service_role;

alter table public.news drop constraint news_publish_guard;
alter table public.news add constraint news_publish_guard check (
  workflow_status <> 'published'
  or (
    summary is not null and btrim(summary) <> ''
    and image_url is not null and btrim(image_url) <> ''
    and authors is not null and array_length(authors, 1) > 0
    and published_at is not null
    and public.news_blocks_titled(blocks)
  )
);
