import { notFound } from "next/navigation";
import { shareOg } from "@/lib/share";
import { breadcrumbLd, ldScript, podcastEpisodeLd } from "@/lib/radio/jsonld";
import { getPublicEpisode } from "../../data";
import { EpisodeBody } from "../../_parts/EpisodeBody";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ show: string; episode: string }> }) {
  const { show, episode } = await params;
  const found = await getPublicEpisode(show, episode);
  if (!found) return { title: "إذاعة أدِيب" };
  return {
    title: `${found.episode.title}، ${found.show.title}`,
    description: found.episode.summary ?? undefined,
    alternates: { canonical: `/radio/${show}/${episode}` },
    openGraph: shareOg({
      title: found.episode.title,
      description: found.episode.summary ?? undefined,
      type: "article",
      publishedTime: found.episode.publishedAt ?? undefined,
      siteName: "إذاعة أدِيب",
    }),
  };
}

export default async function EpisodePage({
  params, searchParams,
}: {
  params: Promise<{ show: string; episode: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { show: showSlug, episode: epSlug } = await params;
  const found = await getPublicEpisode(showSlug, epSlug);
  if (!found) notFound();
  const { show, episode, siblings } = found;

  /* رابطٌ بلحظة: `?t=` بالثواني. ويُنقّى ممّا لا يصحّ فلا يبدأ رقمٌ عابثٌ حلقةً
     من موضعٍ لا وجودَ له، ولا يزيد على مدّتها. */
  const rawT = (await searchParams).t;
  const tParam = Number(Array.isArray(rawT) ? rawT[0] : rawT);
  const total = episode.musicSeconds ?? episode.plainSeconds ?? 0;
  const startAt =
    Number.isFinite(tParam) && tParam > 0 ? Math.min(Math.floor(tParam), Math.max(0, total - 1)) : 0;

  // الصفحةُ نفسُها في `EpisodeBody` (تشترك فيها معاينةُ المحرّر)، وهنا قراءتُها ووسومُها
  return (
    <>
      {/* وسمُ الحلقة وفتاتُ طريقها. والفتاتُ وحدَه يُعرَض في البحث، انظر `lib/radio/jsonld`. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={ldScript(
        podcastEpisodeLd(
          {
            title: episode.title, slug: episode.slug, number: episode.number,
            summary: episode.summary, publishedAt: episode.publishedAt,
            seconds: episode.musicSeconds ?? episode.plainSeconds,
            audioUrl: episode.musicUrl ?? episode.plainUrl,
            transcript: episode.transcript,
          },
          show,
        ),
      )} />
      <script type="application/ld+json" dangerouslySetInnerHTML={ldScript(
        breadcrumbLd([
          { name: "الإذاعة", path: "/radio" },
          { name: show.title, path: `/radio/${show.slug}` },
          { name: episode.title, path: `/radio/${show.slug}/${episode.slug}` },
        ]),
      )} />
      <EpisodeBody show={show} episode={episode} siblings={siblings} startAt={startAt} />
    </>
  );
}
