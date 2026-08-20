import { CATEGORY_META, readingMinutes, type Category } from "@adeeb/core/news";

import { supabase } from "./supabase";

/**
 * قراءةُ الأخبار المنشورة.
 *
 * تُقرأ بمفتاح anon مباشرةً كما يقرؤها الموقع: سياسةُ RLS تنخل `workflow_status='published'`،
 * فالتطبيقُ لا يرى مسودّةً ولا مادّةً قيد المراجعة ولو حاول.
 *
 * **والعنوانُ في التطبيق مُعرِّفٌ لا `slug`**: الروابطُ العربيّةُ في الويب لخادم البحث،
 * ولا خادمَ بحثٍ ههنا؛ والمُعرِّفُ لا يحتاج ترميزًا في المسار فلا ينكسر بحرفٍ عربيّ.
 */

export type NewsItem = {
  id: string;
  title: string;
  summary: string | null;
  content: string | null;
  category: Category;
  categoryLabel: string;
  cover: string | null;
  coverPhotographer: string | null;
  gallery: string[];
  galleryPhotographers: string[];
  authors: string[];
  tags: string[];
  publishedAt: string | null;
  views: number;
  likes: number;
  featured: boolean;
  readMinutes: number;
};

type Row = {
  id: string;
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

// نصٌّ حرفيٌّ واحدٌ لا مجموعٌ بـ`+` — مُحلّل أنواع Supabase يقرأ الحرفيّ وحدَه.
const COLS =
  "id, title, summary, content, category, image_url, cover_photographer, gallery_images, gallery_photographers, authors, tags, published_at, views, likes_count, is_featured";

const map = (n: Row): NewsItem => ({
  id: n.id,
  title: n.title,
  summary: n.summary,
  content: n.content,
  category: n.category,
  categoryLabel: CATEGORY_META[n.category]?.label ?? "",
  cover: n.image_url,
  coverPhotographer: n.cover_photographer,
  gallery: n.gallery_images ?? [],
  galleryPhotographers: n.gallery_photographers ?? [],
  authors: n.authors ?? [],
  tags: n.tags ?? [],
  publishedAt: n.published_at,
  views: n.views ?? 0,
  likes: n.likes_count ?? 0,
  featured: !!n.is_featured,
  readMinutes: readingMinutes(n.content),
});

export async function getNews(limit = 30): Promise<{ data: NewsItem[]; error: string | null }> {
  const { data, error } = await supabase
    .from("news")
    .select(COLS)
    .eq("workflow_status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) return { data: [], error: error.message };
  return { data: (data as Row[]).map(map), error: null };
}

export async function getNewsItem(id: string): Promise<{ data: NewsItem | null; error: string | null }> {
  const { data, error } = await supabase
    .from("news")
    .select(COLS)
    .eq("workflow_status", "published")
    .eq("id", id)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: data ? map(data as Row) : null, error: null };
}

/**
 * متنُ الخبر نصٌّ عاديٌّ لا وسمٌ: فقراتٌ تفصلها أسطرٌ فارغة، وبنودٌ تبدأ بـ«•».
 * والقسمةُ هنا هي قسمةُ الويب نفسُها (`app/news/[slug]/ArticleView.tsx`)، فما يقرؤه
 * الزائرُ فقرةً يقرؤه صاحبُ التطبيق فقرةً.
 */
export type Block = { prose: string[]; bullets: string[] };

export function toBlocks(content: string): Block[] {
  return content
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      return {
        prose: lines.filter((l) => !l.startsWith("•")),
        bullets: lines.filter((l) => l.startsWith("•")).map((b) => b.replace(/^•\s*/, "")),
      };
    });
}
