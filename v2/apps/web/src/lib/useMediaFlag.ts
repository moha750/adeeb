"use client";

import { useSyncExternalStore } from "react";

/**
 * **ما يقوله المتصفّحُ عن نفسه: سؤالٌ واحدٌ يُسمَع ولا يُقرأ مرّةً ثمّ يُنسى.**
 *
 * ══ العلّة ══
 * كانت هذه الأسئلةُ تُقرأ بـ`matchMedia(...).matches` داخل أثرٍ عند التركيب، فما
 * قُرئ بقي على حاله إلى أن يُعاد تركيبُ المكوّن. فمن أعلن «قلِّل الحركة» وهو في
 * الصفحة بقيت الحركةُ تجري عنده، ومن وصل فأرةً بجهازٍ لمسيٍّ لم ينل ما يُبذَل
 * للمؤشّر الدقيق. وهو عطلٌ صامت: لا يظهر في بناءٍ ولا في اختبار.
 *
 * ══ والصيغةُ كانت قائمةً في مكوّنٍ واحد ══
 * `BoardCarousel` وحدَه كان يشترك في التغيّر اشتراكًا صحيحًا بـ`useSyncExternalStore`،
 * وأربعةٌ غيرُه يقرؤون قراءةً واحدة. فرُفعت صيغتُه إلى ههنا مصدرًا واحدًا (٢٠٢٦-٠٩-٢٤).
 *
 * ══ ودقيقتان في التنفيذ ══
 * • **الاشتراكُ مخزَّنٌ بالسؤال**: `useSyncExternalStore` يعيد الاشتراكَ كلَّما تبدّل
 *   مرجعُ دالّته، فدالّةٌ تُنشَأ في كلّ رسمٍ تفكّ وتربط في كلّ رسم.
 * • **ولقطةُ الخادم افتراضٌ صريحٌ لا كذب**: الخادمُ لا يعرف جهازَ الزائر، فيُفترَض
 *   الأشيعُ (‏`false`: لا تقليلَ للحركة، ولا سؤالَ محسوم)، ثمّ يُصحَّح بعد الترطيب.
 */

export const REDUCE_MOTION = "(prefers-reduced-motion: reduce)";
export const FINE_POINTER = "(pointer: fine)";
export const COARSE_POINTER = "(pointer: coarse)";

const subs = new Map<string, (cb: () => void) => () => void>();

function subscriberFor(query: string) {
  let s = subs.get(query);
  if (!s) {
    s = (cb: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    };
    subs.set(query, s);
  }
  return s;
}

/** يُرجِع حالَ الاستعلام الآن، ويُعيد الرسمَ متى تبدّل. */
export function useMediaFlag(query: string, onServer = false): boolean {
  return useSyncExternalStore(
    subscriberFor(query),
    () => window.matchMedia(query).matches,
    () => onServer,
  );
}
