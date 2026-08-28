"use client";

import Link from "next/link";
import { Play, Pause, Clock } from "@phosphor-icons/react";
import { CaretLeft } from "@/app/_components/glyphs";
import { episodeLabel, formatDuration } from "../../dashboard/radio/vocab";
import { useSavedPosition } from "@/lib/radio/progress";
import { useRadioPlayer, type Track } from "./PlayerProvider";

/**
 * صفُّ حلقة — **يُبحر ويُشغّل، والهدفان مفترقان.**
 *
 * كان الصفُّ هدفًا واحدًا يُبحر ولا يُشغّل، بحجّةِ ألّا يحتار الضاغطُ أيَّهما قصد.
 * والحجّةُ سليمةٌ للعنوان لا للصفّ: أبل وسبوتيفاي وبوكِت كاستس تفعل الاثنين معًا
 * لأنّ الهدفين **مفصولان بصريًّا**، لا لأنّها لم تنتبه. وثمنُ الوحدة أنّ التشغيل
 * كان يكلّف صفحتين دائمًا في منتجٍ صوتيّ. فههنا: العنوانُ رابطٌ ممدودٌ على الصفّ،
 * وزرُّ التشغيل جارٌ مستقلٌّ يعلوه بطبقةٍ فينجو من ظلّه.
 *
 * **والسهمُ يقول إنّ الصفَّ يفتح مكانًا** (طلبُ المالك ٢٠٢٦-٠٨-٢٥): زرُّ التشغيل
 * وحدَه في الطرف يجعل بقيّةَ الصفّ صامتةً عن وظيفتها، فلا يُعرَف أنّها تُبحر إلّا
 * بالتجربة، ولا `:hover` على الجوّال يشرحها. فيقف في الطرف الأقصى سهمُ الدخول
 * نفسُه الذي يحمله الكرتُ الممتدّ: **شكلان مختلفان لفعلين مختلفين، يُرَيان معًا**.
 * وهو `aria-hidden` وغيرُ قابلٍ للنقر: الرابطُ الممدودُ يغطّيه، فلا هدفَ ثالث.
 *
 * **والوزنُ هو الفاصل.** قاعدةُ «لا فاصلَ مرسومًا» صحيحة، لكنّها كانت تترك أربعَ
 * حقائقَ بلونٍ واحدٍ ووزنٍ واحدٍ يفصلها فراغ، فتُقرأ «‏2026 20:28» ختمًا زمنيًّا
 * واحدًا. فاسمُ البرنامج يثقُل، والتاريخُ يخفُت، والمدّةُ تدخل حبّة.
 *
 * ══ الجيلُ الثالث (٢٠٢٦-٠٨-٢٨) ══
 * **الغلافُ خرج من الصفّ، ودخل مكانَه رقمُ الحلقة** في هامشٍ بخطّ Eras: جهازُ
 * الصحيفة، وهو صادقٌ لأنّ الحلقات متسلسلةٌ فعلًا. وغلافٌ مكرَّرٌ في عشرة صفوفٍ
 * لبرنامجٍ واحد لا يميّز شيئًا، واسمُ البرنامج فوق العنوان يفعل ما كان يفعله.
 *
 * **والملخّصُ صار جملةً من كلام الحلقة** حيث وُجدت: هي أطروحةُ المحطّة كلِّها،
 * وهي ما يقرّر أيُضغَط الصفُّ أم يُمسح. والملخّصُ خلَفُها حين تغيب.
 */
export function EpisodeRow({
  track, number, dateLabel, summary, showName, queue = [], quote,
}: {
  track: Track;
  number: number;
  dateLabel: string;
  summary: string | null;
  /** جملةٌ من كلام الحلقة. تسبق الملخّصَ، وهي أطروحةُ المحطّة. */
  quote?: string | null;
  /** اسمُ البرنامج يُعرَض في الفهرس حيث تختلط البرامج، ويسقط داخل البرنامج الواحد. */
  showName: string | null;
  /** ما يلي هذه الحلقةَ في القائمة التي ضُغطت منها، فتتلوها أختُها بلا نقرة. */
  queue?: Track[];
}) {
  const player = useRadioPlayer();
  const isCurrent = player.isCurrent(track.id);
  const playing = isCurrent && player.playing;
  const seconds = track.seconds ?? 0;
  const saved = useSavedPosition(track.id, seconds);
  const at = isCurrent && player.time > 0 ? player.time : saved;
  const pct = seconds > 0 ? Math.min(100, (at / seconds) * 100) : 0;

  return (
    <div className={"stn-row" + (isCurrent ? " is-playing" : "")}>
      <span className="stn-row-n" aria-hidden>
        {number}
      </span>

      <span className="stn-row-b">
        {showName ? <span className="stn-row-show">{showName}</span> : null}
        <Link href={`/radio/${track.showSlug}/${track.episodeSlug}`} className="stn-row-t">
          {track.title}
        </Link>
        {quote || summary ? <p className="stn-row-q">{quote ?? summary}</p> : null}
        <span className="stn-row-meta">
          {seconds ? (
            <span className="stn-chip">
              <Clock aria-hidden />
              <bdi dir="ltr">{formatDuration(seconds)}</bdi>
            </span>
          ) : null}
          <span>{dateLabel}</span>
          {at > 0 ? (
            <span className={"stn-chip" + (at >= seconds ? "" : " stn-chip-red")}>
              {at >= seconds ? "سُمعت" : `بقي ${formatDuration(seconds - at)}`}
            </span>
          ) : null}
          <span className="sr-only">{episodeLabel(number)}</span>
        </span>
        {at > 0 && at < seconds ? (
          <span className="stn-prog" aria-hidden>
            <i style={{ width: `${pct}%` }} />
          </span>
        ) : null}
      </span>

      {/* الاسمُ يحمل عنوانَ الحلقة: عشرةُ أزرارٍ تُنطَق «تشغيل» ليست عشرةَ أزرار */}
      <button
        type="button"
        className={"stn-row-play" + (playing ? " is-on" : "")}
        aria-label={`${playing ? "إيقاف" : "تشغيل"} ${track.title}`}
        onClick={() => (isCurrent ? player.toggle() : player.play(track, queue))}
      >
        {playing ? <Pause weight="fill" aria-hidden /> : <Play weight="fill" aria-hidden />}
      </button>

      <span className="stn-row-chev" aria-hidden>
        <CaretLeft />
      </span>
    </div>
  );
}
