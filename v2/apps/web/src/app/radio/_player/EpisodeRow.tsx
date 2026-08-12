"use client";

import Link from "next/link";
import { Badge } from "@adeeb/design-system";
import { Play, Pause } from "@phosphor-icons/react";
import { episodeLabel, formatDuration } from "../../dashboard/radio/vocab";
import { useRadioPlayer, type Track } from "./PlayerProvider";

/**
 * صفُّ حلقة — **يُبحر ولا يُشغّل** (قرار المالك ٢٠٢٦-٠٨-١٢).
 *
 * كان في طرفه زرُّ تشغيل، فأُزيل: القائمةُ تدلّ على الحلقات والتشغيلُ يقع في
 * صفحتها. فالصفُّ كلُّه هدفٌ واحدٌ لا هدفان، ولا يحتار الضاغطُ أيَّهما قصد.
 *
 * ويبقى فيه أثرُ المشغّل شاهدًا لا زمامًا: شارةُ «يُذاع الآن» على الحلقة
 * العاملة، فيعرف القارئُ أين هو ممّا يسمع.
 */
export function EpisodeRow({
  track, number, dateLabel, summary, showName,
}: {
  track: Track;
  number: number;
  dateLabel: string;
  summary: string | null;
  showName: string | null;
}) {
  const player = useRadioPlayer();
  const isCurrent = player.isCurrent(track.id);

  return (
    <div className={"rad-ep" + (isCurrent ? " is-playing" : "")}>
      <span className="rad-ep-num">{number}</span>

      <div className="rad-ep-txt">
        <Link href={`/radio/${track.showSlug}/${track.episodeSlug}`} className="rad-ep-title">
          {track.title}
        </Link>
        <div className="rad-ep-sub">
          {showName ? <span>{showName}</span> : null}
          <span>{dateLabel}</span>
          {track.seconds ? <span className="font-latin"><bdi dir="ltr">{formatDuration(track.seconds)}</bdi></span> : null}
          {isCurrent ? <Badge tone="success" variant="soft" dot>يُذاع الآن</Badge> : null}
          <span className="sr-only">{episodeLabel(number)}</span>
        </div>
        {summary ? <p className="rad-ep-sum">{summary}</p> : null}
      </div>
    </div>
  );
}

/**
 * زرُّ «استمع» في صفحة الحلقة — وهو **الموضع الوحيد الذي يبدأ منه الصوت**
 * بعد أن أُزيل الزرُّ من الصفوف. و`rest` بقيّةُ حلقات البرنامج، فينساب
 * الاستماعُ إلى ما بعدها بلا نقرة.
 */
export function PlayTrackButton({ track, label, rest = [] }: { track: Track; label: string; rest?: Track[] }) {
  const player = useRadioPlayer();
  const isPlaying = player.isCurrent(track.id) && player.playing;
  return (
    <button type="button" className="rad-cta" onClick={() => player.play(track, rest)}>
      {isPlaying ? <Pause size={18} weight="fill" aria-hidden /> : <Play size={18} weight="fill" aria-hidden />}
      {isPlaying ? "إيقاف" : label}
    </button>
  );
}
