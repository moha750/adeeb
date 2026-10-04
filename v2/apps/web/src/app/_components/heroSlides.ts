import "server-only";
import { createAdeebServerClient } from "@adeeb/core";
import type { HeroSlide } from "./Hero";

type NewsBit = { id: string; title: string; image_url: string | null; slug: string | null };

const toSlide = (n: NewsBit & { image_url: string }): HeroSlide => ({
  tag: "خبر",
  title: n.title,
  img: n.image_url,
  href: n.slug ? `/news/${n.slug}` : "/news",
});

/**
 * شرائحُ صدر الهبوط — **ما يختاره المسؤولُ من «اللوحة الإعلانية»** بترتيبه
 * (جدولُ `hero_news`، قسمُ «الأخبار المعروضة» في `/dashboard/website/announcements`).
 * قال المالك «نختارها»، فسقط الترتيبُ الزمنيّ مصدرًا وبقي شبكةَ أمان.
 *
 * **والفرقُ بين «لا اختيار» و«تعذّرت القراءة» فرقٌ يُبنى عليه** (عُرفُ `heroTicker.ts`):
 * قائمةٌ فارغةٌ قرارُ صاحب اللوحة، فيُرسَم الصدرُ بلوحه وحده. والعطبُ العابر (جدولٌ لم
 * يُرحَّل بعدُ، أو قاعدةٌ لا تردّ) يرجع إلى أحدثِ أربعةٍ منشورة — ما كان الصدرُ يعرضه
 * قبل الاختيار — فلا يخلو العارضُ لزائرٍ بسبب دقيقةٍ سيّئة.
 *
 * ولا يُعرَض إلّا منشورٌ له غلاف، ولو بقي في الاختيار خبرٌ أُرشف أو نُزع غلافُه:
 * القراءةُ بعميل الزائر، وسياسةُ `news` تحجب غيرَ المنشور، والشرطان هنا يُكملانها.
 */
export async function getHeroSlides(): Promise<HeroSlide[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];

  const sb = createAdeebServerClient(url, key);
  const { data, error } = await sb
    .from("hero_news")
    .select("sort, news!inner(id,title,image_url,slug,workflow_status)")
    .eq("news.workflow_status", "published")
    .not("news.image_url", "is", null)
    .order("sort", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<{ sort: number; news: NewsBit & { workflow_status: string } }[]>();

  if (error || !data) return latest(sb);

  return data
    .map((r) => r.news)
    .filter((n): n is NewsBit & { image_url: string; workflow_status: string } => !!n?.image_url)
    .map(toSlide);
}

/** شبكةُ الأمان: أحدثُ أربعةِ أخبارٍ منشورةٍ لها غلاف. وفشلُها لا يُسقط الصفحة. */
async function latest(sb: ReturnType<typeof createAdeebServerClient>): Promise<HeroSlide[]> {
  const { data, error } = await sb
    .from("news")
    .select("id,title,image_url,slug")
    .eq("workflow_status", "published")
    .not("image_url", "is", null)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(4)
    .returns<(NewsBit & { image_url: string })[]>();

  if (error || !data) return [];
  return data.map(toSlide);
}
