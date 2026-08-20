import type { MetadataRoute } from "next";
import { getPublicNews } from "./news/data";
import { getRadioSitemapEntries } from "./radio/data";
import { newsHref } from "@/lib/news/link";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://adeeb.club";

export const revalidate = 3600;

/**
 * خريطة الموقع — الصفحات العامّة الثابتة + كلّ خبرٍ منشور بتاريخ نشره.
 * الفعاليّات مؤقّتة (القادم منها فقط يُعرض) فيُدرَج فهرسها لا آحادها،
 * وتفصيلاتها تُكتشَف منه.
 *
 * والإذاعةُ تُدرَج **بآحادها**: كلُّ حلقةٍ صفحةٌ دائمةٌ لها عنوانٌ وتفريغٌ ومحاور،
 * وهي أدومُ من فعاليّةٍ تمضي. وكانت غائبةً عن الخريطة كلَّها (رُصد ٢٠٢٦-٠٨-١٨)،
 * فالقسمُ يُزحَف إليه بالصدفة لا بالإعلان.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const stat: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/news`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/activities`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/works`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/library`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/radio`, changeFrequency: "weekly", priority: 0.8 },
    // ديبو: صفحةٌ ثابتةٌ بلا محتوًى يتجدّد (المحادثةُ تُبنى في المتصفّح)، فأولويّتُها أدنى
    // من أقسام المحتوى وتردُّدها شهريّ. وكانت غائبةً كما غابت الإذاعةُ قبلها (٢٠٢٦-٠٨-١٩).
    { url: `${SITE}/deebo`, changeFrequency: "monthly", priority: 0.5 },
  ];

  const [news, radio] = await Promise.all([getPublicNews(), getRadioSitemapEntries()]);
  return [
    ...stat,
    ...news.map((n) => ({
      url: `${SITE}${newsHref(n)}`,
      lastModified: n.publishedAt ? new Date(n.publishedAt) : undefined,
      changeFrequency: "yearly" as const,
      priority: 0.7,
    })),
    ...radio.shows.map((s) => ({
      url: `${SITE}/radio/${s.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...radio.episodes.map((e) => ({
      url: `${SITE}/radio/${e.showSlug}/${e.slug}`,
      lastModified: e.publishedAt ? new Date(e.publishedAt) : undefined,
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ];
}
