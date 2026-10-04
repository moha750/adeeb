"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

/** فجوةُ الشبكة بين الكرتين المتراصّين، وهي فجوةُ `.card-grid` نفسُها (١٨). */
const GAP = 18;

/**
 * **شبكةُ عمودين بلا فراغ — كلُّ عمودٍ ينساب وحدَه** (٢٠٢٦-١٠-٠٣، سؤالُ المالك عن الفراغ تحت كرتٍ قصيرٍ بجوار طويل).
 *
 * كان كرتُ الفرصة في غرفة الشهادات بطول سطوره (`card-grid-top`)، فإذا جاور كرتٌ بستّة متطوّعين كرتًا باثنين
 * انفتح تحت القصير فراغٌ بطول الفرق، لأنّ الصفَّ التالي لا يبدأ إلّا بعد أطولِ كرتَي الصفّ. والتساوي يردّ الفراغَ
 * **داخل** القصير فهو أسوأ. فالحلُّ أن يبدأ الكرتُ التالي تحت أقصرِ العمودين (masonry).
 *
 * **مقيسٌ لا مظنون**: شبكةٌ بأسطرٍ من بكسلٍ واحد، وكلُّ كرتٍ يمتدّ أسطرًا بقدر طوله المقيس + الفجوة، فيضعه
 * التدفّقُ الآليّ في أوّل موضعٍ يسعه — وهو تحت أقصر العمودين، **وترتيبُ الشجرة باقٍ** (يُقرأ ويُتنقَّل بين الكروت
 * على ترتيبها). ويُعاد القياسُ كلّما تغيّر طولُ كرت (سطرٌ يغادر بإصداره، خطٌّ يُحمَّل، الشاشةُ تضيق).
 * وقبل أوّل قياسٍ (التصيير في الخادم) هي شبكةُ الكروت المعتادة، فلا يتراكب شيء.
 *
 * والـ`masonry` الأصيلُ في CSS لم يستقرّ في المتصفّحات بعد؛ متى استقرّ حلّ محلَّ هذا القياس.
 */
export function MasonryGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  // بلا تبعيّات عمدًا: يُعاد ربطُ الرقيب مع كلّ تصييرٍ فيشمل الكروتَ التي دخلت أو خرجت
  useLayoutEffect(() => {
    const grid = ref.current;
    if (!grid) return;
    const lay = () => {
      const cards = Array.from(grid.children) as HTMLElement[];
      // القراءاتُ كلُّها قبل الكتابات: لا يُعاد حسابُ التخطيط بين كرتٍ وكرت
      const spans = cards.map((el) => Math.max(1, Math.ceil(el.getBoundingClientRect().height) + GAP));
      cards.forEach((el, i) => { el.style.gridRowEnd = `span ${spans[i]}`; });
      grid.dataset.masonry = "on";
    };
    lay();
    const ro = new ResizeObserver(lay);
    for (const el of Array.from(grid.children)) ro.observe(el);
    return () => ro.disconnect();
  });

  return (
    <div ref={ref} className={`card-grid card-grid-2col card-grid-top card-masonry ${className}`.trim()}>
      {children}
    </div>
  );
}
