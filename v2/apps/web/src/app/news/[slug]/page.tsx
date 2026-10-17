import { notFound } from "next/navigation";
import { Ambient, Footer, Container } from "@adeeb/design-system";
import { getMoreNews, getPublicNewsItem } from "../data";
import { ArticleView } from "./ArticleView";
import { MoreNews } from "./_parts/MoreNews";
import { ReadingProgress } from "./_parts/ReadingProgress";
import { getApprovedComments } from "./data";
import { SiteHeader } from "../../_components/SiteHeader";
import { shareOg } from "@/lib/share";

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

  const [more, comments] = await Promise.all([getMoreNews(n.id, 3, n.category, n.publishedAt), getApprovedComments(n.id)]);

  return (
    <>
      {/* خيطُ القراءة **خارج** `.art`: تلك حاويةُ استعلامٍ، وكلُّ `fixed` داخلها يُنسَب
          إليها لا إلى الشاشة. */}
      <ReadingProgress targetId="art" />
      <SiteHeader activeHref="/news" />
      <main className="amb-host">
        <Ambient />
        <section className="pt-4 pb-16 md:pt-6 md:pb-24">
          <Container>
            <ArticleView
              n={n}
              comments={comments}
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
            />
          </Container>
        </section>
        {more.length ? (
          <section className="pb-20 md:pb-28">
            <Container>
              <MoreNews items={more} />
            </Container>
          </section>
        ) : null}
      </main>
      <Footer />
    </>
  );
}
