"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * «لا حركةَ تلقائيّةً إلّا والقسمُ في الشاشة» — مصدرٌ واحد لكلّ شريطٍ يمشي وحده
 * (جدارُ الأعمال · كاروسيل أهل الدفّة · الفعاليّات · الأخبار). بدونه تنطلق الأشرطة
 * لحظةَ تحميل الصفحة، فيصل الزائرُ إلى مشهدٍ في منتصفه: بطاقةٌ رابعةٌ لا أولى.
 *
 * العتبتان متعمّدتان: يُشغَّل حين يظهر خُمسُ العنصر تقريبًا، ولا يقف إلّا عند الخروج
 * التامّ (نسبةُ تقاطعٍ صفر)، فلا يتجمّد شريطٌ وشيءٌ منه في الشاشة.
 */
export function useInView<T extends HTMLElement>(
  ref: RefObject<T | null>,
  { start = 0.15 }: { start?: number } = {},
): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.intersectionRatio >= start) setInView(true);
          else if (e.intersectionRatio === 0) setInView(false);
        }
      },
      { threshold: [0, start] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, start]);

  return inView;
}
