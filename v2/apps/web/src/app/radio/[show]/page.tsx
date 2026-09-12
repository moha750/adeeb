import Link from "next/link";
import { notFound } from "next/navigation";
import {countPhrase} from "@adeeb/design-system";
import {
  Play, YoutubeLogo, XLogo, InstagramLogo, TiktokLogo,
} from "@phosphor-icons/react/dist/ssr";
import { ICON_WEIGHT } from "@/lib/iconWeight";
import { EPISODES_UNIT, PLATFORM_META } from "../../dashboard/radio/vocab";
import { getPublicShowPage, isPlayable, toTrack } from "../data";
import { pullQuote } from "@/lib/radio/quote";
import { shareOg } from "@/lib/share";
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

  const playable = episodes.filter(isPlayable);
  const tracks: Track[] = playable.map((e) => toTrack(e, show));
  /** رابطُ منصّةٍ واحد، يخدم الصفّين فلا يُكتب مرّتين. */
  const platformLink = (p: (typeof platforms)[number]) => {
    const Icon = PLATFORM_ICON[p.platform];
    return (
      <a key={p.platform} href={p.url} target="_blank" rel="noreferrer" className="stn-sub"
        aria-label={`${show.title} على ${PLATFORM_META[p.platform].label}`}>
        <Icon size={17} weight={ICON_WEIGHT} aria-hidden />{PLATFORM_META[p.platform].label}
      </a>
    );
  };

  /**
   * **«ابدأ من هنا»** — جوابُ الغريب عن «من أين أبدأ»، وهو أوّلُ ما يسأله من
   * فتح برنامجًا لا يعرفه. والاختيارُ اليومَ **الحلقةُ الأولى** لأنّ برامجنا
   * متسلسلة؛ ويومَ ينزل عمودُ اختيارِ المحرّر يسبقه.
   */
  const first = playable.length > 1 ? playable[playable.length - 1] : null;
  const firstTrack = first ? tracks[playable.indexOf(first)] : null;
  const firstQuote = first ? pullQuote(first) : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={ldScript(podcastSeriesLd(show))} />
      <script type="application/ld+json" dangerouslySetInnerHTML={ldScript(
        breadcrumbLd([
          { name: "الإذاعة", path: "/radio" },
          { name: show.title, path: `/radio/${show.slug}` },
        ]),
      )} />
      <main>
        {/* ══ صدرُ البرنامج: الغلافُ بطلُه، واللوحُ عنّابيٌّ صلبُ الحافّة ══
            وخلَفُ `stn-hero` الذي كان مربّعًا ٧٢ بكسلًا إلى جانب سطرين. */}
        <div className="stq-c-wrap">
          <div className="stc-hero">
            <div className="stc-hero-row">
              <span className="stc-cover">
                {show.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={show.logoUrl} alt="" />
                ) : null}
              </span>
              <div className="stc-hero-in">
                <span className="stc-hero-k"><i aria-hidden />برنامج</span>
                <h1 className="stc-hero-t">{show.title}</h1>
                <p className="stc-hero-s">
                  {show.tagline ? <>{show.tagline}، </> : null}
                  {show.hostName ? <>يقدّمه {show.hostName}، </> : null}
                  {countPhrase(episodes.length, EPISODES_UNIT)}
                </p>
                {/* الفعلُ الأوّلُ يتصدّر: من فتح صفحةَ برنامجٍ يريد أن يسمع. */}
                {tracks[0] ? (
                  <div className="stc-hero-acts">
                    <Link
                      href={`/radio/${tracks[0].showSlug}/${tracks[0].episodeSlug}`}
                      className="stc-play"
                    >
                      <Play weight="fill" aria-hidden />
                      استمع لآخر حلقة
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* الجملةُ الدالّةُ من أوّل حلقة: كرتٌ يطفو على حدّ اللوح */}
        {first && firstQuote ? (
          <Link href={`/radio/${show.slug}/${first.slug}`} className="stq-c">
            <p className="stq-c-t">
              <span className="stq-c-mark" aria-hidden>❝</span>
              {firstQuote}
            </p>
            <p className="stq-c-s">{first.title}، أوّلُ الحكاية</p>
          </Link>
        ) : null}

        <div className="stn-page">
            {/**
              * منصّاتُ البرنامج **أيقوناتٌ في صدره** لا شاراتٌ نصّيّة: الروابطُ
              * هويّةُ البرنامج لا محتواه، فموضعُها حيث اسمُه وشعارُه.
              */}
            {platforms.length ? <div className="stn-subs">{platforms.map(platformLink)}</div> : null}

            {show.description ? <FoldedText text={show.description} className="stn-desc" /> : null}

            <section className="stn-sec">
              <div className="stn-shead">
                <h2>الحلقات</h2>
              </div>
              {playable.length === 0 ? (
                <div className="stn-empty">
                  <p>لا حلقات منشورة بعد. تابعنا لتصلك الأولى.</p>
                </div>
              ) : (
                <div className="stn-rows">
                  {playable.map((e, i) => (
                    <EpisodeRow
                      key={e.id}
                      track={tracks[i]}
                      number={e.number}
                      dateLabel={e.dateLabel}
                      summary={e.summary}
                      quote={pullQuote(e)}
                      showName={null}
                      queue={tracks.slice(i + 1)}
                    />
                  ))}
                </div>
              )}
            </section>
        </div>
      </main>
    </>
  );
}
