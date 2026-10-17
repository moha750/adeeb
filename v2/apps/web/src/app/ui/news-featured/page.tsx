import { createAdeebServerClient } from "@adeeb/core";
import { getPublicNews } from "@/app/news/data";
import { FeaturedLab } from "./FeaturedLab";

/**
 * **«مميّز» و«الأخبار المعروضة»: مفهومان متداخلان** (٢٠٢٦-١٠-١٦).
 * اختار المالكُ أن يصير للتمييز أثرٌ، فظهر أنّ للرئيسيّة اختيارًا منفصلًا (`hero_news`)
 * يتقاطع معه بلا نظام. قال: «ما فهمت، أريد أن أرى»، فهذه الصفحة تُريه الحالَ والخيارين
 * ببيانات الموقع الحقيقيّة. لا يُحفَظ فيها شيء.
 */
export const dynamic = "force-dynamic";

export default async function NewsFeaturedPage() {
  const news = (await getPublicNews()).filter((n) => n.cover);
  const sb = createAdeebServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await sb.from("hero_news").select("news_id, sort").order("sort", { ascending: true })
    .returns<{ news_id: string; sort: number }[]>();
  const ids = new Set(news.map((n) => n.id));
  return <FeaturedLab news={news} hero={(data ?? []).map((r) => r.news_id).filter((id) => ids.has(id))} />;
}
