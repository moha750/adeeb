import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, Footer, LandingHeading } from "@adeeb/design-system";
import { MicrophoneStage, YoutubeLogo } from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "../../../_components/SiteHeader";
import { episodeLabel } from "../../../dashboard/radio/vocab";
import { getPublicEpisode } from "../../data";
import { EpisodePlayer } from "./EpisodePlayer";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ show: string; episode: string }> }) {
  const { show, episode } = await params;
  const found = await getPublicEpisode(show, episode);
  if (!found) return { title: "إذاعة أدِيب" };
  return {
    title: `${found.episode.title}، ${found.show.title}`,
    description: found.episode.summary ?? undefined,
  };
}

export default async function EpisodePage({ params }: { params: Promise<{ show: string; episode: string }> }) {
  const { show: showSlug, episode: epSlug } = await params;
  const found = await getPublicEpisode(showSlug, epSlug);
  if (!found) notFound();
  const { show, episode, siblings } = found;

  return (
    <>
      <SiteHeader activeHref="/radio" />
      <main>
        <section className="py-16 md:py-24">
          <Container>
            <LandingHeading
              eyebrow="حلقة"
              title={episode.title}
              deck={episode.summary ?? undefined}
              align="center"
            />

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm text-content-muted">
              <Link href={`/radio/${show.slug}`} className="inline-flex items-center gap-1.5">
                <MicrophoneStage aria-hidden />{show.title}
              </Link>
              <span>{episodeLabel(episode.number)}</span>
              <span>{episode.dateLabel}</span>
              {episode.hostName ? <span>تقديم {episode.hostName}</span> : null}
            </div>

            <div className="mx-auto mt-8 max-w-2xl">
              <EpisodePlayer
                musicUrl={episode.musicUrl!}
                plainUrl={episode.plainUrl}
                leadSeconds={episode.leadSeconds}
                musicSeconds={episode.musicSeconds}
                plainSeconds={episode.plainSeconds}
                title={episode.title}
              />
            </div>

            {episode.youtubeUrl ? (
              <p className="mt-6 text-center text-sm text-content-muted">
                <a href={episode.youtubeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5">
                  <YoutubeLogo aria-hidden />شاهِد الحلقة على يوتيوب
                </a>
              </p>
            ) : null}

            {episode.notes ? (
              <div className="mx-auto mt-10 max-w-2xl">
                <h2 className="mb-3 text-lg font-bold">محاور الحلقة</h2>
                <p className="whitespace-pre-wrap leading-relaxed text-content-muted">{episode.notes}</p>
              </div>
            ) : null}

            {siblings.length ? (
              <div className="mx-auto mt-12 max-w-2xl">
                <h2 className="mb-3 text-lg font-bold">حلقاتٌ أخرى</h2>
                <ul className="flex flex-col gap-2">
                  {siblings.slice(0, 5).map((e) => (
                    <li key={e.id}>
                      <Link href={`/radio/${show.slug}/${e.slug}`} className="text-content-muted">
                        {episodeLabel(e.number)}، {e.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
