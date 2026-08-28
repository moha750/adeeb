import Link from "next/link";
import { Alert, Footer, countPhrase } from "@adeeb/design-system";
import { MagnifyingGlass, CaretLeft } from "@/app/_components/glyphs";
import { Play } from "@phosphor-icons/react/dist/ssr";
import { ICON_WEIGHT } from "@/lib/iconWeight";
import { SiteHeader } from "../_components/SiteHeader";
import { getLatestEpisodes, getPublicShows, getPublicStation, isPlayable, toTrack } from "./data";
import { EpisodeRow } from "./_player/EpisodeRow";
import { ContinueRail, type RailItem } from "./_player/ContinueRail";
import { LaterRail } from "./_player/LaterRail";
import { EPISODES_UNIT } from "../dashboard/radio/vocab";
import { pullQuote } from "@/lib/radio/quote";
import type { Track } from "./_player/PlayerProvider";

export const revalidate = 60;

const DECK = "برامجُ نادي أدِيب مسموعةً: حوارٌ وقراءةٌ وكلمة، بموسيقى أو بدونها.";

/**
 * **واجهةُ المحطّة** — تجيب عن سؤالٍ واحد: *بماذا أسمع الآن؟* لا: *ما البرامجُ
 * الموجودة؟* (وهو ما كانت تجيب عنه، فكان رفُّ البرامج يتصدّر.)
 *
 * وترتيبُ الرفوف ثابتٌ لا يُنقَض، وهو ترتيبُ سبوتيفاي وآبل وBBC جميعًا لأنّه
 * الوحيدُ الذي لا يفسد باتّساع الكشف: **الشخصنةُ، ثمّ الحداثة، ثمّ الكشف.**
 *
 * **ولوحُ «الآن» جملةٌ لا غلاف** — أطروحةُ المحطّة كلِّها: نملك نصَّ كلِّ حلقةٍ
 * مكتوبًا، فتُعرَّف الحلقةُ بجملةٍ من كلامها لا بمربّعٍ مصوَّر. ‏(`lib/radio/quote`.)
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
    getLatestEpisodes(24),
  ]);
  const { shows, error: showsError } = showsRes;

  const playable = latest.filter((l) => isPlayable(l.episode));
  const tracks: Track[] = playable.map((l) =>
    toTrack(l.episode, { title: l.showTitle, slug: l.showSlug, logoUrl: l.showLogoUrl, tone: l.showTone }),
  );
  /* حوضُ «تابع الاستماع»: الخادمُ لا يعرف ما سمعه الزائر، فيرسل ما عنده ويُنخَل عميليًّا. */
  const pool: RailItem[] = playable.map((l, i) => ({
    track: tracks[i],
    number: l.episode.number,
    dateLabel: l.episode.dateLabel,
    summary: l.episode.summary,
    showName: l.showTitle,
  }));
  const shelf = playable.slice(0, 8);
  const top = playable[0];
  const topQuote = top ? pullQuote(top.episode) : null;

  return (
    <>
      <SiteHeader activeHref="/radio" />
      <main className="stn">
        <div className="stn-page">
            {/* الترويسة: من نحن، وبابُ البحث ظاهرٌ لا مخفيّ خلف أيقونة */}
            <div className="stn-mast">
              <span className="stn-mast-logo" aria-hidden>
                {station.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={station.logoUrl} alt="" />
                ) : (
                  <span className="stn-art-n">{station.name.trim()[0]}</span>
                )}
              </span>
              <span className="stn-mast-txt">
                <h1 className="stn-mast-name">{station.name}</h1>
                <span className="stn-mast-sub">{station.tagline ?? DECK}</span>
              </span>
            </div>

            <Link href="/radio/search" className="stn-find">
              <MagnifyingGlass aria-hidden />
              ابحث في البرامج والحلقات وفي الكلام نفسه
            </Link>

            {/* لوحُ «الآن»: جملةٌ من الحلقة تسبق كلَّ شيء */}
            {top && topQuote ? (
              <Link
                href={`/radio/${top.showSlug}/${top.episode.slug}`}
                className="stn-now"
                aria-label={`أحدثُ حلقة: ${top.episode.title}`}
              >
                <span className="stn-now-kick">
                  <i aria-hidden />
                  أحدثُ حلقة
                </span>
                <p className="stn-quote">{topQuote}</p>
                <span className="stn-now-foot">
                  <span className="stn-now-play" aria-hidden>
                    <Play size={24} weight="fill" />
                  </span>
                  <span className="stn-now-meta">
                    <span className="stn-now-title">
                      {top.episode.title}، {top.showTitle}
                    </span>
                    <span className="stn-now-dur">{top.episode.dateLabel}</span>
                  </span>
                </span>
              </Link>
            ) : null}

            <div className="stn-cols">
              <div>
                <ContinueRail pool={pool} />
                <LaterRail pool={pool} />

                {tracks.length ? (
                  <section className="stn-sec">
                    <div className="stn-shead">
                      <h2>جديدُ المحطّة</h2>
                      <Link href="/radio/shows" className="stn-more">
                        كلُّ البرامج
                        <CaretLeft aria-hidden />
                      </Link>
                    </div>
                    <div className="stn-rows">
                      {shelf.map((l, i) => (
                        <EpisodeRow
                          key={l.episode.id}
                          track={tracks[i]}
                          number={l.episode.number}
                          dateLabel={l.episode.dateLabel}
                          summary={l.episode.summary}
                          quote={pullQuote(l.episode)}
                          showName={l.showTitle}
                          queue={tracks.slice(i + 1, 8)}
                        />
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>

              <div>
                {shows.length ? (
                  <section className="stn-sec">
                    <div className="stn-shead">
                      <h2>البرامج</h2>
                      <Link href="/radio/shows" className="stn-more">
                        عرض الكلّ
                        <CaretLeft aria-hidden />
                      </Link>
                    </div>
                    <div className="stn-grid">
                      {shows.slice(0, 6).map((s) => (
                        <Link key={s.id} href={`/radio/${s.slug}`}>
                          <span className="stn-art stn-art-full" aria-hidden>
                            {s.logoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={s.logoUrl} alt="" />
                            ) : (
                              <span className="stn-art-n">{s.title.trim()[0]}</span>
                            )}
                          </span>
                          <span className="stn-show-name">{s.title}</span>
                          <span className="stn-show-meta">{countPhrase(s.episodeCount, EPISODES_UNIT)}</span>
                        </Link>
                      ))}
                    </div>
                  </section>
                ) : showsError ? (
                  /* تعذّرت القراءة، فلا يُقال «لا برامج»: تلك جملةٌ عن المحتوى وهذه عن العطل. */
                  <div className="stn-sec">
                    <Alert tone="warning">تعذّر تحميلُ البرامج الآن. أعِد تحديثَ الصفحة بعد قليل.</Alert>
                  </div>
                ) : (
                  <div className="stn-sec">
                    <div className="stn-empty">
                      <Play size={34} weight={ICON_WEIGHT} aria-hidden />
                      <p>لا برامج منشورة بعد. تابعنا لتصلك الأولى.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
