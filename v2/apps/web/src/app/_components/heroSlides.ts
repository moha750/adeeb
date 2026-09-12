import "server-only";
import { createAdeebServerClient } from "@adeeb/core";
import type { HeroSlide } from "./Hero";

/**
 * شرائحُ صدر الهبوط.
 *
 * **اليومَ أحدثُ الأخبار المنشورة**، وقد قال المالك «نختارها» — فبابُ الاختيار
 * في اللوحة عملٌ تالٍ، ويومَ يُبنى يقرأ هذا المصدرُ الاختيارَ ويسقط الترتيبُ
 * الزمنيّ. ولا يُغيَّر شكلُ `HeroSlide` حينها، فالصدرُ لا يعلم من أين جاءته.
 *
 * وفشلُ القراءة لا يُسقط الصفحة: يعود بلا شرائح، فيُرسَم الصدرُ بلوحه وحده.
 */
export async function getHeroSlides(): Promise<HeroSlide[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];

  const sb = createAdeebServerClient(url, key);
  const { data, error } = await sb
    .from("news")
    .select("id,title,image_url,slug")
    .eq("workflow_status", "published")
    .not("image_url", "is", null)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(4)
    .returns<{ id: string; title: string; image_url: string; slug: string | null }[]>();

  if (error || !data) return [];

  return data.map((n) => ({
    tag: "خبر",
    title: n.title,
    img: n.image_url,
    href: n.slug ? `/news/${n.slug}` : "/news",
  }));
}
