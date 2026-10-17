"use client";

import { useNow } from "./EventStrip";
import { clock } from "./hall";

/**
 * **عدّادُ صفحة المسابقة** — شريطُ «الحدث الجاري» نفسُه بلا رابط (هو في صفحتها): «قريبًا» وتبدأ بعد،
 * و«مباشر» وتنتهي بعد، و«انتهت» بلا عدّاد. ولا يُرسم الطورُ في الخادم (لا ساعة هناك).
 */
export function ContestClock({ startsAt, endsAt, tone }: { startsAt: number; endsAt: number; tone: string }) {
  const now = useNow();
  const over = now != null && now >= endsAt;
  const before = now != null && now < startsAt;
  const left = now == null || over ? null : (before ? startsAt : endsAt) - now;
  return (
    <div className="agm-event" data-tone={tone}>
      <span className="agm-event-live">{now == null ? " " : over ? "انتهت" : before ? "قريبًا" : "مباشر"}</span>
      {over ? null : (
        <span className="agm-event-clock">
          <span>{now == null ? " " : before ? "تبدأ بعد" : "تنتهي بعد"}</span>
          <b dir="ltr">{clock(left)}</b>
        </span>
      )}
    </div>
  );
}
