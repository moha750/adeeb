import "server-only";
import { createAdeebServerClient } from "@adeeb/core";
import { fmtDate } from "@/lib/dates";
import { isSections, type Section } from "@/lib/news/blocks";
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
  /** الأقسامُ المصرَّحة، أو `null` لخبرٍ لم يُحوَّل بعدُ فيُستدلّ على متنه. */
  sections: Section[] | null;
  category: Category;
  cover: string | null;
  coverPhotographer: string | null;
  gallery: string[];
  galleryPhotographers: string[];
  authors: string[];
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
  blocks: unknown;
  category: Category;
  image_url: string | null;
  cover_photographer: string | null;
  gallery_images: string[] | null;
  gallery_photographers: string[] | null;
  authors: string[] | null;
  published_at: string | null;
  views: number | null;
  likes_count: number | null;
  is_featured: boolean | null;
};

// نصٌّ حرفيّ واحد لا مجموعٌ بـ`+`: مُحلّل أنواع Supabase يقرأ الحرفيّ وحده.
//
// **ومطبٌّ مقيس:** طلبُ عمودٍ غيرِ موجودٍ من PostgREST **يُسقط الاستعلامَ كلَّه** لا
// العمودَ وحدَه — فتردّ الدالّةُ `[]` وتُفرَغ صفحةُ الأخبار من أربعة عشر خبرًا. وقع
// هذا ٢٠٢٦-٠٩-٢٤ حين سبق اسمُ `blocks` ترحيلَه. فمن زاد عمودًا ههنا فليتأكّد أنّ
// ترحيلَه مطبَّقٌ على القاعدة قبل ذلك.
const COLS =
  "id, slug, title, summary, content, blocks, category, image_url, cover_photographer, gallery_images, gallery_photographers, authors, published_at, views, likes_count, is_featured";

const map = (n: Raw): PublicNews => ({
  id: n.id,
  slug: n.slug ?? null,
  title: n.title,
  summary: n.summary ?? null,
  content: n.content ?? null,
  sections: isSections(n.blocks) ? n.blocks : null,
  category: n.category,
  cover: n.image_url ?? null,
  coverPhotographer: n.cover_photographer ?? null,
  gallery: n.gallery_images ?? [],
  galleryPhotographers: n.gallery_photographers ?? [],
  authors: n.authors ?? [],
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

/**
 * أخبارٌ أخرى تُعرض تحت المقال — **جيرانُه في الزمن من فئته أوّلًا** (المالك ٢٠٢٦-١٠-١٤).
 * كانت الأحدثَ من فئته، ولأنّ ثلاثةَ عشرَ خبرًا من أربعة عشرَ «تغطية» كان كلُّ خبرٍ يُحيل إلى
 * آخر ثلاث تغطياتٍ نفسِها، ومن يقرأ قديمًا يُعاد إلى الأحدث دائمًا. فصار الأقربَ تاريخًا قبله
 * وبعده (فيتبدّل القسمُ من خبرٍ لخبر ويصير تتابعًا للقراءة)، ثمّ يُكمَل بجيرانه من أيّ فئة.
 * والعرضُ الأحدثُ أوّلًا. وبلا `at` (مختبراتٌ قديمة) يبقى الأحدثَ كما كان.
 */
export async function getMoreNews(
  exceptId: string,
  limit = 3,
  category?: Category,
  at?: string | null,
): Promise<PublicNews[]> {
  const sb = anon();
  const base = (cat?: Category) => {
    const q = sb.from("news").select(COLS).eq("workflow_status", "published").neq("id", exceptId);
    return cat ? q.eq("category", cat) : q;
  };

  if (!at) {
    const { data } = await base().order("published_at", { ascending: false }).limit(limit).returns<Raw[]>();
    return (data ?? []).map(map);
  }

  const t = new Date(at).getTime();
  const gap = (r: Raw) => Math.abs(new Date(r.published_at ?? 0).getTime() - t);
  const near = async (cat?: Category): Promise<Raw[]> => {
    const [before, after] = await Promise.all([
      base(cat).lte("published_at", at).order("published_at", { ascending: false }).limit(limit).returns<Raw[]>(),
      base(cat).gt("published_at", at).order("published_at", { ascending: true }).limit(limit).returns<Raw[]>(),
    ]);
    return [...(before.data ?? []), ...(after.data ?? [])].sort((x, y) => gap(x) - gap(y));
  };

  const picked = category ? (await near(category)).slice(0, limit) : [];
  if (picked.length < limit) {
    const seen = new Set(picked.map((r) => r.id));
    picked.push(...(await near()).filter((r) => !seen.has(r.id)).slice(0, limit - picked.length));
  }
  return picked
    .sort((x, y) => new Date(y.published_at ?? 0).getTime() - new Date(x.published_at ?? 0).getTime())
    .map(map);
}
