"use client";

import { useEffect, useRef } from "react";

/**
 * خيطُ القراءة — شريطٌ رفيعٌ في أعلى الصفحة يقول كم بقي من الخبر.
 *
 * **لا نسبةَ ولا رقم:** القارئُ لا يريد أن يعرف أنّه في الواحد والستّين بالمئة، يريد
 * أن يحسّ أنّ النهايةَ قريبة. وأخبارُنا بين دقيقةٍ وأربعِ دقائق، فالخيطُ إشارةُ
 * طمأنينةٍ لا مقياس.
 *
 * **ولا `state` في الرسم:** التمريرُ يُطلق عشراتِ الأحداث في الثانية، وإعادةُ رسم
 * React مع كلِّ واحدٍ منها تُثقل صفحةً فيها صورٌ وعارض. فيُكتَب `transform` على العنصر
 * رأسًا داخل `requestAnimationFrame` — الشريطُ خطٌّ لا محتوى، فلا شيءَ ليُعاد رسمُه.
 *
 * ⚠️ يُوضَع **خارج** `.art`: تلك حاويةُ استعلامٍ (`container-type`)، وكلُّ `fixed`
 * داخلها يُنسَب إليها لا إلى الشاشة.
 */
export function ReadingProgress({ targetId }: { targetId: string }) {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = document.getElementById(targetId);
    const line = bar.current;
    if (!el || !line) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const box = el.getBoundingClientRect();
      const run = box.height - window.innerHeight;
      // مقالٌ أقصرُ من الشاشة لا يُقرأ تمريرًا، فلا خيطَ له.
      if (run <= 0) {
        line.style.transform = "scaleX(0)";
        return;
      }
      const done = Math.min(1, Math.max(0, -box.top / run));
      line.style.transform = `scaleX(${done})`;
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [targetId]);

  // القيمةُ الابتدائيّة في الصنف لا في الوسم: لا تنسيقَ شاردًا ولو كان صفرًا (ق١).
  return <div ref={bar} className="art-read" aria-hidden />;
}
