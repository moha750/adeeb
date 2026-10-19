"use client";

// درع Turnstile — تحقّقٌ خفيّ (Managed) يُنتج «رمزًا» لا يُقبل الإرسالُ بغيره.
// عرضٌ صريح (explicit) كي نمسك دورة حياة الرمز: نجاح/انتهاء/خطأ، وإعادةُ ضبطٍ بعد محاولةٍ فاشلة (الرمز يُستهلك مرّة).
//
// **ومن يتحقّق من الرمز يختلف بالباب** — وهذا سببُ سكناه ههنا لا في شاشةٍ بعينها:
//   • الاستبيان: **فعلٌ خادميّ لنا** يسأل Cloudflare بنفسه (`s/[code]/actions.ts`).
//   • أبوابُ المصادقة (دخول · استعادة · رمزُ الحجز): **GoTrue** يسأل Cloudflare بنفسه، فيُمرَّر
//     الرمزُ إليه في `options.captchaToken` ولا نتحقّق منه نحن. وحمايتُه أصدق: الحارسُ عند
//     الطرَف نفسِه، فلا يُلتَفّ عليه بنداءٍ مباشرٍ بالمفتاح العلنيّ.
import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function TurnstileWidget({
  siteKey,
  onToken,
  resetSignal = 0,
}: {
  siteKey: string;
  onToken: (token: string | null) => void;
  /** يتغيّر (يتزايد) بعد محاولةٍ فاشلة فيُعاد ضبط الودجة لرمزٍ جديد. */
  resetSignal?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  // هل التحدّي معروضٌ الآن؟ (في `interaction-only` الجوابُ «لا» عند عامّة الزوّار)
  const [shown, setShown] = useState(false);
  const onTokenRef = useRef(onToken);
  // تحديثُ المرجع **في أثر** لا في الرسم: الكتابةُ أثناء الرسم أثرٌ جانبيّ يمنعه React.
  // وموضعُه قبل أثر التركيب مقصود — الآثارُ تجري بترتيبها، فيصل النداءُ محدَّثًا قبل أن يُركَّب.
  useEffect(() => { onTokenRef.current = onToken; });

  useEffect(() => {
    let cancelled = false;
    let poll = 0;

    const render = () => {
      if (cancelled || widgetIdRef.current || !containerRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        // **الصندوق لا يُصبَغ** — جوفُه إطارٌ من كلاودفلير (cross-origin) لا تبلغه أوراقُنا.
        // فالمتاحُ ثلاثةُ مقابضَ لا رابع، وهذه ضبطُها كي لا يشذَّ عن الصفحة:
        //   • `interaction-only`: لا يظهر أصلًا إلّا حين يُطلب تحدٍّ حقيقيّ (والرمزُ يجري خفيةً في العادة).
        //   • `light`: الافتراضُ `auto` يتبع نظامَ الجهاز، فيرى صاحبُ الوضع الداكن صندوقًا أسودَ في صفحةٍ فاتحة.
        //   • `ar-eg`: هكذا تُسمّى العربيّةُ في قائمة كلاودفلير (`ar` وحدها لا تُطابَق).
        appearance: "interaction-only",
        theme: "light",
        language: "ar-eg",
        callback: (token: string) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(null),
        "error-callback": () => onTokenRef.current(null),
        // ظهورُ التحدّي واختفاؤه: نرفع الوسمَ فيأخذ الغلافُ حيّزَه، وننزعه فيعود إلى العدم بلا فجوة
        "before-interactive-callback": () => setShown(true),
        "after-interactive-callback": () => setShown(false),
      });
    };

    if (window.turnstile) {
      render();
    } else {
      if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
        const script = document.createElement("script");
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      // ننتظر تحميل السكربت (بحدٍّ زمنيّ كي لا نعلّق للأبد لو حُجب)
      poll = window.setInterval(() => {
        if (window.turnstile) { window.clearInterval(poll); render(); }
      }, 200);
      window.setTimeout(() => window.clearInterval(poll), 15000);
    }

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      // تُزال الودجةُ مع صاحبها: ودجةٌ يتيمةٌ (حاويتُها هُدمت) تبقى في سجلّ كلاودفلير وتشوّش التالية
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* هُدمت قبلنا */ }
      }
      widgetIdRef.current = null;
    };
  }, [siteKey]);

  // إعادة الضبط بعد فشلٍ — رمزٌ جديد للمحاولة التالية
  useEffect(() => {
    if (resetSignal > 0 && widgetIdRef.current && window.turnstile) {
      onTokenRef.current(null);
      // نطويه مع الضبط: لو حُلّ التالي خفيةً لم يأتِ `after-interactive` فيبقى غلافٌ فارغٌ حافرًا
      setShown(false);
      window.turnstile.reset(widgetIdRef.current);
    }
  }, [resetSignal]);

  // كلاودفلير تُبقي للودجة صندوقًا بمقاسه (300×72) وإن لم تَرسم فيه شيئًا، فيَحفِر في النموذج
  // فجوةً بلا ساكن. فنطويه نحن ما دام خفيًّا، ونبسطه حين يُنادى بالتحدّي.
  return <div ref={containerRef} className={shown ? "flex justify-center" : "hidden"} />;
}

/**
 * **انتظارُ الرمز قبل الإرسال** (٢٠٢٦-١٠-١٧).
 *
 * الودجةُ خفيّةٌ (`interaction-only`) وتحتاج لحظةً بعد رسم الصفحة كي تُخرج رمزها، وتحتاج
 * لحظةً أخرى بعد كلّ إعادة ضبط. فمن ضغط الزرّ في تلك اللحظة خرج طلبُه **بلا رمز** فردّه
 * GoTrue بـ`captcha_failed` — وقع هذا فعلًا على طلب استعادةٍ حيّ (السجلّ، ٢٠٢٦-١٠-١٧ ٠٩:١٦Z).
 *
 * ولم يُعطَّل الزرُّ حتى يجيء الرمز: زرٌّ معطّلٌ بلا سببٍ ظاهرٍ يقول «غير متاح» وهو متاح،
 * ولو حُجب سكربتُ كلاودفلير لبقي معطّلًا أبدًا بلا كلمة. فالزرُّ يُضغط، ويدور، وينتظر الرمزَ
 * ثوانيَ معدودة؛ فإن جاء مضى الطلب، وإلّا قيل للمستخدم ما جرى بدل خطأٍ مبهم.
 *
 * يُرجع الرمز، أو `undefined` حين لا درعَ أصلًا (لا مفتاحَ للموقع) أو انقضت المهلة.
 */
export function useTurnstileWait(token: string | null, enabled: boolean) {
  const ref = useRef(token);
  useEffect(() => { ref.current = token; }, [token]);
  return useCallback(
    async (ms = 8000): Promise<string | undefined> => {
      if (!enabled) return undefined;
      const until = Date.now() + ms;
      while (!ref.current && Date.now() < until) await new Promise((r) => setTimeout(r, 150));
      return ref.current ?? undefined;
    },
    [enabled],
  );
}
