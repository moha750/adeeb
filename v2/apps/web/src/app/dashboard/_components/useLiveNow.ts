"use client";

import { useEffect, useState } from "react";

/**
 * ساعةٌ تنبض **عند لحظات الانتقال المحدّدة فقط** (لا نبضًا دوريًّا) — تُعيد الوقت الحاليّ بعد كلّ لحظةٍ
 * تمرّ، فتُعيد الأصنافُ حسابَ حالاتها المحسوبة زمنيًّا (مثل مجدول→نشط→منتهٍ للاستبيان) **بلا تحديث صفحة**.
 *
 * تبدأ القيمة بـ0 (قبل التركيب وعلى الخادم)، فيرتدّ المستهلك حينها إلى القيم المحسوبة على الخادم
 * (وهي دقيقة لحظة التحميل). ثمّ تُجدَّد عند كلّ لحظة انتقالٍ فيرتدّ إلى الوقت الحقيقيّ ويُعيد الحساب.
 *
 * لينت‑نظيف: `Date.now`/`setState` كلاهما داخل المؤقّت (بعد الرندر) لا في جسم الرندر ولا مباشرةً في التأثير.
 * يتطلّب `times` مستقرًّا (يُمرَّر من `useMemo` عند المستهلك) وإلّا أُعيد التسليح كلّ رندر.
 */
export function useLiveNow(times: number[]): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      const t = Date.now();
      const next = times.filter((x) => x > t).sort((a, b) => a - b)[0];
      if (next == null) return; // لا انتقال قادمًا — يبقى على قيم الخادم حتى يتغيّر المدخل
      timer = setTimeout(() => { setNow(Date.now()); arm(); }, next - t + 500);
    };
    arm();
    return () => clearTimeout(timer);
  }, [times]);
  return now;
}
