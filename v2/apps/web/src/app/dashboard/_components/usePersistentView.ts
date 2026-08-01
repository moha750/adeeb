import { useEffect, useState } from "react";
import type { ViewMode } from "./Toolbar";

/**
 * نمط العرض (جدول/كروت) محفوظًا في localStorage بمفتاحٍ مستقلٍّ لكلّ تبويب — مصدرٌ واحد
 * تشترك فيه كلّ الجداول ذات مبدّل العرض (بدل نسخ الحالة والمؤثّر في كلّ معرض).
 *
 * القراءة بعد التركيب لا في التهيئة: الخادم لا localStorage لديه، فبدء الحالة من القيمة
 * المخزَّنة يخالف أوّل رسمٍ عميليّ ويكسر الإماهة (hydration). فالبدء «table» على الطرفين ثمّ
 * التصحيح بعد التركيب — وهذا وحده ما يوجب setState داخل المؤثّر هنا (استثناءٌ مقصود موثَّق).
 */
export function usePersistentView(storageKey: string): [ViewMode, (v: ViewMode) => void] {
  const [view, setView] = useState<ViewMode>("table");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- قراءة localStorage آمنة‑الإماهة تلزم ما بعد التركيب (انظر التوثيق أعلاه)
    setView(localStorage.getItem(storageKey) === "cards" ? "cards" : "table");
  }, [storageKey]);
  const changeView = (v: ViewMode) => { setView(v); localStorage.setItem(storageKey, v); };
  return [view, changeView];
}
