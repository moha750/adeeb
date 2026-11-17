"use client";

import { useLayoutEffect } from "react";
import { useSearchParams } from "next/navigation";
import { applyThemePref, isThemePref, storedThemePref } from "@/lib/theme";

/**
 * وضعُ المعاينة من الرابط (`?theme=dark|system`) — مؤقّت، يُحذف مع المختبر (٢٠٢٦-١٠-٣٠).
 * السكربتُ قبل الرسم (`lib/theme.ts`) يكفي عند التحميل؛ وهذا للتنقّل داخل التطبيق: يُنزل وضعَ
 * الرابط على الموقع كلّه، فإذا خرجتَ من المعاينة إلى غرفةٍ لم تنتقل بعد أعاد الموقعَ إلى وضعه.
 */
export function PreviewTheme() {
  const v = useSearchParams().get("theme");
  const pref = isThemePref(v) ? v : null;
  useLayoutEffect(() => {
    applyThemePref(pref ?? storedThemePref());
    return () => {
      applyThemePref(storedThemePref());
    };
  }, [pref]);
  return null;
}
