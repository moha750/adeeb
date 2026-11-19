"use client";

/**
 * **الحدُّ المقطّع — قطعةٌ واحدةٌ في الهويّة** (`DashEdge`، ٢٠٢٦-١١-١٩؛ محمد: «عدد الشرطات أو التقطيع… المفروض يكون يعمّم على الهويّة»).
 * وُلد في منطقة الإفلات (`AdUpload`، ٢٠٢٦-١١-١٣: «الحدّ مقسّم أو كذا مقطع») ثمّ خرج منها لسطر الغياب (`AdLineVoid`)، فلا يُرسم حدٌّ
 * متقطّعٌ في الموقع إلّا به: **مقاطعُ 12 وفراغاتُ 8** مستديرةُ الأطراف، بعرض 1.5، داخلَ الحدّ لا نصفُه خارجه.
 * - **رسمٌ لا `border: dashed`**: نقاطُ المتصفّح قصيرةٌ متلاصقةٌ لا يُتحكّم في طولها ولا في أطرافها، فتبدو خطًّا مهزوزًا.
 * - **والمقاطعُ تتمّ الدورةَ بلا كسر**: طولُ الحدّ لا يكون عددًا صحيحًا من «مقطعٍ وفراغ» (20px)، فيلتحم في أوّل الرسم بقيّةُ مقطعٍ بأوّل مقطع
 *   (ويقفز موضعُه حين يمشي في الإفلات). فيُقاس الطولُ ويُقسَم على أقرب عددٍ صحيح، وتُكتب النسبةُ نفسُها (ثلاثةُ أخماسٍ مقطع).
 * - **لونُه من حاويه** (`--dz-edge`): فولاذيٌّ حيث يُفعل شيء (الإفلات)، ومحايدٌ حيث لا يُفعل (الغياب).
 * يُوضع أوّلَ حاويه، والحاوي `position: relative` بزاويةِ الأداة (`--ad-r-ctl`).
 */
import { useEffect, useRef } from "react";

export function DashEdge() {
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const el = svg.current;
    const rect = el?.querySelector("rect");
    if (!el || !rect || typeof ResizeObserver === "undefined") return;
    const fit = () => {
      // المستطيلُ غيرُ المرسوم (يُنزع حاويه أو يُخفى) يرمي خطأً بدل الطول، فيُترك
      let len = 0;
      try { len = rect.isConnected ? rect.getTotalLength() : 0; } catch { len = 0; }
      if (!len) return;
      const step = len / Math.max(1, Math.round(len / 20));
      el.style.setProperty("--dz-dash", `${(step * 0.6).toFixed(2)}px`);
      el.style.setProperty("--dz-gap", `${(step * 0.4).toFixed(2)}px`);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // سماتُ المستطيل احتياطٌ لمتصفّحٍ لا يقرأ هندستَه من CSS (كان بلا سمات، فيختفي الحدُّ عنده بلا بديل)
  return <svg ref={svg} className="ad-dash" aria-hidden focusable="false"><rect width="100%" height="100%" rx="16" /></svg>;
}
