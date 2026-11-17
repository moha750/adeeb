import { notFound } from "next/navigation";
import { getPublicShowPage } from "../data";
import { shareOg } from "@/lib/share";
import { breadcrumbLd, ldScript, podcastSeriesLd } from "@/lib/radio/jsonld";
import { ShowBody } from "../_parts/ShowBody";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ show: string }> }) {
  const { show } = await params;
  const page = await getPublicShowPage(show);
  if (!page) return { title: "إذاعة أدِيب" };
  const description = page.show.tagline ?? page.show.description ?? undefined;
  return {
    title: `${page.show.title}، إذاعة أدِيب`,
    description,
    alternates: { canonical: `/radio/${show}` },
    openGraph: shareOg({
      title: page.show.title,
      description,
      type: "website",
      siteName: "إذاعة أدِيب",
    }),
  };
}

export default async function ShowPage({ params }: { params: Promise<{ show: string }> }) {
  const { show: slug } = await params;
  const page = await getPublicShowPage(slug);
  if (!page) notFound();
  const { show, episodes, platforms } = page;

  // الصفحةُ نفسُها في `ShowBody` (تشترك فيها معاينةُ المحرّر)، وهنا قراءتُها ووسومُها
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={ldScript(podcastSeriesLd(show))} />
      <script type="application/ld+json" dangerouslySetInnerHTML={ldScript(
        breadcrumbLd([
          { name: "الإذاعة", path: "/radio" },
          { name: show.title, path: `/radio/${show.slug}` },
        ]),
      )} />
      <ShowBody show={show} episodes={episodes} platforms={platforms} />
    </>
  );
}
