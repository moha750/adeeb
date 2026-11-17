/**
 * **صفحةُ الحلقة العامّة بلا قاعدة** (٢٠٢٦-١١-١٦): صدرُها وجملتُها ومشغّلُها ومحاورُها ونصُّها، من بياناتٍ تُعطى. تقرؤها صفحتُها من القاعدة،
 * ومعاينةُ محرّر البرنامج (`/frame/radio`) من الحلقة المفتوحة فيه وهي تُكتب.
 * **وفي المعاينة لا يُشغَّل شيءٌ ولا يُكتب** (`preview`): المشغّلُ والإعجابُ و«لاحقًا» والمشاركةُ معطّلة — التشغيلُ يَعُدّ استماعةً ويحفظ موضعَ
 * السامع، والإعجابُ يُكتب في القاعدة. وحلقةٌ لم يُرفع ما يُسمَع منها تقول ذلك مكانَ المشغّل.
 */
import Link from "next/link";
import {Accordion} from "@adeeb/design-system";
import { YoutubeLogo, BookOpen } from "@phosphor-icons/react/dist/ssr";
import { ICON_WEIGHT } from "@/lib/iconWeight";
import { CaretLeft } from "@/app/_components/glyphs";
import { episodeLabel, formatDuration } from "../../dashboard/radio/vocab";
import { youtubeId } from "@/lib/radio/youtube";
import { isPlayable, toTrack, type PublicEpisode, type PublicShow } from "../model";
import { EpisodeRow } from "../_player/EpisodeRow";
import { InlinePlayer } from "../_player/InlinePlayer";
import { ShareEpisode } from "../_player/ShareEpisode";
import { LikeEpisode } from "../_player/LikeEpisode";
import { LaterButton } from "../_player/LaterButton";
import { YoutubeThumb } from "../_player/YoutubeThumb";
import { FoldedText } from "../_player/FoldedText";
import { parseChapters } from "@/lib/radio/chapters";
import { isEcho, pullQuote } from "@/lib/radio/quote";

export function EpisodeBody({ show, episode, siblings, startAt = 0, preview }: {
  show: PublicShow; episode: PublicEpisode; siblings: PublicEpisode[]; startAt?: number; preview?: boolean;
}) {
  const more = siblings.filter(isPlayable).slice(0, 5);
  const ytId = youtubeId(episode.youtubeUrl);
  const chapters = parseChapters(episode.notes);
  const quote = pullQuote(episode);
  /* والملخّصُ يسقط إن كان صدًى للجملة: المعنى لا يُطبَع مرّتين في صفحةٍ واحدة. */
  const summary = isEcho(quote, episode.summary) ? null : episode.summary;

  return (
      <main>
        {/* ══ صدرُ الحلقة: غلافُ برنامجها بطلًا على لوحٍ عنّابيّ ══
            وخلَفُ عنوانٍ عارٍ فوق صفٍّ من الحبّات. */}
        <div className="stq-c-wrap">
          <div className="stc-hero">
            <div className="stc-hero-row">
              <Link href={`/radio/${show.slug}`} className="stc-cover" aria-label={show.title}>
                {show.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={show.logoUrl} alt="" />
                ) : null}
              </Link>
              <div className="stc-hero-in">
                <span className="stc-hero-k">
                  <i aria-hidden />
                  {show.title}، {episodeLabel(episode.number)}
                </span>
                <h1 className="stc-hero-t">{episode.title}</h1>
                {/* ما وُجد من المدّة والتاريخ والمقدّم يُجمع بفاصلته: الحلقةُ في المعاينة قد تكون بلا تاريخ (لم تُنشر) فلا تبقى فاصلةٌ يتيمة */}
                <p className="stc-hero-s">
                  {[episode.musicSeconds ? formatDuration(episode.musicSeconds) : null, episode.dateLabel || null, episode.hostName ? `تقديم ${episode.hostName}` : null]
                    .filter(Boolean).join("، ")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* **الجملةُ قبل المشغّل** — أطروحةُ المحطّة: ما يقرّر أتُسمَع الحلقةُ
            أم لا هو ما يقوله الصوتُ نفسُه، لا وصفٌ كُتب عنه. وهي هنا كرتٌ
            يطفو على حدّ اللوح كما في المحطّة، لا فقرةٌ في التدفّق. */}
        {quote ? (
          <div className="stq-c">
            <p className="stq-c-t">
              <span className="stq-c-mark" aria-hidden>❝</span>
              {quote}
            </p>
            <p className="stq-c-s">من كلام الحلقة</p>
          </div>
        ) : null}

        <div className="stn-page">
            <div className="stn-cols">
              <div>
                {episode.transcript ? (
                  <p className="stn-ep-meta">
                    <span className="stn-chip">
                      <BookOpen size={12} weight={ICON_WEIGHT} aria-hidden />
                      مكتوبةٌ كاملة
                    </span>
                  </p>
                ) : null}

                {/* المشغّلُ حيث يقع الفعل، لا في أسفل الشاشة بعيدًا عمّا ضُغط */}
                {isPlayable(episode) ? (
                  <div inert={preview}>
                    <InlinePlayer
                      track={toTrack(episode, show)}
                      rest={more.map((e) => toTrack(e, show))}
                      startAt={startAt}
                      chapters={chapters}
                    />
                  </div>
                ) : (
                  <div className="stn-empty">
                    <p>يظهر المشغّلُ حين يُرفع مسارا الحلقة.</p>
                  </div>
                )}

                <div className="stn-epacts" inert={preview}>
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
                    <div className="stn-rows" inert={preview}>
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
  );
}
