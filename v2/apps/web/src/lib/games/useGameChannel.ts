"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * **أوّلُ مشتركِ realtime في V2.**
 *
 * الجداولُ الأربعةُ منشورةٌ على `supabase_realtime` منذ ٢٠٢٦-٠٥-١٠، ولم يكن لها في
 * النسخة الثانية عميلٌ قطّ. وهذا الخطّافُ هو الباب: يفتح قناةً واحدةً للغرفة، ويحوّل
 * كلَّ تبدّلٍ إلى نداءٍ واحدٍ يُعيد القراءة.
 *
 * ## دفعٌ لا سحب، ثمّ سحبٌ تحت الدفع
 * الاشتراكُ هو الأصل: الإجابةُ تصل المضيفَ لحظةَ كتابتها. **وتحته شبكةُ أمان** تُعيد
 * القراءةَ كلَّ ثماني ثوانٍ، لأنّ قاعةً فيها خمسون هاتفًا على واي‑فاي ضعيف تُسقِط
 * مقابسَ ولا تُخبِر. (V1 فعلها وكان محقًّا؛ يُنقَل المبدأُ لا الكود.) وهي أوّلُ سحبٍ
 * دوريٍّ لبياناتٍ في V2 — لا يوجد في المستودع غيرُه — فوُسِم بعلّته هنا.
 *
 * ولا تعمل الشبكةُ إلّا حين **يكون في الغرفة ما يتبدّل** (`live`) و**تكون الصفحةُ
 * مرئيّة**: جوّالٌ في جيبٍ لا يُستجوَب، وغرفةٌ منتهيةٌ لا جديدَ فيها.
 *
 * ## والقراءةُ تُوحَّد في نداءٍ واحد
 * أربعةُ مستمعين على قناةٍ واحدةٍ قد تُطلق أربعةَ أحداثٍ في مِلّي واحدة (بدءُ جولةٍ
 * يُحدّث الغرفةَ والكلمةَ معًا). فتُجمَع في `requestAnimationFrame` واحدة: نداءٌ واحدٌ
 * للخادم بدل أربعة، ورسمٌ واحدٌ بدل أربعة.
 */

export type ChannelWatch = {
  table: "guess_word_sessions" | "guess_word_words" | "guess_word_players" | "guess_word_answers";
  event: "*" | "INSERT" | "UPDATE" | "DELETE";
  /** مرشِّحُ الخادم، مثل `session_id=eq.<id>` — يُقلّل ما يُبَثّ إلينا أصلًا. */
  filter?: string;
};

export type GameChannelOptions = {
  /** اسمُ القناة. يُفرَّق بين المضيف واللاعب كي لا يشتركا في اشتراكٍ واحد. */
  name: string;
  watch: ChannelWatch[];
  /** يُنادى عند كلّ تبدّلٍ وعند كلّ نبضةِ أمان. */
  onChange: () => void;
  /** هل في الغرفة ما يتبدّل الآن؟ حين تكون `false` يسكت السحبُ الدوريّ. */
  live: boolean;
};

/** نبضةُ شبكة الأمان. ثمانٍ: أطولُ من أن تُثقل، وأقصرُ من أن يُلاحَظ الانقطاع. */
const POLL_MS = 8_000;

export function useGameChannel({ name, watch, onChange, live }: GameChannelOptions): void {
  // النداءُ يتبدّل مع كلّ رسم، والاشتراكُ لا يجوز أن يُعاد بناؤه لذلك. فيُمسَك بمرجع.
  // **وتحديثُه في أثرٍ لا في الرسم**: الكتابةُ أثناء الرسم أثرٌ جانبيٌّ يمنعه React
  // (سابقةُ `Turnstile.tsx` بعينها).
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // بصمةُ ما نراقبه: تتبدّل حين تتبدّل نيّةُ المستدعي لا حين يُعاد رسمُه.
  const watchKey = JSON.stringify(watch);

  useEffect(() => {
    const sb = createClient();
    const channel = sb.channel(name);
    let frame = 0;

    const nudge = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        onChangeRef.current();
      });
    };

    for (const w of JSON.parse(watchKey) as ChannelWatch[]) {
      channel.on(
        "postgres_changes",
        { event: w.event, schema: "public", table: w.table, ...(w.filter ? { filter: w.filter } : {}) },
        nudge
      );
    }

    channel.subscribe();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      // `removeChannel` لا `unsubscribe`: الثانيةُ تترك القناةَ في سجلّ العميل، فتتراكم
      // قنواتٌ ميّتةٌ مع كلّ تنقّلٍ بين غرفتين حتى يبلغ الاتّصالُ حدَّه ويصمت.
      void sb.removeChannel(channel);
    };
  }, [name, watchKey]);

  useEffect(() => {
    if (!live) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    const start = () => {
      if (timer) return;
      timer = setInterval(() => onChangeRef.current(), POLL_MS);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        // العودةُ إلى الصفحة تقرأ فورًا: من رفع جوّالَه يريد الحالَ الآن لا بعد ثمانٍ.
        onChangeRef.current();
        start();
      } else {
        stop();
      }
    };

    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [live]);
}
