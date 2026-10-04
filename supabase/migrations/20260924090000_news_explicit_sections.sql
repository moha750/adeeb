-- أقسامُ الخبر تُصرَّح ولا تُخمَّن.
--
-- **العلّة:** `news.content` نصٌّ عارٍ، فكان العارضُ **يستدلّ** على عناوين الأقسام من
-- شكل السطر (قصيرٌ · لا يُنهيه ترقيمٌ · تحته أسطر). والاستدلالُ يصيب ويخطئ، وقياسُ
-- ٢٠٢٦-٠٩-٢٤ على الأربعة عشر خبرًا المنشورة ردّ ستّةً مبوَّبةً وسبعةً بلا عنوانٍ واحد
-- وواحدًا بعنوانٍ يتيم — فالقارئُ يرى موقعًا متفاوتًا لا نظامَ له.
--
-- **والعمودُ `jsonb` لا جدولٌ ثانٍ** عن قصد: المتنُ لا يُقرأ ولا يُكتب إلّا كاملًا مع
-- أبيه، فجدولٌ مستقلٌّ يعني مسارَ كتابةٍ ثانيًا وترتيبًا يُعاد ترقيمُه وسياساتِ RLS
-- تحاكي `news` كلَّها — سطحُ خطرٍ جديدٌ بلا ثمرة. وههنا ترتيبُ الأقسام ترتيبُ
-- المصفوفة، وصلاحيّةُ الكتابة هي صلاحيّةُ حقل `content` القائمةُ نفسُها.
--
-- **و`content` يبقى** عمودًا `NOT NULL` لا يُسقَط، لكنّه يصير **إسقاطًا نصّيًّا**
-- لـ`blocks` تكتبه دالّةٌ واحدةٌ في مسار الحفظ (`sectionsToText`)، يخدم عدَّ الكلمات
-- ومدّةَ القراءة وأيَّ بحثٍ يأتي. فليس مصدرًا ثانيًا يُحرَّر.
--
-- **والهبوطُ آمن:** ما دام `blocks` فارغًا يُعرض الخبرُ بالاستدلال كما هو اليوم، فلا
-- لحظةَ ينكسر فيها شيء، ولا تلزم الأخبارُ أن تتحوّل دفعةً واحدة.

ALTER TABLE public.news
  ADD COLUMN IF NOT EXISTS blocks jsonb;

COMMENT ON COLUMN public.news.blocks IS
  'أقسامُ المتن مصرَّحةً: مصفوفةُ {heading: نصّ أو null، body: نصّ}. فارغٌ يعني خبرًا لم يُحوَّل بعدُ، فيُعرَض متنُه بالاستدلال من content.';

-- حارسُ الشكل. و**دالّةٌ لا تعبيرٌ مباشر** لأنّ قيدَ CHECK في Postgres لا يقبل
-- استعلامًا فرعيًّا، وفحصُ عناصر المصفوفة يحتاج `jsonb_array_elements`.
-- و`search_path` مُفرَّغٌ عمدًا (درسُ ترحيلات «خمّن الكلمة»): الدالّةُ لا تنادي إلّا
-- ما في `pg_catalog`، وهو في المسار ضمنًا فلا يُنتحَل.
CREATE OR REPLACE FUNCTION public.news_blocks_valid(b jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT b IS NULL OR (
    jsonb_typeof(b) = 'array'
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(b) AS e
      WHERE jsonb_typeof(e) IS DISTINCT FROM 'object'
         OR jsonb_typeof(e -> 'body') IS DISTINCT FROM 'string'
         OR COALESCE(jsonb_typeof(e -> 'heading'), 'null') NOT IN ('string', 'null')
    )
  );
$$;

COMMENT ON FUNCTION public.news_blocks_valid(jsonb) IS
  'أشكلُ news.blocks صحيح؟ مصفوفةٌ من كائنات، لكلٍّ body نصّيّ وheading نصٌّ أو غائبٌ أو null.';

ALTER TABLE public.news
  DROP CONSTRAINT IF EXISTS news_blocks_shape;

ALTER TABLE public.news
  ADD CONSTRAINT news_blocks_shape CHECK (public.news_blocks_valid(blocks));
