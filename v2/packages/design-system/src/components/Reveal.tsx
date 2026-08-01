"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * ظهور انسيابي عند دخول العنصر للشاشة (scroll reveal).
 * الأنماط في globals عبر `.js [data-reveal]` — فبلا JS يبقى المحتوى ظاهرًا.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // بعد انتهاء الظهور تُرفع `will-change` بصنف `is-settled`. تركُها دائمةً يحجز
    // للعنصر طبقةَ تركيبٍ لا تُطفأ أبدًا، فتتراكم طبقةٌ لكلّ قسم ويثقل كلّ إعادة
    // تخطيطٍ بعدها (فتحُ أكورديون مثلًا). القاعدة: تُوضع قبل الحركة وتُرفع بعدها.
    // `transitionend` يصعد من الأبناء (زرٌّ يُمرَّر عليه مثلًا)، فنتحقّق من الهدف —
    // وإلا رُفعت `will-change` قبل أن تبدأ حركةُ القسم أصلًا.
    const settle = (e: TransitionEvent) => {
      if (e.target !== el) return;
      el.classList.add("is-settled");
      el.removeEventListener("transitionend", settle);
    };
    el.addEventListener("transitionend", settle);

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            el.classList.add("is-visible");
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      el.removeEventListener("transitionend", settle);
    };
  }, []);

  return (
    <div
      ref={ref}
      data-reveal=""
      className={className}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
