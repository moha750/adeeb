import Link from "next/link";
import { Alert, Container, Footer } from "@adeeb/design-system";
import { MicrophoneStage, Play } from "@phosphor-icons/react/dist/ssr";
import { ICON_WEIGHT } from "@/lib/iconWeight";
import { SiteHeader } from "../_components/SiteHeader";
import { getLatestEpisodes, getPublicShows, getPublicStation, isPlayable, toTrack } from "./data";
import { EpisodeRow } from "./_player/EpisodeRow";
import type { Track } from "./_player/PlayerProvider";

export const revalidate = 60;

const DECK = "برامجُ نادي أدِيب مسموعةً: حوارٌ وقراءةٌ وكلمة، بموسيقى أو بدونها.";

/**
 * الوسمُ يُبنى ولا يُكتَب ثابتًا: صورةُ البطاقة شعارُ المحطّة، وهو في القاعدة.
 * والقراءةُ مغلَّفةٌ بـ`cache` فلا تصير استعلامًا ثانيًا مع قراءة الصفحة نفسِها.
 */
export async function generateMetadata() {
  const station = await getPublicStation();
  const description = station.tagline ?? DECK;
  return {
    title: station.name,
    description,
    alternates: { canonical: "/radio" },
    openGraph: {
      title: station.name,
      description,
      images: station.logoUrl ? [station.logoUrl] : undefined,
      type: "website",
      siteName: "إذاعة أدِيب",
    },
  };
}

export default async function RadioPage() {
  const [station, showsRes, latest] = await Promise.all([
    getPublicStation(),
    getPublicShows(),
    getLatestEpisodes(6),
  ]);
  const { shows, error: showsError } = showsRes;

  const tracks: Track[] = latest
    .filter((l) => isPlayable(l.episode))
    .map((l) => toTrack(l.episode, {
      title: l.showTitle, slug: l.showSlug, logoUrl: l.showLogoUrl, tone: l.showTone,
    }));

  return (
    <>
      <SiteHeader activeHref="/radio" />
      <main>
        <section className="rad py-10 md:py-14">
          <Container>
            {/* صدرُ المحطّة: من نحن، وما آخرُ ما أُذيع */}
            <div className="rad-hero">
              <div className="rad-hero-logo">
                {station.logoUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={station.logoUrl} alt="" />
                  : <MicrophoneStage size={40} weight={ICON_WEIGHT} aria-hidden />}
              </div>
              <div className="rad-hero-txt">
                <h1 className="rad-hero-name">{station.name}</h1>
                <p className="rad-hero-deck">{station.tagline ?? "برامجُ أدِيب مسموعةً، بموسيقى أو بدونها."}</p>
                <div className="rad-hero-cta">{tracks[0] ? (
                  <Link href={`/radio/${tracks[0].showSlug}/${tracks[0].episodeSlug}`} className="rad-cta">
                    <Play size={18} weight={ICON_WEIGHT} aria-hidden />استمع لآخر حلقة
                  </Link>
                ) : null}</div>
              </div>
            </div>

            {station.description ? (
              <p className="max-w-2xl leading-relaxed text-content-muted">{station.description}</p>
            ) : null}

            {/* رفُّ البرامج */}
            {shows.length ? (
              <>
                <h2 className="mb-3 mt-10 font-display text-lg font-black">البودكاست</h2>
                <div className="rad-shelf">
                  {shows.map((s) => (
                    <Link key={s.id} href={`/radio/${s.slug}`} className={`rad-prog rad-tone-${s.tone}`}>
                      <div className="rad-prog-cover">
                        {s.logoUrl
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={s.logoUrl} alt="" />
                          : <MicrophoneStage size={34} weight={ICON_WEIGHT} aria-hidden />}
                      </div>
                      <div className="rad-prog-name">{s.title}</div>
                      {s.tagline ? <div className="rad-prog-sub">{s.tagline}</div> : null}
                      <div className="rad-prog-sub"><span className="font-latin">{s.episodeCount}</span> حلقة</div>
                    </Link>
                  ))}
                </div>
              </>
            ) : showsError ? (
              /* تعذّرت القراءة، فلا يُقال «لا برامج»: تلك جملةٌ عن المحتوى وهذه عن العطل. */
              <div className="mt-10 max-w-2xl">
                <Alert tone="warning">تعذّر تحميلُ البرامج الآن. أعِد تحديثَ الصفحة بعد قليل.</Alert>
              </div>
            ) : (
              <p className="mt-10 text-content-muted">لا برامج منشورة بعد. تابعنا لتصلك الأولى.</p>
            )}

            {/* أحدثُ ما أُذيع */}
            {tracks.length ? (
              <>
                <h2 className="mb-3 mt-10 font-display text-lg font-black">أحدث الحلقات</h2>
                <div className="rad-eps">
                  {latest.filter((l) => isPlayable(l.episode)).map((l, i) => (
                    <EpisodeRow
                      key={l.episode.id}
                      track={tracks[i]}
                      number={l.episode.number}
                      dateLabel={l.episode.dateLabel}
                      summary={l.episode.summary}
                      showName={l.showTitle}
                      plays={l.episode.plays}
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
