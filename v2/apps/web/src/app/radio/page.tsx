import Link from "next/link";
import {Alert, countPhrase} from "@adeeb/design-system";
import { MagnifyingGlass, CaretLeft } from "@/app/_components/glyphs";
import { Play } from "@phosphor-icons/react/dist/ssr";
import { ICON_WEIGHT } from "@/lib/iconWeight";
import { getLatestEpisodes, getPublicShows, getPublicStation, isPlayable, toTrack } from "./data";
import { EpisodeRow } from "./_player/EpisodeRow";
import { ContinueRail, type RailItem } from "./_player/ContinueRail";
import { LaterRail } from "./_player/LaterRail";
import { EPISODES_UNIT } from "../dashboard/radio/vocab";
import { pullQuote } from "@/lib/radio/quote";
import { shareOg } from "@/lib/share";
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
    openGraph: shareOg({
      title: station.name,
      description,
      type: "website",
      siteName: "إذاعة أدِيب",
    }),
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
      <main>
        {/* ══ الصدر: الغلافُ بطلُ الشاشة، واللوحُ عنّابيٌّ صلبُ الحافّة ══
            (اللغةُ المُقَرّة ٢٠٢٦-٠٩-٠٥). وخلَفُ ترويسةِ الاسم القديمة: اسمُ
            المحطّة في الشريط الجانبيّ على الحاسوب، وفي هذا الصدر على الجوّال. */}
        {top ? (
          <div className="stq-c-wrap">
            <div className="stc-hero">
              <div className="stc-hero-row">
                <Link
                  href={`/radio/${top.showSlug}/${top.episode.slug}`}
                  className="stc-cover"
                  aria-label={`أحدثُ حلقة: ${top.episode.title}`}
                >
                  {top.showLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={top.showLogoUrl} alt="" />
                  ) : station.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={station.logoUrl} alt="" />
                  ) : null}
                </Link>
                <div className="stc-hero-in">
                  <span className="stc-hero-k"><i aria-hidden />أحدثُ حلقة</span>
                  <h1 className="stc-hero-t">{top.episode.title}</h1>
                  <p className="stc-hero-s">
                    {top.showTitle}، {top.episode.dateLabel}
                  </p>
                  <div className="stc-hero-acts">
                    <Link
                      href={`/radio/${top.showSlug}/${top.episode.slug}`}
                      className="stc-play"
                    >
                      <Play weight="fill" aria-hidden />
                      استمع الآن
                    </Link>
                    <Link href="/radio/search" className="stc-icon" aria-label="بحث">
                      <MagnifyingGlass aria-hidden />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* كرتُ الجملة الدالّة: نصفُه في اللوح ونصفُه في الورق (اختارَه المالك).
            وهو أطروحةُ المحطّة: الحلقةُ تُعرَّف بجملةٍ من كلامها. */}
        {top && topQuote ? (
          <Link
            href={`/radio/${top.showSlug}/${top.episode.slug}`}
            className="stq-c"
            aria-label={`أحدثُ حلقة: ${top.episode.title}`}
          >
            <p className="stq-c-t">
              <span className="stq-c-mark" aria-hidden>❝</span>
              {topQuote}
            </p>
            <p className="stq-c-s">{top.episode.title}، من {top.showTitle}</p>
          </Link>
        ) : null}

        <div className="stn-page">
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
    </>
  );
}
