import { getPublicNews } from "@/app/news/data";
import { textToSections } from "@/lib/news/blocks";
import { EditorLab, type Draft } from "./EditorLab";

/**
 * **المحرّرُ الجديد في وضع «الكتابة»: اتّجاهان للمقارنة** (٢٠٢٦-١٠-١٦، أوّلُ خطوةٍ في إعادة تصميم تبويب الأخبار).
 *
 * يُبنيان على قرارات الفصول المحسومة: المدخلُ ثابتٌ بلا عنوان، وكلُّ ما بعده فصلٌ بعنوانٍ ومتن، والنشرُ يشترط
 * فصلين، والأسماءُ «الفئة» و«الفصل» و«المدخل». وبمحتوى خبرٍ حقيقيّ: ورشة التصميم. ولا يُحفَظ شيء.
 */
export const dynamic = "force-dynamic";

export default async function NewsEditorV2Page() {
  const all = await getPublicNews();
  const n = all.find((x) => x.slug?.startsWith("رحلة-في-عالم-التصميم")) ?? all[0];
  if (!n) return <main className="py-16"><p className="text-center text-content-muted">لا خبرَ منشورًا يُعايَن عليه.</p></main>;

  const secs = n.sections ?? textToSections(n.content);
  const [first, ...rest] = secs;
  const leadIsUntitled = first && !first.heading;
  const draft: Draft = {
    title: n.title,
    summary: n.summary ?? "",
    category: n.category,
    authors: n.authors,
    cover: n.cover,
    coverBy: n.coverPhotographer,
    gallery: n.gallery,
    lead: leadIsUntitled ? first.body : "",
    chapters: (leadIsUntitled ? rest : secs).map((s) => ({ heading: s.heading ?? "", body: s.body })),
  };
  return <EditorLab initial={draft} />;
}
