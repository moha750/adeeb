import Link from "next/link";
import { notFound } from "next/navigation";
import { Accordion, Footer } from "@adeeb/design-system";
import { YoutubeLogo, Clock, BookOpen } from "@phosphor-icons/react/dist/ssr";
import { ICON_WEIGHT } from "@/lib/iconWeight";
import { CaretLeft } from "@/app/_components/glyphs";
import { SiteHeader } from "../../../_components/SiteHeader";
import { episodeLabel, formatDuration } from "../../../dashboard/radio/vocab";
import { youtubeId, youtubeThumb } from "@/lib/radio/youtube";
import { breadcrumbLd, ldScript, podcastEpisodeLd } from "@/lib/radio/jsonld";
import { getPublicEpisode, isPlayable, toTrack } from "../../data";
import { EpisodeRow } from "../../_player/EpisodeRow";
import { InlinePlayer } from "../../_player/InlinePlayer";
import { ShareEpisode } from "../../_player/ShareEpisode";
import { LikeEpisode } from "../../_player/LikeEpisode";
import { LaterButton } from "../../_player/LaterButton";
import { YoutubeThumb } from "../../_player/YoutubeThumb";
import { FoldedText } from "../../_player/FoldedText";
import { parseChapters } from "@/lib/radio/chapters";
import { isEcho, pullQuote } from "@/lib/radio/quote";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ show: string; episode: string }> }) {
  const { show, episode } = await params;
  const found = await getPublicEpisode(show, episode);
  if (!found) return { title: "إذاعة أدِيب" };
  /* صورةُ البطاقة: مصغّرةُ يوتيوب المضمونة، وإلّا شعارُ البرنامج. ولا نرفع ثالثةً. */
  const id = youtubeId(found.episode.youtubeUrl);
  const image = id ? youtubeThumb(id) : found.show.logoUrl;
  return {
    title: `${found.episode.title}، ${found.show.title}`,
    description: found.episode.summary ?? undefined,
    alternates: { canonical: `/radio/${show}/${episode}` },
    openGraph: {
      title: found.episode.title,
      description: found.episode.summary ?? undefined,
      images: image ? [image] : undefined,
      type: "article",
      publishedTime: found.episode.publishedAt ?? undefined,
      siteName: "إذاعة أدِيب",
    },
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

  const more = siblings.filter(isPlayable).slice(0, 5);
  const ytId = youtubeId(episode.youtubeUrl);
  /* رابطٌ بلحظة: `?t=` بالثواني. ويُنقّى ممّا لا يصحّ فلا يبدأ رقمٌ عابثٌ حلقةً
     من موضعٍ لا وجودَ له، ولا يزيد على مدّتها. */
  const rawT = (await searchParams).t;
  const tParam = Number(Array.isArray(rawT) ? rawT[0] : rawT);
  const total = episode.musicSeconds ?? episode.plainSeconds ?? 0;
  const startAt =
    Number.isFinite(tParam) && tParam > 0 ? Math.min(Math.floor(tParam), Math.max(0, total - 1)) : 0;
  const chapters = parseChapters(episode.notes);
  const quote = pullQuote(episode);
  /* والملخّصُ يسقط إن كان صدًى للجملة: المعنى لا يُطبَع مرّتين في صفحةٍ واحدة. */
  const summary = isEcho(quote, episode.summary) ? null : episode.summary;

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
      <SiteHeader activeHref="/radio" />
      <main className="stn">
        <div className="stn-page">
            <nav className="stn-crumb" aria-label="مسار الصفحة">
              <Link href="/radio">الإذاعة</Link>
              <CaretLeft aria-hidden />
              <Link href={`/radio/${show.slug}`}><b>{show.title}</b></Link>
            </nav>

            <div className="stn-cols">
              <div>
                <h1 className="stn-ep-t">{episode.title}</h1>
                <div className="stn-ep-meta">
                  {episode.musicSeconds ? (
                    <span className="stn-chip">
                      <Clock size={12} weight={ICON_WEIGHT} aria-hidden />
                      <bdi dir="ltr">{formatDuration(episode.musicSeconds)}</bdi>
                    </span>
                  ) : null}
                  <span className="stn-chip">{episode.dateLabel}</span>
                  {episode.hostName ? <span className="stn-chip">تقديم {episode.hostName}</span> : null}
                  {episode.transcript ? (
                    <span className="stn-chip">
                      <BookOpen size={12} weight={ICON_WEIGHT} aria-hidden />
                      مكتوبةٌ كاملة
                    </span>
                  ) : null}
                  <span className="sr-only">{episodeLabel(episode.number)}</span>
                </div>

                {/**
                  * **الجملةُ قبل المشغّل** — أطروحةُ المحطّة: ما يقرّر أتُسمَع
                  * الحلقةُ أم لا هو ما يقوله الصوتُ نفسُه، لا وصفٌ كُتب عنه.
                  */}
                {quote ? <p className="stn-pull">{quote}</p> : null}

                {/* المشغّلُ حيث يقع الفعل، لا في أسفل الشاشة بعيدًا عمّا ضُغط */}
                <InlinePlayer
                  track={toTrack(episode, show)}
                  rest={more.map((e) => toTrack(e, show))}
                  startAt={startAt}
                  chapters={chapters}
                />

                <div className="stn-epacts">
                  <LikeEpisode episodeId={episode.id} initial={episode.likes} />
                  <LaterButton episodeId={episode.id} title={episode.title} />
                  <ShareEpisode
                    title={episode.title}
                    showTitle={show.title}
                    episodeId={episode.id}
                    seconds={episode.musicSeconds ?? episode.plainSeconds}
                  />
                </div>

                {summary ? (
                  <section className="stn-sec">
                    <div className="stn-shead">
                      <h2>عن الحلقة</h2>
                    </div>
                    <FoldedText text={summary} />
                  </section>
                ) : null}

                {/* المحاورُ تسكن لوحَ المشغّل حين تُقرأ موقّتةً؛ وحين لا، تُعرَض نصًّا كما كُتبت */}
                {episode.notes && !chapters ? (
                  <section className="stn-sec">
                    <div className="stn-shead">
                      <h2>محاور الحلقة</h2>
                    </div>
                    <FoldedText text={episode.notes} className="stn-desc stn-notes" />
                  </section>
                ) : null}

                {/**
                  * التفريغُ النصّيّ **يُطوى لا يُبسط**: نصٌّ يبلغ آلافَ الكلمات لو
                  * انفرش لدفع كلَّ ما بعده خارج الصفحة. والأكورديون مكوّنُ المكتبة.
                  */}
                {episode.transcript ? (
                  <section className="stn-sec" id="transcript">
                    <div className="stn-shead">
                      <h2>الحلقة مكتوبة</h2>
                    </div>
                    <Accordion
                      items={[{ q: "اقرأ الحلقة كاملةً", a: <p className="stn-transcript">{episode.transcript}</p> }]}
                    />
                  </section>
                ) : null}

                {episode.youtubeUrl ? (
                  <a href={episode.youtubeUrl} target="_blank" rel="noreferrer" className="stn-yt">
                    {ytId ? <YoutubeThumb id={ytId} alt={`صورة ${episode.title} على يوتيوب`} /> : null}
                    <span className="stn-yt-cta">
                      <YoutubeLogo size={18} weight={ICON_WEIGHT} aria-hidden />
                      شاهِد الحلقة على يوتيوب
                    </span>
                  </a>
                ) : null}
              </div>

              <div>
                {more.length ? (
                  <section className="stn-sec">
                    <div className="stn-shead">
                      <h2>التالي في {show.title}</h2>
                      <Link href={`/radio/${show.slug}`} className="stn-more">
                        كلُّ الحلقات
                        <CaretLeft aria-hidden />
                      </Link>
                    </div>
                    <div className="stn-rows">
                      {more.map((e, i) => (
                        <EpisodeRow
                          key={e.id}
                          track={toTrack(e, show)}
                          number={e.number}
                          dateLabel={e.dateLabel}
                          summary={e.summary}
                          quote={pullQuote(e)}
                          showName={null}
                          queue={more.slice(i + 1).map((x) => toTrack(x, show))}
                        />
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
