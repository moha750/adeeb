import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://adeeb.club";

/**
 * ما تفهرسه المحرّكات وما لا تفهرسه. المستثنى **ما خلف الباب وحده** (لوحة · دخول ·
 * تهيئة · مقابلة) — زحفُه بلا طائل. أمّا معارض المكوّنات (`/ui`) و`/story-preview`
 * فمكشوفةٌ مفهرسةٌ بقرار المالك، فلا تُدرَج هنا.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/login", "/onboarding", "/interview"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
