import Link from "next/link";
import { notFound } from "next/navigation";
import { Accordion, Container, Footer } from "@adeeb/design-system";
import { MicrophoneStage, YoutubeLogo } from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "../../../_components/SiteHeader";
import { episodeLabel, formatDuration } from "../../../dashboard/radio/vocab";
import { youtubeId } from "@/lib/radio/youtube";
import { getPublicEpisode } from "../../data";
import { EpisodeRow, PlayTrackButton } from "../../_player/EpisodeRow";
import { YoutubeThumb } from "../../_player/YoutubeThumb";
import { FoldedText } from "../../_player/FoldedText";
import type { Track } from "../../_player/PlayerProvider";

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

  const toTrack = (e: typeof episode): Track => ({
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
  });

  const more = siblings.filter((e) => e.musicUrl).slice(0, 5);
  const ytId = youtubeId(episode.youtubeUrl);

  return (
    <>
      <SiteHeader activeHref="/radio" />
      <main>
        <section className={`rad rad-tone-${show.tone} py-10 md:py-14`}>
          <Container>
            <div className="rad-ep-sub">
              <Link href="/radio">الإذاعة</Link>
              <Link href={`/radio/${show.slug}`}>{show.title}</Link>
            </div>

            <div className="rad-hero rad-hero-lg">
              <div className="rad-hero-logo">
                {show.logoUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={show.logoUrl} alt="" />
                  : <MicrophoneStage size={40} aria-hidden />}
              </div>
              <div className="rad-hero-txt">
                <h1 className="rad-hero-name">{episode.title}</h1>
                <div className="rad-ep-sub" style={{ marginTop: 8 }}>
                  <span>{episodeLabel(episode.number)}</span>
                  <span>{episode.dateLabel}</span>
                  {episode.musicSeconds ? (
                    <span className="font-latin"><bdi dir="ltr">{formatDuration(episode.musicSeconds)}</bdi></span>
                  ) : null}
                  {episode.hostName ? <span>تقديم {episode.hostName}</span> : null}
                </div>
                <div className="rad-hero-cta"><PlayTrackButton track={toTrack(episode)} label="استمع" rest={more.map(toTrack)} /></div>
              </div>
            </div>

            {episode.summary ? (
              <div className="max-w-2xl"><FoldedText text={episode.summary} /></div>
            ) : null}

            {episode.youtubeUrl ? (
              <div className="mt-6">
                <a href={episode.youtubeUrl} target="_blank" rel="noreferrer" className="rad-yt">
                  {ytId ? <YoutubeThumb id={ytId} alt={`صورة ${episode.title} على يوتيوب`} /> : null}
                  <span className="rad-yt-tag"><YoutubeLogo size={16} weight="fill" aria-hidden />شاهِد على يوتيوب</span>
                </a>
              </div>
            ) : null}

            {episode.notes ? (
              <div className="mt-10 max-w-2xl">
                <h2 className="mb-3 font-display text-lg font-black">محاور الحلقة</h2>
                <FoldedText text={episode.notes} />
              </div>
            ) : null}

            {/**
              * التفريغُ النصّيّ — كان يُكتب في اللوحة ولا يراه أحد.
              * ويُطوى لا يُبسط: نصٌّ يبلغ آلافَ الكلمات لو انفرش لدفع كلَّ ما بعده
              * خارج الصفحة، فيُفتح بنقرةٍ ممّن أراده. والأكورديون مكوّنُ المكتبة
              * كما هو (ق١، المسار الأوّل)، ولا تنسيقَ يُخترع له.
              */}
            {episode.transcript ? (
              <div className="mt-10 max-w-2xl">
                <h2 className="mb-3 font-display text-lg font-black">التفريغ النصّيّ</h2>
                <Accordion
                  items={[{
                    q: "اقرأ الحلقة مكتوبةً",
                    a: <p className="rad-transcript">{episode.transcript}</p>,
                  }]}
                />
              </div>
            ) : null}

            {more.length ? (
              <>
                <h2 className="mb-3 mt-10 font-display text-lg font-black">التالي في البرنامج</h2>
                <div className="rad-eps">
                  {more.map((e) => (
                    <EpisodeRow
                      key={e.id}
                      track={toTrack(e)}
                      number={e.number}
                      dateLabel={e.dateLabel}
                      summary={e.summary}
                      showName={null}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
