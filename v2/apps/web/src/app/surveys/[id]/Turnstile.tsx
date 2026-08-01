"use client";

// درع Turnstile — تحقّقٌ خفيّ (Managed) يُنتج «رمزًا» يتحقّق منه الخادم قبل قبول الإرسال.
// عرضٌ صريح (explicit) كي نمسك دورة حياة الرمز: نجاح/انتهاء/خطأ، وإعادةُ ضبطٍ بعد محاولةٍ فاشلة (الرمز يُستهلك مرّة).
import { useEffect, useRef } from "react";

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
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    let cancelled = false;
    let poll = 0;

    const render = () => {
      if (cancelled || widgetIdRef.current || !containerRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(null),
        "error-callback": () => onTokenRef.current(null),
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

    return () => { cancelled = true; window.clearInterval(poll); };
  }, [siteKey]);

  // إعادة الضبط بعد فشلٍ — رمزٌ جديد للمحاولة التالية
  useEffect(() => {
    if (resetSignal > 0 && widgetIdRef.current && window.turnstile) {
      onTokenRef.current(null);
      window.turnstile.reset(widgetIdRef.current);
    }
  }, [resetSignal]);

  return <div ref={containerRef} className="flex justify-center" />;
}
