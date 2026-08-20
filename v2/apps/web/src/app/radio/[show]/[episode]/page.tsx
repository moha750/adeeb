import Link from "next/link";
import { notFound } from "next/navigation";
import { Accordion, Container, Footer, countPhrase } from "@adeeb/design-system";
import { MicrophoneStage, YoutubeLogo } from "@phosphor-icons/react/dist/ssr";
import { ICON_WEIGHT } from "@/lib/iconWeight";
import { SiteHeader } from "../../../_components/SiteHeader";
import { episodeLabel, formatDuration, PLAYS_UNIT } from "../../../dashboard/radio/vocab";
import { youtubeId, youtubeThumb } from "@/lib/radio/youtube";
import { breadcrumbLd, ldScript, podcastEpisodeLd } from "@/lib/radio/jsonld";
import { getPublicEpisode, isPlayable, toTrack } from "../../data";
import { EpisodeRow } from "../../_player/EpisodeRow";
import { InlinePlayer } from "../../_player/InlinePlayer";
import { ShareEpisode } from "../../_player/ShareEpisode";
import { LikeEpisode } from "../../_player/LikeEpisode";
import { YoutubeThumb } from "../../_player/YoutubeThumb";
import { FoldedText } from "../../_player/FoldedText";
import { ChapterList } from "../../_player/ChapterList";
import { parseChapters } from "@/lib/radio/chapters";

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
                  : <MicrophoneStage size={40} weight={ICON_WEIGHT} aria-hidden />}
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
                  {episode.plays > 0 ? (
                    <span>{countPhrase(episode.plays, PLAYS_UNIT)}</span>
                  ) : null}
                </div>
                <div className="rad-hero-cta flex items-center gap-2">
                  <LikeEpisode episodeId={episode.id} initial={episode.likes} />
                  <ShareEpisode title={episode.title} showTitle={show.title}
                    episodeId={episode.id} seconds={episode.musicSeconds ?? episode.plainSeconds} />
                </div>
              </div>
            </div>

            {/* المشغّلُ حيث يقع الفعل، لا في أسفل الشاشة بعيدًا عمّا ضُغط */}
            <InlinePlayer track={toTrack(episode, show)} rest={more.map((e) => toTrack(e, show))} startAt={startAt} />

            {episode.summary ? (
              <div className="mt-6 max-w-2xl"><FoldedText text={episode.summary} /></div>
            ) : null}

            {/**
              * الصورةُ **بابٌ لا شاشة**: لا يُضمَّن مشغّلُ يوتيوب في الصفحة.
              * فالقسمُ غرفةُ استماع، وشاشةٌ تعمل وسطها تكسب العينَ دائمًا فيتوقّف
              * من كان يقرأ التفريغ. والفيديوُ المضمَّن يعرض عند انتهائه مقاطعَ
              * **قنواتٍ أخرى** داخل صفحتنا. أمّا الخروجُ إلى يوتيوب فمشاهدةٌ
              * تُحسَب للقناة، فهو ربحٌ لا خسارة. (قرار المالك ٢٠٢٦-٠٨-١٣.)
              *
              * والدعوةُ **سطرٌ تحت الصورة** لا شارةٌ عليها: الشارةُ تُقرأ وسمًا لا
              * دعوة، وقد تختفي وراء ما هو مكتوبٌ في المصغّرة أصلًا.
              */}
            {episode.youtubeUrl ? (
              <a href={episode.youtubeUrl} target="_blank" rel="noreferrer" className="rad-yt mt-6">
                {ytId ? <YoutubeThumb id={ytId} alt={`صورة ${episode.title} على يوتيوب`} /> : null}
                <span className="rad-yt-cta">
                  <YoutubeLogo size={18} weight={ICON_WEIGHT} aria-hidden />
                  شاهِد الحلقة على يوتيوب
                </span>
              </a>
            ) : null}

            {/**
              * **محاورُ الحلقة**: إن حملت سطورُها أوقاتًا صارت أبوابًا تُنقَر،
              * وإلّا عُرضت نصًّا كما كُتبت. ولا حقلَ جديدًا في اللوحة ولا ترحيل:
              * الوقتُ يُقرأ من النصّ نفسِه (`lib/radio/chapters`)، وهو النصُّ الذي
              * يكتبه المحرّرُ لوصف يوتيوب على كلّ حال.
              */}
            {episode.notes ? (
              <div className="mt-10 max-w-2xl">
                <h2 className="mb-3 font-display text-lg font-black">محاور الحلقة</h2>
                {chapters ? (
                  <ChapterList
                    chapters={chapters}
                    track={toTrack(episode, show)}
                    rest={more.map((e) => toTrack(e, show))}
                  />
                ) : (
                  <FoldedText text={episode.notes} />
                )}
              </div>
            ) : null}

            {/**
              * التفريغُ النصّيّ — كان يُكتب في اللوحة ولا يراه أحد.
              * ويُطوى لا يُبسط: نصٌّ يبلغ آلافَ الكلمات لو انفرش لدفع كلَّ ما بعده
              * خارج الصفحة، فيُفتح بنقرةٍ ممّن أراده. والأكورديون مكوّنُ المكتبة
              * كما هو (ق١، المسار الأوّل)، ولا تنسيقَ يُخترع له.
              */}
            {episode.transcript ? (
              <div className="mt-10 max-w-2xl" id="transcript">
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
                      track={toTrack(e, show)}
                      number={e.number}
                      dateLabel={e.dateLabel}
                      summary={e.summary}
                      showName={null}
                      plays={e.plays}
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
