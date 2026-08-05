import { notFound } from "next/navigation";
import { Footer, Container, LandingHeading } from "@adeeb/design-system";
import { getMoreNews, getPublicNewsItem } from "../data";
import { PublicNewsCard } from "../PublicNewsCard";
import { ArticleView } from "./ArticleView";
import { SiteHeader } from "../../_components/SiteHeader";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const n = await getPublicNewsItem(decodeURIComponent(slug));
  if (!n) return { title: "خبر — أديب" };
  return {
    title: `${n.title} — أديب`,
    description: n.summary ?? "مستجدّات نادي أديب أوّلًا بأوّل.",
    openGraph: {
      title: n.title,
      description: n.summary ?? undefined,
      images: n.cover ? [n.cover] : undefined,
      type: "article",
      publishedTime: n.publishedAt ?? undefined,
    },
  };
}

export default async function NewsArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const n = await getPublicNewsItem(decodeURIComponent(slug));
  if (!n) notFound();

  const more = await getMoreNews(n.id);

  return (
    <>
      <SiteHeader activeHref="/news" />
      <main>
        <section className="py-16 md:py-24">
          <Container>
            <ArticleView n={n} />
          </Container>
        </section>
        {more.length ? (
          <section className="pb-20 md:pb-28">
            <Container>
              <LandingHeading eyebrow="أخبار" title="اقرأ أيضًا" deck="مستجدّاتٌ أخرى من منصّة أديب." align="center" />
              <div className="card-grid" style={{ marginTop: 32 }}>
                {more.map((m) => (
                  <PublicNewsCard key={m.id} n={m} />
                ))}
              </div>
            </Container>
          </section>
        ) : null}
      </main>
      <Footer />
    </>
  );
}
