-- مشاهداتُ الخبر تُشتقّ من جهاز الرصد، ولا عدّادَ ثانيَ لها (٢٠٢٦-٠٩-٢٤).
--
-- **العلّة:** `news_bump_views` تصفّي على عمود `status` — **وهو عمودٌ أُسقط** — فتُخفق
-- كلّما نوديت. ولا موضعَ في V2 يناديها أصلًا. فالرقمُ المعروض (٣٣٨) مجمَّدٌ منذ موت
-- V1 في ٢٠٢٦-٠٨-٠١، وبطاقةُ الخبر تكذب على قارئها منذ ذلك الحين.
--
-- **والعلاجُ اشتقاقٌ لا عدّادٌ ثانٍ** (اختيارُ المالك): `site_pageviews` يرصد كلَّ
-- فتحةٍ أصلًا، ويصفّي الروبوتات، وسجّل أمسِ. فبناءُ عدّادٍ موازٍ يعني مصدرَين لحقيقةٍ
-- واحدة — وهو ما يمنعه قانونُ المستودع.

-- ═══ ١) المسارُ إلى الخبر ═══════════════════════════════════════════════
--
-- **ولِمَ لا يُفكّ ترميزُ المسار؟** لأنّ المسمّى عربيٌّ يُرمَّز في الرابط إلى عشرات
-- البايتات، وفكُّه في SQL دالّةٌ ثقيلةٌ تُستدعى عند كلّ رصد. وفي ذيل كلّ مسمّى **ثمانيةُ
-- أحرفٍ سداسيّةٍ لاتينيّةٍ تنجو من الترميز كما هي** — ومقيسٌ أنّها متمايزةٌ عند ستّةٍ
-- لأخبارنا الستّة عشر كلِّها.
--
-- وتُقبَل ثلاثُ صور، وكلُّها مرصودةٌ فعلًا في الجدول:
--   · `/news/<عربيّ مرمَّز>-a57ebacc`  ← الذيلُ كاملًا
--   · `/news/<عربيّ مرمَّز>-ed38f2`    ← ذيلٌ مقصوصٌ إلى ستّة (وقع في ١٠ مشاهدات)
--   · `/news/<uuid>`                   ← روابطُ قديمةٌ تحمل المعرّف (٩ مشاهدات)
-- والقاعدةُ تُطابق **٤١ من ٤١** مشاهدةَ خبرٍ من عهد V2، لا تفوتها واحدة.
--
-- و`STABLE` لا `IMMUTABLE`: تقرأ جدولًا يتغيّر.
CREATE OR REPLACE FUNCTION public.news_id_of_path(p text)
RETURNS uuid
LANGUAGE sql
STABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT id FROM (
    SELECT n.id FROM public.news n
     WHERE n.slug IS NOT NULL
       AND p ~ ('(^|-)' || left(right(n.slug, 8), 6) || '[0-9a-f]{0,2}$')
    UNION ALL
    SELECT n.id FROM public.news n
     WHERE p ~* ('/' || n.id::text || '$')
  ) s LIMIT 1;
$$;

COMMENT ON FUNCTION public.news_id_of_path(text) IS
  'أيُّ خبرٍ يقصده مسارُ صفحةٍ مرصود؟ يُطابَق بذيل المسمّى السداسيّ (ينجو من ترميز الرابط) أو بالمعرّف الكامل للروابط القديمة.';

-- ═══ ٢) كلُّ فتحةٍ مرصودةٍ تزيد مشاهدةً ═════════════════════════════════
--
-- والرصدُ صفٌّ واحدٌ عند فتح الصفحة (النبضاتُ بعده **تُحدِّث** الصفَّ ولا تُدرج)، فالمُشغِّلُ
-- على الإدراج وحدَه يعدّ فتحةً واحدةً لكلّ فتحة.
CREATE OR REPLACE FUNCTION public.news_views_from_pageview()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_id uuid;
BEGIN
  IF coalesce(NEW.is_bot, false) THEN RETURN NEW; END IF;
  IF NEW.page_path IS NULL OR NEW.page_path NOT LIKE '/news/%' THEN RETURN NEW; END IF;

  v_id := public.news_id_of_path(NEW.page_path);
  IF v_id IS NOT NULL THEN
    UPDATE public.news SET views = coalesce(views, 0) + 1 WHERE id = v_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS site_pageviews_bump_news_views ON public.site_pageviews;
CREATE TRIGGER site_pageviews_bump_news_views
AFTER INSERT ON public.site_pageviews
FOR EACH ROW EXECUTE FUNCTION public.news_views_from_pageview();

-- ═══ ٣) ما رُصد ولم يُعَدّ ══════════════════════════════════════════════
--
-- ٤١ فتحةً سجّلها جهازُ الرصد في عهد V2 ولم تبلغ العدّادَ قطّ، لأنّ الدالّةَ كانت
-- معطوبةً ولا نداءَ لها. تُضاف مرّةً واحدة.
--
-- **ولا يُزاد على الـ٣٣٨ ازدواجٌ:** مشاهداتُ V1 مرصودةٌ بمسارٍ عامٍّ
-- (`/news/news-detail.html`) لا يدلّ على خبرٍ بعينه، فلا تُطابقها القاعدةُ ولا تُعَدّ
-- مرّتين. والرقمُ القديمُ يبقى أساسًا تاريخيًّا يُبنى عليه.
UPDATE public.news n
   SET views = coalesce(n.views, 0) + c.k
  FROM (
    SELECT public.news_id_of_path(v.page_path) AS id, count(*) AS k
      FROM public.site_pageviews v
     WHERE NOT coalesce(v.is_bot, false)
       AND v.page_path LIKE '/news/%'
     GROUP BY 1
  ) c
 WHERE c.id IS NOT NULL AND c.id = n.id;

-- ═══ ٤) العدّادُ المعطوب يُهدَم ═════════════════════════════════════════
DROP FUNCTION IF EXISTS public.news_bump_views(uuid);
