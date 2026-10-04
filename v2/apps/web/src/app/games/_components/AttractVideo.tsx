"use client";

import { useEffect, useRef } from "react";

/**
 * **شاشةُ الكابينة** — مقطعُ لعبٍ صامتٌ يتكرّر، كما تفعل آلاتُ الأركيد وهي تنتظر لاعبًا
 * (attract mode). هو ما يجعل الصالةَ حيّة، ويُري الزائرَ اللعبةَ قبل أن يضغط.
 *
 * **لا يعمل إلّا حين يُرى:** يبدأ إذا ظهر ربعُه في الشاشة ويقف إذا غاب، فلا تستهلك كابينةٌ
 * خارج النظر بطاريّةَ الجوّال. **ولا يتحرّك لمن طلب تقليلَ الحركة:** تبقى الصورةُ الثابتة.
 * ولذلك لا `autoPlay`: التشغيلُ قرارُ هذا المكوّن وحدَه. وهو زخرفة (`aria-hidden`): اسمُ اللعبة
 * في لافتة الكابينة، ووصفُها في بطاقتها.
 */
export function AttractVideo({ src, poster }: { src: string; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    let seen = false;
    const sync = () => {
      if (seen && !still.matches) v.play().catch(() => {});
      else v.pause();
    };
    const io = new IntersectionObserver(
      ([e]) => {
        seen = e.isIntersecting;
        sync();
      },
      { threshold: 0.25 }
    );
    io.observe(v);
    still.addEventListener("change", sync);
    return () => {
      io.disconnect();
      still.removeEventListener("change", sync);
    };
  }, []);

  return (
    <video ref={ref} src={src} poster={poster} muted loop playsInline preload="metadata" aria-hidden />
  );
}
