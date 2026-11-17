import { notFound } from "next/navigation";
import "@adeeb/design-system/ad.css";
import { Footer } from "@adeeb/design-system";
import { getMoreNews, getNewsActivity, getPublicNewsItem } from "../data";
import { NewsRead } from "@/app/_ad/rooms/NewsReadRoom";
import { ReadingProgress } from "./_parts/ReadingProgress";
import { getApprovedComments } from "./data";
import { SiteHeader } from "../../_components/SiteHeader";
import { shareOg } from "@/lib/share";
import { ViewSubject } from "@/app/_components/ViewSubject";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const n = await getPublicNewsItem(decodeURIComponent(slug));
  if (!n) return { title: "خبر، أدِيب" };
  return {
    title: `${n.title}، أدِيب`,
    description: n.summary ?? "مستجدّات نادي أدِيب أوّلًا بأوّل.",
    openGraph: shareOg({
      title: n.title,
      description: n.summary ?? undefined,
      // غلافُ الخبر هو وجهُ رابطه، وثَمْبنيلُ أدِيب سقفٌ لمن لا غلافَ له.
      images: n.cover ? [n.cover] : undefined,
      type: "article",
      publishedTime: n.publishedAt ?? undefined,
    }),
  };
}

export default async function NewsArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const n = await getPublicNewsItem(decodeURIComponent(slug));
  if (!n) notFound();

  const [more, comments, activity] = await Promise.all([
    getMoreNews(n.id, 3, n.category, n.publishedAt), getApprovedComments(n.id), getNewsActivity(n.id),
  ]);

  return (
    <>
      {/* المشاهدةُ تُعدّ من هنا: الخبرُ صُيِّر فعلًا، فالصفحةُ تُعلنه (لا يُستنتج من الرابط). */}
      <ViewSubject kind="news" id={n.id} />
      {/* خيطُ القراءة **خارج** `.art`: تلك حاويةُ استعلامٍ، وكلُّ `fixed` داخلها يُنسَب
          إليها لا إلى الشاشة. */}
      <ReadingProgress targetId="art" />
      <SiteHeader activeHref="/news" />
      {/* **قالبُ «القراءة» بهويّة الخبر** (اعتمده محمد ٢٠٢٦-١١-١٧ في المختبر): ألواحُ الفصول، والفهرسُ الملازم، والختامُ، وشرفةُ التعليق */}
      <main className="ad-pub">
        <div className="ad-pub-wrap">
          <NewsRead n={n} comments={comments} more={more} activity={activity} siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
        </div>
      </main>
      <Footer />
    </>
  );
}
