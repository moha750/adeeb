"use client";

import { useEffect, useState } from "react";

/** جمعُ العربيّة: واحدٌ ومثنًّى وقلّةٌ (٣ : ١٠) وكثرة (١١ فأكثر). */
const unit = (n: number, one: string, two: string, few: string, many: string): string =>
  n === 1 ? one : n === 2 ? two : n <= 10 ? `${n} ${few}` : `${n} ${many}`;

/**
 * ما تبقّى من الموعد نصًّا. يُظهر أكبر وحدتين ما دام في الأمر يومٌ أو أكثر، فإذا دخل
 * اليومَ الأخير أضاف الثواني : فالعدّاد يتحرّك حيث الحركة تعني شيئًا.
 */
function remain(ms: number): string {
  if (ms <= 0) return "انتهى الوقت";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const D = unit(d, "يوم واحد", "يومان", "أيّام", "يومًا");
  const H = unit(h, "ساعة واحدة", "ساعتان", "ساعات", "ساعة");
  const M = unit(m, "دقيقة واحدة", "دقيقتان", "دقائق", "دقيقة");
  const S = unit(sec, "ثانية واحدة", "ثانيتان", "ثوانٍ", "ثانية");
  if (d > 0) return h > 0 ? `${D} و${H}` : D;
  if (h > 0) return `${H} و${M} و${S}`;
  if (m > 0) return `${M} و${S}`;
  return S;
}

/**
 * عدّادٌ حيٌّ إلى الموعد — يبدأ بعد الترطيب (فما قبله لا زمنَ للمتصفّح يُقارَن بزمن
 * الخادم)، ويدقّ كلّ ثانية. الموعدُ لحظةٌ مطلقة، فلا فرقَ بين ساعةِ جهازٍ وأخرى.
 */
export function Countdown({ iso }: { iso: string }) {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const end = new Date(iso).getTime();
    if (Number.isNaN(end)) return;
    const tick = () => setLeft(end - Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [iso]);

  if (left === null) return null;
  return <span className="opp-count">{left <= 0 ? "انتهى الوقت" : `يتبقّى ${remain(left)}`}</span>;
}
