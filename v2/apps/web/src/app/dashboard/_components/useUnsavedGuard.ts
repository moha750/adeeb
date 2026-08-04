"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * **حارس التغييرات غير المحفوظة** — يعترض المغادرة ما دام في الشاشة تعديلٌ لم يُحفَظ.
 *
 * وله مخرجان لا واحد، لأنّ «المغادرة» بابان مختلفان تقنيًّا:
 *
 * ١) **مغادرة المتصفّح** (إغلاق التبويب · تحديث الصفحة · كتابة عنوانٍ آخر) — يحرسها
 *    `beforeunload`، وحوارُها حوارُ المتصفّح نفسه: لا نصَّ لنا فيه ولا شكل (المتصفّحات
 *    تتجاهل أيّ رسالة مخصّصة منذ سنين). هذا كلّ المتاح هنا، ولا يُصطنَع غيره.
 *
 * ٢) **التنقّل داخل اللوحة** (بندٌ في الشريط الجانبيّ · فتات المسار · أيّ رابط) — و`App Router`
 *    **لا يعرض حدثًا يُلغى**: لا `router.events` ولا اعتراضَ رسميّ، و`beforeunload` لا يُطلَق
 *    أصلًا على تنقّلٍ عميليّ. فيُلتقط **النقر على الرابط في طور الالتقاط** قبل أن يبلغ `Link`،
 *    فيُمنع، ويُحفَظ المقصد ريثما يقرّر صاحبه. فإن مضى دفعناه إليه بأنفسنا (`router.push`).
 *
 * **وما لا يحرسه — صراحةً لا سهوًا:** زرّ **رجوع** المتصفّح. اعتراضُه يلزمه العبث بسجلّ
 * التنقّل (دفعُ حالةٍ وهميّة ثمّ ردُّها) — حيلةٌ تُفسد السجلّ وتنقلب على صاحبها في التنقّل
 * المتشعّب، فتُركت. والشريط اللاصق يبقى قائمًا فيقول إنّ ثمّة تغييرًا.
 *
 * @param dirty هل في الشاشة تعديلٌ لم يُحفَظ؟ (`formState.isDirty` نموذجًا)
 * @returns `pending` المقصدُ المعلّق (أو `null`)، و`leave` يمضي إليه، و`stay` يبقى.
 */
export function useUnsavedGuard(dirty: boolean) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    const onClick = (e: MouseEvent) => {
      // ما ليس نقرةَ تنقّلٍ عاديّة يُترَك لصاحبه: زرّ الفأرة الأوسط/الأيمن، وفتحُ تبويبٍ جديد
      // بـCtrl/⌘ (لا يغادر الصفحة أصلًا)، وما ألغاه غيرُنا سلفًا.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.("a");
      const href = link?.getAttribute("href");
      if (!link || !href) return;
      if (link.target === "_blank" || link.hasAttribute("download")) return;
      // الداخليّ وحده يُعترَض — الخارجيّ مغادرةٌ حقيقيّة يحرسها `beforeunload` أعلاه
      if (!href.startsWith("/")) return;
      if (href === window.location.pathname) return; // رابطٌ إلى الصفحة نفسها لا يغادرها

      e.preventDefault();
      e.stopPropagation();
      setPending(href);
    };
    // **طور الالتقاط**: `Link` يستمع في طور الفقاعة، فلو انتظرناه لكان قد بدأ التنقّل
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [dirty]);

  const leave = useCallback(() => {
    const to = pending;
    setPending(null);
    if (to) router.push(to);
  }, [pending, router]);

  const stay = useCallback(() => setPending(null), []);

  return { pending, leave, stay };
}
