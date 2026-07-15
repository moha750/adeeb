import { createAdeebServerClient, toLatinDigits } from "@adeeb/core";
import { NewsShowcase, type NewsCard } from "./NewsShowcase";

type NewsItem = {
  id: string;
  title: string;
  summary: string | null;
  image_url: string | null;
  published_at: string | null;
  author_name: string | null;
  views: number | null;
  is_featured: boolean | null;
  slug: string | null;
};

function fmtDate(d: string | null): string {
  if (!d) return "";
  try {
    return new Intl.DateTimeFormat("ar-u-nu-latn", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(d));
  } catch {
    return d;
  }
}

/** قسم حيّ: آخر أخبار أديب — عرض تحريريّ متحرّك من منصّة أديب الإخبارية. */
export async function LatestNews() {
  const sb = createAdeebServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data, error } = await sb
    .from("news")
    .select("id,title,summary,image_url,published_at,author_name,views,is_featured,slug")
    .eq("status", "published")
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
    author: n.author_name,
    views: n.views,
    featured: !!n.is_featured,
    href: n.slug
      ? `https://www.adeeb.club/news/news-detail.html?slug=${encodeURIComponent(n.slug)}`
      : `https://www.adeeb.club/news/news-detail.html?id=${n.id}`,
  }));

  return <NewsShowcase items={items} />;
}
