"use client";

import { useLater } from "@/lib/radio/later";
import { EpisodeRow } from "./EpisodeRow";
import type { RailItem } from "./ContinueRail";

/**
 * **رفُّ ما أُجّل** — يقرأ معرّفاتِ الجهاز وينخل بها حوضًا يرسله الخادم.
 *
 * وعميليٌّ بالضرورة لا بالاختيار، كـ«تابع الاستماع»: القائمةُ في متصفّح الزائر
 * فلا يعرفها الخادم. ولا شيءَ يُرسَم على الخادم فلا تصرخ الترطيب.
 *
 * **والترتيبُ ترتيبُ التأجيل لا ترتيبُ النشر**: من أجّل حلقةً قديمةً اليومَ
 * يريدها في الصدر، فالقائمةُ سجلُّ نيّةٍ لا أرشيف.
 */
export function LaterRail({ pool, max = 4 }: { pool: RailItem[]; max?: number }) {
  const ids = useLater();
  if (!ids.length) return null;

  const byId = new Map(pool.map((i) => [i.track.id, i]));
  const items = ids.map((id) => byId.get(id)).filter((i): i is RailItem => Boolean(i)).slice(0, max);
  if (!items.length) return null;

  const queue = items.map((i) => i.track);

  return (
    <section className="stn-sec">
      <div className="stn-shead">
        <h2>اسمع لاحقًا</h2>
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
