import type { MetadataRoute } from "next";
import { getPublicNews } from "./news/data";
import { newsHref } from "@/lib/news/link";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://adeeb.club";

export const revalidate = 3600;

/**
 * خريطة الموقع — الصفحات العامّة الثابتة + كلّ خبرٍ منشور بتاريخ نشره.
 * الفعاليّات مؤقّتة (القادم منها فقط يُعرض) فيُدرَج فهرسها لا آحادها،
 * وتفصيلاتها تُكتشَف منه.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const stat: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/news`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/activities`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/works`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/library`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/join`, changeFrequency: "monthly", priority: 0.7 },
  ];

  const news = await getPublicNews();
  return [
    ...stat,
    ...news.map((n) => ({
      url: `${SITE}${newsHref(n)}`,
      lastModified: n.publishedAt ? new Date(n.publishedAt) : undefined,
      changeFrequency: "yearly" as const,
      priority: 0.7,
    })),
  ];
}
