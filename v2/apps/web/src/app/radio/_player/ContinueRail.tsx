"use client";

import { useProgressAll } from "@/lib/radio/progress";
import { EpisodeRow } from "./EpisodeRow";
import type { Track } from "./PlayerProvider";

export type RailItem = {
  track: Track;
  number: number;
  dateLabel: string;
  summary: string | null;
  showName: string;
  quote?: string | null;
};

/**
 * **تابع الاستماع** — أثمنُ رفٍّ في واجهةِ أيّ محطّة، وكان بيانُه محفوظًا عندنا
 * منذ اليوم الأوّل ولا يُعرَض.
 *
 * `lib/radio/progress` يخزّن أين وقف المستمعُ في كلّ حلقة، وكان يُقرأ في صفحة
 * الحلقة وحدَها ليضع مؤشّرَ الموجة. فههنا يُقرأ كلُّه: ما بدأه ولم يُتمّه، أحدثُه
 * أوّلًا، فوق كلّ ما في الصفحة.
 *
 * **وعميليٌّ بالضرورة لا بالاختيار**: الموضعُ في متصفّح الزائر، فلا يعرفه الخادم.
 * ولذلك يُرسَل من الخادم **حوضٌ** من آخر الحلقات، ويُنخَل هنا بما في المخزن.
 * ولا شيءَ يُرسَم على الخادم فلا تصرخ الترطيب: اللقطةُ هناك فارغة.
 */
export function ContinueRail({ pool, max = 4 }: { pool: RailItem[]; max?: number }) {
  const saved = useProgressAll();
  if (!saved.length) return null;

  const byId = new Map(pool.map((i) => [i.track.id, i]));
  const items = saved.map((s) => byId.get(s.id)).filter((i): i is RailItem => Boolean(i)).slice(0, max);
  if (!items.length) return null;

  const queue = items.map((i) => i.track);

  return (
    <section className="stn-sec">
      <div className="stn-shead">
        <h2>تابع الاستماع</h2>
      </div>
      <div className="stn-rows">
        {items.map((i, n) => (
          <EpisodeRow
            key={i.track.id}
            track={i.track}
            number={i.number}
            dateLabel={i.dateLabel}
            summary={null}
            showName={i.showName}
            queue={queue.slice(n + 1)}
          />
        ))}
      </div>
    </section>
  );
}
