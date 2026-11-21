import "@adeeb/design-system/ad.css";
import { notFound } from "next/navigation";
import { Footer } from "@adeeb/design-system";
import { SiteHeader } from "../_components/SiteHeader";
import { getMoreNews, getNewsActivity, getPublicNewsItem } from "../news/data";
import { getApprovedComments } from "../news/[slug]/data";
import { ReadingProgress } from "../news/[slug]/_parts/ReadingProgress";
import { NewsRead } from "../_ad/rooms/NewsReadRoom";

/**
 * مختبر (لا يُرفع، ٢٠٢٦-١١-١٧): **صفحةُ الخبر على قالب «القراءة»** بخبرٍ حقيقيّ (`?slug=`، وبلاه آخرُ خبر القهوة). يقرأ ما تقرؤه الصفحةُ الحاليّة
 * ولا يعدّ مشاهدة (لا `ViewSubject`). والإعجابُ والتعليقُ فيه حقيقيّان كالصفحة، فلا يُنقر. والحاليّةُ للمقارنة: `/news/<slug>`. ولا يُفتح في الإنتاج.
 */
export const metadata = { title: "مختبر صفحة الخبر" };

export default async function NewsLab({ searchParams }: { searchParams: Promise<{ slug?: string; act?: string; cov?: string; toc?: string; ch?: string; c?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  // `?act=<معرّف فعاليّة>`: معاينةُ «تغطيةٌ لفعاليّة» لخبرٍ لم يُربط بعدُ — قراءةٌ لا تكتب شيئًا (لا خبرَ منشورًا مربوطًا اليوم)
  const { slug, act, cov, toc, ch, c } = await searchParams;
  const got = await getPublicNewsItem(slug ?? "news-cbab6e619f8046d4a2d7fbf02fcc2fb9");
  if (!got) notFound();
  // **حالاتُ الحدّ في الذاكرة وحدها** (`?c=`، لا تُكتب): بلا غلاف، فصلٌ واحد، بلا معرض، بلا تعليقات، عنوانٌ طويل — أو كلُّها معًا
  const has = (k: string) => c === k || c === "all";
  const n = {
    ...got,
    cover: has("nocover") ? null : got.cover,
    sections: has("one") && got.sections ? got.sections.slice(0, 1) : got.sections,
    gallery: has("nogal") ? [] : got.gallery,
    galleryPhotographers: has("nogal") ? [] : got.galleryPhotographers,
    title: has("long") ? "عنوانٌ طويلٌ جدًّا يتجاوز ما يكتبه المحرّرون عادةً ليُرى كيف يلتفّ في اللوح على الجوّال والحاسوب معًا" : got.title,
  };
  const [more, all, activity] = await Promise.all([getMoreNews(n.id, 3, n.category, n.publishedAt), getApprovedComments(n.id), getNewsActivity(n.id, act)]);
  const comments = has("nocom") ? [] : all;
  return (
    <>
      <ReadingProgress targetId="art" />
      <SiteHeader activeHref="/news" />
      <main className="ad-pub">
        <div className="ad-pub-wrap">
          <NewsRead n={n} comments={comments} more={more} activity={activity} coverage={cov === "tag" ? "tag" : "note"} noToc={toc === "off"} chapters={ch === "group" ? "group" : "plate"} siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
        </div>
      </main>
      <Footer />
    </>
  );
}
