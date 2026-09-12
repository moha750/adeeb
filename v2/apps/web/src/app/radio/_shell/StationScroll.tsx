"use client";

import { useEffect, useState } from "react";

/**
 * **مؤشّرُ تمرير المحطّة: إبرةُ المِوالف** — اختاره المالك من ثلاثةٍ عُرضت
 * (٢٠٢٦-٠٩-٠٧): سكّةٌ عليها علاماتُ تردُّدٍ متساوية، وإبرةٌ تجري عليها.
 *
 * ══ ولِمَ مرسومٌ لا مُنمَّق ══
 * جُرّب تنميقُ شريط المتصفّح جولتين، وقِيس العرضُ الفعليُّ
 * بـ`offsetWidth − clientWidth` فإذا هو **صفر**: ماك يستعمل أشرطةً عائمة،
 * وهي تتجاهل `::-webkit-scrollbar` كلَّه. فلا يصل إلى الشاشة إلّا لونٌ وسُمك،
 * وبهما لا يُرسَم شكل. فيُخفى الأصليُّ ويُرسَم مؤشّرُنا مكانَه.
 *
 * ══ وما يُدفَع ثمنًا ══
 * من كان يسحب شريطَ المتصفّح بالفأرة يفقده هنا: مؤشّرُنا **خبرٌ يُقرأ لا أداةٌ
 * تُسحَب** (‏`aria-hidden`). والتمريرُ نفسُه لم يُمَسّ: العجلةُ واللمسُ ولوحةُ
 * المفاتيح كما هي.
 *
 * ══ ولا يظهر إلّا حيث يُفيد ══
 * صفحةٌ لا تُمرَّر لا تحتاج مؤشّرًا، فيُخفى حتّى يصير للصفحة طولٌ يُقاس.
 */
export function StationScroll() {
  const [p, setP] = useState(0);
  const [on, setOn] = useState(false);

  useEffect(() => {
    /* القراءةُ في `scroll` و`resize` وحدَهما: لا مؤقّتَ ولا مراقبَ إطارات.
       والمقامُ يُحرَس من الصفر، فصفحةٌ لا تُمرَّر تُعطي `NaN`. */
    const read = () => {
      const span = document.documentElement.scrollHeight - window.innerHeight;
      setOn(span > 120);
      setP(span > 0 ? Math.min(1, window.scrollY / span) : 0);
    };
    read();
    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    return () => {
      window.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
    };
  }, []);

  if (!on) return null;

  return (
    <span className="sbi sbi-fixed" style={{ "--p": p } as React.CSSProperties} aria-hidden>
      <span className="sbi-rail" />
      <span className="sbi-thumb" />
    </span>
  );
}
