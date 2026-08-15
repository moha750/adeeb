"use client";

import Link from "next/link";
import { Badge, countPhrase } from "@adeeb/design-system";
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
/** تصريفُ «استماعة» عربيًّا من مصدر المكتبة، فلا يُخترع تصريفٌ ثانٍ. */
export const PLAYS_UNIT = { one: "استماعة", two: "استماعتان", few: "استماعات" };

export function EpisodeRow({
  track, number, dateLabel, summary, showName, plays = 0,
}: {
  track: Track;
  number: number;
  dateLabel: string;
  summary: string | null;
  showName: string | null;
  plays?: number;
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
          {plays > 0 ? <span>{countPhrase(plays, PLAYS_UNIT)}</span> : null}
          {isCurrent ? <Badge tone="success" variant="soft" dot>يُذاع الآن</Badge> : null}
          <span className="sr-only">{episodeLabel(number)}</span>
        </div>
        {summary ? <p className="rad-ep-sum">{summary}</p> : null}
      </div>
    </div>
  );
}

