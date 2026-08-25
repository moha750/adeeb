"use client";

import Link from "next/link";
import { Play, Pause, Waveform } from "@phosphor-icons/react";
import { ICON_WEIGHT } from "@/lib/iconWeight";
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
 * **والوزنُ هو الفاصل.** قاعدةُ «لا فاصلَ مرسومًا» صحيحة، لكنّها كانت تترك أربعَ
 * حقائقَ بلونٍ واحدٍ ووزنٍ واحدٍ يفصلها فراغ، فتُقرأ «‏2026 20:28» ختمًا زمنيًّا
 * واحدًا. فاسمُ البرنامج يثقُل، والتاريخُ يخفُت، والمدّةُ تدخل حبّة.
 *
 * **والغلافُ يحمل شريطَ سماعِه**، فيُقرأ «كم بقي» بالنظر لا بكلمةٍ تُكتب.
 */
export function EpisodeRow({
  track, number, dateLabel, summary, showName, queue = [], artUrl,
}: {
  track: Track;
  number: number;
  dateLabel: string;
  summary: string | null;
  /** اسمُ البرنامج يُعرَض في الفهرس حيث تختلط البرامج، ويسقط داخل البرنامج الواحد. */
  showName: string | null;
  /** ما يلي هذه الحلقةَ في القائمة التي ضُغطت منها، فتتلوها أختُها بلا نقرة. */
  queue?: Track[];
  /** غلافُ البرنامج. وفي الفهرس هو ما تمسحه العين، لا رقمُ الحلقة. */
  artUrl?: string | null;
}) {
  const player = useRadioPlayer();
  const isCurrent = player.isCurrent(track.id);
  const playing = isCurrent && player.playing;
  const seconds = track.seconds ?? 0;
  const saved = useSavedPosition(track.id, seconds);
  const at = isCurrent && player.time > 0 ? player.time : saved;
  const pct = seconds > 0 ? Math.min(100, (at / seconds) * 100) : 0;

  return (
    <div className={"radn-row" + (isCurrent ? " is-playing" : "")}>
      <span className="radn-art">
        {artUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={artUrl} alt="" />
          : showName
            ? <Waveform size={24} weight={ICON_WEIGHT} aria-hidden />
            : <span className="radn-art-num">{number}</span>}
        {at > 0 ? (
          <span className="radn-art-prog" aria-hidden><i style={{ width: `${pct}%` }} /></span>
        ) : null}
      </span>

      <span className="radn-txt">
        <Link href={`/radio/${track.showSlug}/${track.episodeSlug}`} className="radn-t">
          {track.title}
        </Link>
        <span className="radn-m">
          {showName ? <span className="radn-show">{showName}</span> : null}
          <span className="radn-date">{dateLabel}</span>
          {seconds ? (
            <span className="radn-chip"><bdi className="radn-n" dir="ltr">{formatDuration(seconds)}</bdi></span>
          ) : null}
          {at > 0 ? (
            <span className={"radn-chip " + (at >= seconds ? "radn-chip-done" : "radn-chip-left")}>
              {at >= seconds ? "سُمعت" : `بقي ${formatDuration(seconds - at)}`}
            </span>
          ) : null}
          <span className="sr-only">{episodeLabel(number)}</span>
        </span>
        {summary ? <span className="radn-s">{summary}</span> : null}
      </span>

      {/* الاسمُ يحمل عنوانَ الحلقة: عشرةُ أزرارٍ تُنطَق «تشغيل» ليست عشرةَ أزرار */}
      <button
        type="button"
        className={"radn-play" + (playing ? " is-on" : "")}
        aria-label={`${playing ? "إيقاف" : "تشغيل"} ${track.title}`}
        onClick={() => (isCurrent ? player.toggle() : player.play(track, queue))}
      >
        {playing
          ? <Pause size={16} weight="fill" aria-hidden />
          : <Play size={16} weight="fill" aria-hidden />}
      </button>
    </div>
  );
}
