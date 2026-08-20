import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, Footer } from "@adeeb/design-system";
import {
  MicrophoneStage, Playlist, Play,
  YoutubeLogo, XLogo, InstagramLogo, TiktokLogo,
} from "@phosphor-icons/react/dist/ssr";
import { ICON_WEIGHT } from "@/lib/iconWeight";
import { SiteHeader } from "../../_components/SiteHeader";
import { PLATFORM_META } from "../../dashboard/radio/vocab";
import { getPublicShowPage, isPlayable, toTrack } from "../data";
import { EpisodeRow } from "../_player/EpisodeRow";
import { FoldedText } from "../_player/FoldedText";
import { breadcrumbLd, ldScript, podcastSeriesLd } from "@/lib/radio/jsonld";
import type { Track } from "../_player/PlayerProvider";

export const revalidate = 60;

/* glyph-weight: YoutubeLogo XLogo InstagramLogo TiktokLogo — تُرسَم عبر الخريطة أدناه،
   والوزنُ يُمرَّر عند الرسم لا هنا. وصفُّها استوى على duotone بقرار المالك ٢٠٢٦-٠٨-١٣. */
/** شعارُ كلّ منصّةٍ — الشكلُ يعرّفها فلا تحتاج كلمةً تحتها. */
const PLATFORM_ICON = {
  youtube: YoutubeLogo,
  x: XLogo,
  instagram: InstagramLogo,
  tiktok: TiktokLogo,
} as const;

export async function generateMetadata({ params }: { params: Promise<{ show: string }> }) {
  const { show } = await params;
  const page = await getPublicShowPage(show);
  if (!page) return { title: "إذاعة أدِيب" };
  const description = page.show.tagline ?? page.show.description ?? undefined;
  return {
    title: `${page.show.title}، إذاعة أدِيب`,
    description,
    alternates: { canonical: `/radio/${show}` },
    openGraph: {
      title: page.show.title,
      description,
      images: page.show.logoUrl ? [page.show.logoUrl] : undefined,
      type: "website",
      siteName: "إذاعة أدِيب",
    },
  };
}

export default async function ShowPage({ params }: { params: Promise<{ show: string }> }) {
  const { show: slug } = await params;
  const page = await getPublicShowPage(slug);
  if (!page) notFound();
  const { show, episodes, platforms } = page;

  const playable = episodes.filter(isPlayable);
  const tracks: Track[] = playable.map((e) => toTrack(e, show));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={ldScript(podcastSeriesLd(show))} />
      <script type="application/ld+json" dangerouslySetInnerHTML={ldScript(
        breadcrumbLd([
          { name: "الإذاعة", path: "/radio" },
          { name: show.title, path: `/radio/${show.slug}` },
        ]),
      )} />
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
                  : <MicrophoneStage size={40} weight={ICON_WEIGHT} aria-hidden />}
              </div>
              <div className="rad-hero-txt">
                <h1 className="rad-hero-name">{show.title}</h1>
                {show.tagline ? <p className="rad-hero-deck">{show.tagline}</p> : null}
                <div className="rad-ep-sub" style={{ marginTop: 8 }}>
                  {show.hostName ? <span>تقديم {show.hostName}</span> : null}
                  <span className="inline-flex items-center gap-1.5">
                    <Playlist weight={ICON_WEIGHT} aria-hidden /><span className="font-latin">{episodes.length}</span> حلقة
                  </span>
                </div>
                {/**
                  * منصّاتُ البرنامج **أيقوناتٌ في صدره** لا شاراتٌ نصّيّة:
                  * الروابطُ هويّةُ البرنامج لا محتواه، فموضعُها حيث اسمُه وشعارُه.
                  * والشارةُ النصّيّة تُقرأ وسمًا يصنّفه لا بابًا يُضغط.
                  */}
                {platforms.length ? (
                  <div className="rad-links">
                    {platforms.map((p) => {
                      const Icon = PLATFORM_ICON[p.platform];
                      return (
                        <a key={p.platform} href={p.url} target="_blank" rel="noreferrer"
                          className={`rad-link rad-link-${p.platform}`}
                          aria-label={`${show.title} على ${PLATFORM_META[p.platform].label}`}>
                          <Icon size={19} weight={ICON_WEIGHT} aria-hidden />
                        </a>
                      );
                    })}
                  </div>
                ) : null}
                <div className="rad-hero-cta">{tracks[0] ? (
                  <Link href={`/radio/${tracks[0].showSlug}/${tracks[0].episodeSlug}`} className="rad-cta">
                    <Play size={18} weight={ICON_WEIGHT} aria-hidden />استمع لآخر حلقة
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
                    plays={e.plays}
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
