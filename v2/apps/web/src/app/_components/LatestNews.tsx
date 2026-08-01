import { createAdeebServerClient, toLatinDigits } from "@adeeb/core";
import { fmtDate } from "@/lib/date";
import { newsHref } from "@/lib/news/link";
import { NewsShowcase, type NewsCard } from "./NewsShowcase";

type NewsItem = {
  id: string;
  title: string;
  summary: string | null;
  image_url: string | null;
  published_at: string | null;
  authors: string[] | null;
  views: number | null;
  is_featured: boolean | null;
  slug: string | null;
};

/** قسم حيّ: آخر أخبار أديب — عرض تحريريّ متحرّك من منصّة أديب الإخبارية. */
export async function LatestNews() {
  const sb = createAdeebServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data, error } = await sb
    .from("news")
    .select("id,title,summary,image_url,published_at,authors,views,is_featured,slug")
    .eq("workflow_status", "published")
    .order("published_at", { ascending: false })
    .limit(5)
    .returns<NewsItem[]>();

  if (error) {
    return <p className="text-danger">تعذّر جلب الأخبار: {error.message}</p>;
  }
  if (!data || data.length === 0) return null;

  const items: NewsCard[] = data.map((n) => ({
    id: n.id,
    title: toLatinDigits(n.title),
    summary: n.summary ? toLatinDigits(n.summary) : null,
    cover: n.image_url,
    dateStr: fmtDate(n.published_at),
    author: n.authors?.[0] ?? null,
    views: n.views,
    featured: !!n.is_featured,
    href: newsHref(n),
  }));

  return <NewsShowcase items={items} />;
}
