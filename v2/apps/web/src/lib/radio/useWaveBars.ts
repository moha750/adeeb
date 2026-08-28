"use client";

import { useCallback, useState } from "react";
import { barsForWidth, downsample, normalizePeaks } from "./peaks";

/**
 * أعمدةُ الموجة **مشتقّةً من عرضها المقيس** — مصدرٌ واحدٌ لكلّ من يرسم موجة
 * (المشغّلُ ومعرضُ الإذاعة)، فلا يفترق المعروضُ عمّا يُشحَن.
 *
 * **والقياسُ بعد الرسم لا قبله**: الخادمُ لا عرضَ عنده، فيُرسَم أوّلًا بأدنى عددٍ
 * (`barsForWidth(0)`) ثمّ يُصحَّح عند أوّل قياسٍ في المتصفّح. وأدنى عددٍ لا أعلاه
 * عمدًا: لو بدأ كثيفًا لرقّ ثمّ غلُظ أمام العين، والعكسُ أهدأ. وارتفاعُ اللوحة
 * ثابتٌ في الورقة فلا يقفز التخطيطُ في الحالين.
 *
 * ولِمَ العددُ لا يبقى رقمًا ثابتًا: `peaks.ts`.
 *
 * **والقممُ تُسوَّى قبل النزول بها**: مستوى التسجيل يختلف بين حلقةٍ وأخرى فترسم
 * إحداهما موجةً والأخرى خيطًا (‏`normalizePeaks`). والتسويةُ **قبل** `downsample`
 * لأنّ المئينَ يُحسَب من كلّ ما قِيس لا ممّا نجا من النزول.
 */
export function useWaveBars(peaks: number[]) {
  const [width, setWidth] = useState(0);

  const ref = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const apply = () => setWidth(el.getBoundingClientRect().width);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, bars: downsample(normalizePeaks(peaks), barsForWidth(width)) };
}
