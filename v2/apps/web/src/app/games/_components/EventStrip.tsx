"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ArrowLeft } from "@/app/_components/glyphs";
import { clock } from "./hall";
import type { HubEvent } from "./Hub";

/**
 * **ساعةٌ تدقّ كلَّ ثانية، ولا وجودَ لها في الخادم** — كانت في `darbak-khadar/_components/bits`
 * فحُذفت منه بعد المسابقة (8805434)، وهذا الشريطُ وحده يحتاجها الآن فسكنت معه.
 */
function tick(cb: () => void) {
  const t = setInterval(cb, 1000);
  return () => clearInterval(t);
}
const nowSec = () => Math.floor(Date.now() / 1000) * 1000;
const noClock = () => null;
function useNow(): number | null {
  return useSyncExternalStore(tick, nowSec, noClock);
}

/**
 * **شريطُ «الحدث الجاري»** — تحت رأس الصالة، لأنّ المسابقةَ أقوى ما يجذب الزائرَ ما دامت قائمة:
 * عنوانُها وجوائزُها وعدّادُها، والشريطُ كلُّه بابٌ إلى تفاصيلها في صفحة لعبتها.
 *
 * **مضغوطٌ عمدًا:** كان في الجوّال شاشةً كاملة (شريحةٌ لكلّ جائزة وعدّادٌ كبيرٌ وزرّ) فدفع الشعارَ
 * تحت الطيّة. فصار ثلاثةَ أسطر: «مباشر» والعدّاد، ثمّ العنوان، ثمّ الجوائز جملةً واحدة.
 *
 * **يظهر وحدَه ويغيب وحدَه:** الخادمُ لا يمرّره إلّا لمسابقةٍ لم تنتهِ، والجهازُ يُخفيه لحظةَ ينتهي
 * العدّادُ والصفحةُ مفتوحة. وقبل الافتتاح «قريبًا» و«تبدأ بعد». والعدّادُ لا يُرسم في الخادم أصلًا
 * (`useNow` يعطي `null` هناك)، فلا يختلف الترطيب.
 */
export function EventStrip({ event }: { event: HubEvent }) {
  const now = useNow();
  if (now != null && now >= event.endsAt) return null;
  const before = now != null && now < event.startsAt;
  const left = now == null ? null : (before ? event.startsAt : event.endsAt) - now;

  return (
    <Link href={event.href} className="agm-event" data-tone={event.tone} aria-label={`${event.title}: التفاصيل`}>
      <span className="agm-event-live">{before ? "قريبًا" : "مباشر"}</span>
      <span className="agm-event-clock">
        <span>{before ? "تبدأ بعد" : "تنتهي بعد"}</span>
        <b dir="ltr">{clock(left)}</b>
      </span>
      <span className="agm-event-title">
        <span>{event.title}</span>
        <ArrowLeft aria-hidden />
      </span>
      <span className="agm-event-note">{event.note}</span>
    </Link>
  );
}
