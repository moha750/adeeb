import { getPublicNews } from "@/app/news/data";
import { getApprovedComments } from "@/app/news/[slug]/data";
import { CommentDeleteLab } from "./CommentDeleteLab";

/**
 * **«لسانُ الحذف»** — حذفُ رئيس التحرير من صفحة الخبر (اعتمده المالك ٢٠٢٦-١٠-١٦ بعد ثمانية أشكالٍ مرفوضة).
 *
 * التعليقُ صار يُنشَر لحظتَه بشرطين: إشعارٌ فوريٌّ وحذفٌ بتأكيد. والحذفُ من صفحة الخبر نفسها يراه حاملُ
 * `manage_news` وحده. ويُعرض ههنا على **المكوّن نفسه** (`Comments`) وبتعليقاتٍ حيّةٍ منشورة، بعين رئيس التحرير وبعين القارئ.
 * ولا يحذف المعرضُ شيئًا: التأكيدُ يُفتح ويُغلق.
 */
export const dynamic = "force-dynamic";

export default async function NewsCommentDeletePage() {
  const all = await getPublicNews();
  // أوّلُ خبرٍ له تعليقاتٌ منشورة — أكثرُها عددًا، فيُرى أكثرُ من كرت.
  let best: { slug: string; items: Awaited<ReturnType<typeof getApprovedComments>> } | null = null;
  for (const n of all) {
    const items = await getApprovedComments(n.id);
    if (items.length && (!best || items.length > best.items.length)) best = { slug: n.slug ?? n.id, items };
  }
  return <CommentDeleteLab items={best?.items ?? []} next={`/news/${best?.slug ?? ""}`} />;
}
