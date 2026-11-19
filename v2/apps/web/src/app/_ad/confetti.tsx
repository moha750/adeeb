"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { confetti } from "@/lib/confetti";

/** ألوانُ القصاصات رموزٌ من الهويّة (`.ad-confetti` في `ad.css`)، فلا يُكتب لونٌ هنا */
const TOKENS = ["--cf-1", "--cf-2", "--cf-3", "--cf-4", "--cf-5"];
const noop = () => () => {};

/**
 * **قصاصاتُ الفرح** (محمد ٢٠٢٦-١١-١٩: «الخرابيش اللي تنفقع» للفائز): لوحةٌ تغطّي الشاشة فوق النافذة ولا تُنقَر، تنطلق مرّةً حين
 * `on` وتنطفئ وحدَها. ومن طلب في جهازه تقليلَ الحركة لا يراها.
 */
export function AdConfetti({ on }: { on: boolean }) {
  const cv = useRef<HTMLCanvasElement>(null);
  // اللوحةُ بوّابةٌ إلى `body` فلا تُرسم في الخادم: تُرسم بعد الترطيب وحده، وإلّا اختلف الرسمان (كان: «Hydration failed»)
  const client = useSyncExternalStore(noop, () => true, () => false);
  useEffect(() => {
    if (!on || !client || !cv.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // أبطأ من اللعبة (محمد ٢٠٢٦-١١-١٩: «الشخص سينصدم، فيحتاج قليلًا يستوعب ليأخذ صورة»): نحو عشر ثوانٍ، وأكثفُ
    // منها لأنّ البطءَ يفرّق القصاصاتَ على زمنٍ أطول فتبدو أقلّ
    return confetti(cv.current, TOKENS, { end: 6, pace: 0.6, density: 1.8 });
  }, [on, client]);
  if (!on || !client) return null;
  return createPortal(<canvas ref={cv} className="ad-confetti" aria-hidden="true" />, document.body);
}
