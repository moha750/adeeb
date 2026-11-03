"use client";

import { useSyncExternalStore } from "react";
import { arCount, arCounted, type ArForms } from "@/lib/arabicCount";

/**
 * **العدُّ التنازليّ** (محمد ٢٠٢٦-١١-٠٣): الأيّامُ والساعاتُ والدقائقُ والثواني حتى بداية رمضان.
 * والموعدُ من بيانات الرؤية (`horizon_on`، ٨ فبراير ٢٠٢٧ بتقويم أم القرى) بتوقيت النادي؛ وقد يتقدّم يومًا أو يتأخّر برؤية الهلال،
 * فيُصحَّح التاريخُ في القاعدة حين يُعلَن ويتبعه العدّاد.
 *
 * ساعةٌ واحدةٌ تدقّ كلَّ ثانية (`useSyncExternalStore`): يرسم الخادمُ لحظتَه (`now`)، ويأخذ المتصفّحُ ساعتَه حين يستيقظ
 * — فالصفحةُ المخبّأة خمسَ دقائق لا تُظهر رقمًا متأخّرًا.
 */
const DAY: ArForms = ["يوم", "يومان", "أيام", "يومًا"];
const HOUR: ArForms = ["ساعة", "ساعتان", "ساعات", "ساعة"];
const MIN: ArForms = ["دقيقة", "دقيقتان", "دقائق", "دقيقة"];
const SEC: ArForms = ["ثانية", "ثانيتان", "ثوانٍ", "ثانية"];

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
function subscribe(cb: () => void) {
  listeners.add(cb);
  timer ??= setInterval(() => listeners.forEach((l) => l()), 1000);
  return () => {
    listeners.delete(cb);
    if (!listeners.size && timer) { clearInterval(timer); timer = null; }
  };
}
const second = () => Math.floor(Date.now() / 1000);

export function VisionCountdown({ target, now }: { target: string; now: number }) {
  const t = useSyncExternalStore(subscribe, second, () => Math.floor(now / 1000));
  const left = Math.max(0, Math.floor(Date.parse(target) / 1000) - t);
  const d = Math.floor(left / 86400);
  const h = Math.floor((left % 86400) / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  const cells: [number, ArForms][] = [[d, DAY], [h, HOUR], [m, MIN], [s, SEC]];
  return (
    <div className="vz-count" role="timer" aria-label={`يبقى ${arCount(d, ["يومٌ واحد", "يومان", "أيام", "يومًا"])}`}>
      {cells.map(([n, f], i) => (
        <span key={i} className="vz-count-cell" aria-hidden>
          <span className="vz-count-n">{n}</span>
          <span className="vz-count-u">{arCounted(n, f)}</span>
        </span>
      ))}
    </div>
  );
}
