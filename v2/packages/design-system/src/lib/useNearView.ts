"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * «اقترب القسمُ من الشاشة؟» — مرّةً واحدةً ولا يرجع (٢٠٢٦-١٠-٢٨، قياسُ جوّالٍ على 4G، بموافقة المالك).
 *
 * صورُ أقسام الهبوط السفلى (الفعاليّات، الأخبار، أهل الدفّة) خلفيّاتٌ تُكتب في `style`، فكانت تُطلب
 * كلُّها مع الصفحة (~1MB) ولو لم يمرّر الزائر، فتزاحم الصدرَ والكودَ في الثواني الأولى. وبهذا الخطّاف
 * يُكتب رابطُ الصورة حين يقترب القسمُ قبل أن يصله الزائرُ بشاشتين تقريبًا (`margin`)، فتكون قد وصلت
 * حين يبلغه في التمرير العاديّ.
 *
 * وهو غيرُ `useInView`: ذاك يتبع الظهورَ ذهابًا وإيابًا لتشغيل الأشرطة وإيقافها، وهذا يُفتح مرّةً
 * ولا يُغلق، فلا تُسحب صورةٌ ظهرت. ومتصفّحٌ بلا `IntersectionObserver` يُفتح له فورًا.
 */
export function useNearView<T extends HTMLElement>(
  ref: RefObject<T | null>,
  { margin = "200%" }: { margin?: string } = {},
): boolean {
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    if (typeof IntersectionObserver === "undefined") {
      queueMicrotask(() => setNear(true));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: `${margin} 0px ${margin} 0px` },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin, near]);

  return near;
}
