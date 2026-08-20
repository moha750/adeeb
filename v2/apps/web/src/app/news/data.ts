import "server-only";
import { createAdeebServerClient } from "@adeeb/core";
import { fmtDate } from "@/lib/dates";
import { readingMinutes, type Category } from "../dashboard/news/vocab";

// عميل قراءة عامّ (مفتاح anon) — يحترم RLS: الزائر لا يرى إلّا المنشور.
// (مُتحقَّق: `workflow_status=neq.published` يردّ صفرًا للزائر.)
const anon = () =>
  createAdeebServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export type PublicNews = {
  id: string;
  slug: string | null;
  title: string;
  summary: string | null;
  content: string | null;
  category: Category;
  cover: string | null;
  coverPhotographer: string | null;
  gallery: string[];
  galleryPhotographers: string[];
  authors: string[];
  tags: string[];
  publishedAt: string | null;
  dateLabel: string;
  views: number;
  likes: number;
  featured: boolean;
  readMinutes: number;
};

type Raw = {
  id: string;
  slug: string | null;
  title: string;
  summary: string | null;
  content: string | null;
  category: Category;
  image_url: string | null;
  cover_photographer: string | null;
  gallery_images: string[] | null;
  gallery_photographers: string[] | null;
  authors: string[] | null;
  tags: string[] | null;
  published_at: string | null;
  views: number | null;
  likes_count: number | null;
  is_featured: boolean | null;
};

// نصٌّ حرفيّ واحد لا مجموعٌ بـ`+`: مُحلّل أنواع Supabase يقرأ الحرفيّ وحده.
const COLS =
  "id, slug, title, summary, content, category, image_url, cover_photographer, gallery_images, gallery_photographers, authors, tags, published_at, views, likes_count, is_featured";

const map = (n: Raw): PublicNews => ({
  id: n.id,
  slug: n.slug ?? null,
  title: n.title,
  summary: n.summary ?? null,
  content: n.content ?? null,
  category: n.category,
  cover: n.image_url ?? null,
  coverPhotographer: n.cover_photographer ?? null,
  gallery: n.gallery_images ?? [],
  galleryPhotographers: n.gallery_photographers ?? [],
  authors: n.authors ?? [],
  tags: n.tags ?? [],
  publishedAt: n.published_at ?? null,
  dateLabel: fmtDate(n.published_at),
  views: n.views ?? 0,
  likes: n.likes_count ?? 0,
  featured: !!n.is_featured,
  readMinutes: readingMinutes(n.content),
});

/** الأخبار المنشورة، الأحدث أوّلًا. */
export async function getPublicNews(): Promise<PublicNews[]> {
  const sb = anon();
  const { data, error } = await sb
    .from("news")
    .select(COLS)
    .eq("workflow_status", "published")
    .order("published_at", { ascending: false })
    .returns<Raw[]>();
  if (error || !data) return [];
  return data.map(map);
}

/**
 * خبرٌ منشورٌ واحد بمُعرّفه في المسار — **الرابط هو `slug`**، ويُقبل المُعرّف الرقميّ
 * احتياطًا (روابط قديمة تحمل `id`). يُعيد `null` إن لم يوجد أو لم يُنشَر، فيستدعي المستدعي `notFound`.
 */
export async function getPublicNewsItem(key: string): Promise<PublicNews | null> {
  const sb = anon();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
  const { data, error } = await sb
    .from("news")
    .select(COLS)
    .eq("workflow_status", "published")
    .eq(isUuid ? "id" : "slug", key)
    .maybeSingle<Raw>();
  if (error || !data) return null;
  return map(data);
}

/** أخبارٌ أخرى تُعرض تحت المقال — الأحدث عدا المقروء. */
export async function getMoreNews(exceptId: string, limit = 3): Promise<PublicNews[]> {
  const sb = anon();
  const { data, error } = await sb
    .from("news")
    .select(COLS)
    .eq("workflow_status", "published")
    .neq("id", exceptId)
    .order("published_at", { ascending: false })
    .limit(limit)
    .returns<Raw[]>();
  if (error || !data) return [];
  return data.map(map);
}
