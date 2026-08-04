"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * **متابعُ الحالة** — يجعل الصفحتين تريان شيئًا واحدًا: تختم في صفحة المسح فيتحرّك
 * العدّاد في صفحة المعاينة بلا تحديث، والعكس.
 *
 * **مصدرُ الحقيقة واحدٌ هنا**: لا تُمسك الصفحةُ حالةً موازيةً إلى جانب هذه، وإلّا افترقتا
 * فصار على الشاشة رقمان لبطاقةٍ واحدة.
 *
 * **والأحدثُ يفوز** (`updatedAt`): الصفحةُ تُقدّم فعلَ صاحبها فورًا قبل أن يردّ الخادم
 * (تفاؤلًا، فلا تُنتظَر الشبكة عند ضغطة)، وقد يجيء جوابُ سؤالٍ سابقٍ بعده حاملًا حالةً
 * أقدم — فيُهمَل. ولذلك يُختَم كلُّ ما نعرفه بزمنه.
 *
 * **ولا يسأل وهو مخفيّ**: التبويبةُ في الخلفيّة لا يراها أحد، فالسؤالُ عنها استدعاءُ
 * دالّةٍ بلا مُشاهد. ويُسأل فورَ العودة إليها كي لا يرى العائدُ رقمًا متقادمًا.
 */

export type LiveCard = { stamps: number; cycles: number; updatedAt: string };

/** كلّ كم يُسأل الخادم وهو ظاهر — ثلاثُ ثوانٍ: أسرعُ من انتباه العين، وأرخصُ من التدفّق. */
const EVERY_MS = 3000;

export function useLiveCards(initial: Record<string, LiveCard>) {
  const [cards, setCards] = useState(initial);

  /**
   * الدمج: لا يُقبَل صفٌّ إلّا إن كان **أحدثَ** ممّا عندنا. ويُستعمَل للجوابين معًا —
   * جوابِ المتابعة وجوابِ فعلِ المستخدم — فلا قاعدتان للأولويّة.
   */
  const merge = useCallback((incoming: Record<string, LiveCard>) => {
    setCards((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const [serial, card] of Object.entries(incoming)) {
        const have = prev[serial];
        if (have && !(card.updatedAt > have.updatedAt)) continue;
        next[serial] = card;
        changed = true;
      }
      // مرجعٌ جديدٌ بلا تغييرٍ يُعيد رسم الشجرة كلَّ ثلاثِ ثوانٍ بلا سبب
      return changed ? next : prev;
    });
  }, []);

  // `merge` مرجعٌ ثابت (`useCallback` بلا تبعيّات)، فالأثرُ أدناه يُجدوَل **مرّةً واحدة**
  // ولا تُقطع دورةُ السؤال عند كلّ رسم. ولذلك لا يلزم مرجعٌ يُمسكها.
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const ask = async () => {
      if (!alive) return;
      if (document.visibilityState === "visible") {
        try {
          const res = await fetch("/wallet-preview/state", { cache: "no-store" });
          if (res.ok) {
            const body = (await res.json()) as { cards: Record<string, LiveCard> };
            if (alive) merge(body.cards);
          }
        } catch {
          /* انقطاعٌ عابر — السؤالُ التالي يُصلحه، ولا رسالةَ خطأٍ على شاشةِ عرض */
        }
      }
      // تُجدوَل بعد الانتهاء لا على فترةٍ ثابتة: جوابٌ بطيءٌ لا يُكدّس أسئلةً فوقه
      if (alive) timer = setTimeout(ask, EVERY_MS);
    };

    /** العائدُ إلى التبويبة يرى الحاضر لا ما تركه. */
    const onVisible = () => {
      if (document.visibilityState === "visible") void ask();
    };

    timer = setTimeout(ask, EVERY_MS);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      alive = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [merge]);

  return { cards, merge };
}
