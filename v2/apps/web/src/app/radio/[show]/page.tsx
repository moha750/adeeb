import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, Footer } from "@adeeb/design-system";
import { MicrophoneStage, Playlist, Play } from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "../../_components/SiteHeader";
import { getPublicShowPage } from "../data";
import { EpisodeRow } from "../_player/EpisodeRow";
import { FoldedText } from "../_player/FoldedText";
import type { Track } from "../_player/PlayerProvider";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ show: string }> }) {
  const { show } = await params;
  const page = await getPublicShowPage(show);
  if (!page) return { title: "إذاعة أدِيب" };
  return {
    title: `${page.show.title}، إذاعة أدِيب`,
    description: page.show.tagline ?? page.show.description ?? undefined,
  };
}

export default async function ShowPage({ params }: { params: Promise<{ show: string }> }) {
  const { show: slug } = await params;
  const page = await getPublicShowPage(slug);
  if (!page) notFound();
  const { show, episodes } = page;

  const playable = episodes.filter((e) => e.musicUrl);
  const tracks: Track[] = playable.map((e) => ({
    id: e.id,
    title: e.title,
    showTitle: show.title,
    showSlug: show.slug,
    episodeSlug: e.slug,
    musicUrl: e.musicUrl!,
    plainUrl: e.plainUrl,
    talkStartsAt: e.talkStartsAt,
    coverUrl: show.logoUrl,
    seconds: e.musicSeconds,
    tone: show.tone,
  }));

  return (
    <>
      <SiteHeader activeHref="/radio" />
      <main>
        <section className={`rad rad-tone-${show.tone} py-10 md:py-14`}>
          <Container>
            <Link href="/radio" className="text-sm text-content-muted">الإذاعة</Link>

            <div className="rad-hero rad-hero-lg">
              <div className="rad-hero-logo">
                {show.logoUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={show.logoUrl} alt="" />
                  : <MicrophoneStage size={40} aria-hidden />}
              </div>
              <div className="rad-hero-txt">
                <h1 className="rad-hero-name">{show.title}</h1>
                {show.tagline ? <p className="rad-hero-deck">{show.tagline}</p> : null}
                <div className="rad-ep-sub" style={{ marginTop: 8 }}>
                  {show.hostName ? <span>تقديم {show.hostName}</span> : null}
                  <span className="inline-flex items-center gap-1.5">
                    <Playlist aria-hidden /><span className="font-latin">{episodes.length}</span> حلقة
                  </span>
                </div>
                <div className="rad-hero-cta">{tracks[0] ? (
                  <Link href={`/radio/${tracks[0].showSlug}/${tracks[0].episodeSlug}`} className="rad-cta">
                    <Play size={18} weight="fill" aria-hidden />استمع لآخر حلقة
                  </Link>
                ) : null}</div>
              </div>
            </div>

            {show.description ? (
              <div className="max-w-2xl"><FoldedText text={show.description} /></div>
            ) : null}


            <h2 className="mb-3 mt-10 font-display text-lg font-black">الحلقات</h2>
            {playable.length === 0 ? (
              <p className="text-content-muted">لا حلقات منشورة بعد.</p>
            ) : (
              <div className="rad-eps">
                {playable.map((e, i) => (
                  <EpisodeRow
                    key={e.id}
                    track={tracks[i]}
                    number={e.number}
                    dateLabel={e.dateLabel}
                    summary={e.summary}
                    showName={null}
                  />
                ))}
              </div>
            )}
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
