import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, Footer, countPhrase } from "@adeeb/design-system";
import {
  MicrophoneStage, Playlist, Play,
  YoutubeLogo, XLogo, InstagramLogo, TiktokLogo,
} from "@phosphor-icons/react/dist/ssr";
import { ICON_WEIGHT } from "@/lib/iconWeight";
import { CaretLeft } from "@/app/_components/glyphs";
import { SiteHeader } from "../../_components/SiteHeader";
import { EPISODES_UNIT, PLATFORM_META } from "../../dashboard/radio/vocab";
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
  const listen = platforms.filter((p) => PLATFORM_META[p.platform].kind === "listen");
  const social = platforms.filter((p) => PLATFORM_META[p.platform].kind === "social");

  /** رابطُ منصّةٍ واحد، يخدم الصفّين فلا يُكتب مرّتين. */
  const platformLink = (p: (typeof platforms)[number]) => {
    const Icon = PLATFORM_ICON[p.platform];
    return (
      <a key={p.platform} href={p.url} target="_blank" rel="noreferrer" className="radn-dir"
        aria-label={`${show.title} على ${PLATFORM_META[p.platform].label}`}>
        <Icon size={17} weight={ICON_WEIGHT} aria-hidden />{PLATFORM_META[p.platform].label}
      </a>
    );
  };

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
        <section className={`rad radn-page rad-tone-${show.tone} py-10 md:py-14`}>
          <Container>
            <nav className="radn-crumb" aria-label="مسار الصفحة">
              <Link href="/radio">الإذاعة</Link>
              <span className="radn-crumb-sep" aria-hidden><CaretLeft size={13} /></span>
              <span className="radn-crumb-here">{show.title}</span>
            </nav>

            <div className="radn-cols">
            <div className="radn-aside">
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
                    <Playlist weight={ICON_WEIGHT} aria-hidden />{countPhrase(episodes.length, EPISODES_UNIT)}
                  </span>
                </div>
                {/**
                  * منصّاتُ البرنامج **أيقوناتٌ في صدره** لا شاراتٌ نصّيّة:
                  * الروابطُ هويّةُ البرنامج لا محتواه، فموضعُها حيث اسمُه وشعارُه.
                  * والشارةُ النصّيّة تُقرأ وسمًا يصنّفه لا بابًا يُضغط.
                  */}
                {/* الفعلُ الأوّلُ يتصدّر، والوجهاتُ تحته: من فتح صفحةَ برنامجٍ يريد أن يسمع. */}
                <div className="rad-hero-cta">{tracks[0] ? (
                  <Link href={`/radio/${tracks[0].showSlug}/${tracks[0].episodeSlug}`} className="rad-cta">
                    <Play size={18} weight={ICON_WEIGHT} aria-hidden />استمع لآخر حلقة
                  </Link>
                ) : null}</div>
                {listen.length ? (
                  <div className="mt-3">
                    <div className="radn-subs-h">استمع على</div>
                    <div className="radn-subs">{listen.map(platformLink)}</div>
                  </div>
                ) : null}
                {social.length ? (
                  <div className="mt-3">
                    <div className="radn-subs-h">تابِع البرنامج على</div>
                    <div className="radn-subs">{social.map(platformLink)}</div>
                  </div>
                ) : null}
              </div>
            </div>

            </div>
            <div className="radn-main">
            {show.description ? (
              <div className="max-w-2xl"><FoldedText text={show.description} /></div>
            ) : null}


            <h2 className="mb-3 mt-10 font-display text-lg font-black">الحلقات</h2>
            {playable.length === 0 ? (
              <p className="text-content-muted">لا حلقات منشورة بعد.</p>
            ) : (
              <div className="radn-rows">
                {playable.map((e, i) => (
                  <EpisodeRow
                    key={e.id}
                    track={tracks[i]}
                    number={e.number}
                    dateLabel={e.dateLabel}
                    summary={e.summary}
                    showName={null}
                    queue={tracks.slice(i + 1)}
                  />
                ))}
              </div>
            )}
            </div>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
