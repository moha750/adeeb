import { useEffect, useState } from "react";
import type { ViewMode } from "./Toolbar";

/**
 * نمط العرض (جدول/كروت) محفوظًا في localStorage بمفتاحٍ مستقلٍّ لكلّ تبويب — مصدرٌ واحد
 * تشترك فيه كلّ الجداول ذات مبدّل العرض (بدل نسخ الحالة والمؤثّر في كلّ معرض).
 *
 * الافتراضُ كروتٌ في كلّ تبويبٍ وعلى كلّ مقاس: اللوحةُ منتَجُ جوّالٍ قبل أن تكون شاشةً عريضة،
 * والكرتُ هو ما يُقرأ في 375px. ولا يُقرأ الافتراضُ إلّا حين لا قيمةَ محفوظة، فاختيارُ
 * المستخدم يفوز دائمًا على البداية. و`initial` لمن يشذّ عن هذا لا لمن يوافقه.
 *
 * القراءة بعد التركيب لا في التهيئة: الخادم لا localStorage لديه، فبدء الحالة من القيمة
 * المخزَّنة يخالف أوّل رسمٍ عميليّ ويكسر الإماهة (hydration). فالبدء من `initial` على الطرفين
 * ثمّ التصحيح بعد التركيب، وهذا وحده ما يوجب setState داخل المؤثّر هنا (استثناءٌ مقصود موثَّق).
 */
export function usePersistentView(storageKey: string, initial: ViewMode = "cards"): [ViewMode, (v: ViewMode) => void] {
  const [view, setView] = useState<ViewMode>(initial);
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- قراءة localStorage آمنة‑الإماهة تلزم ما بعد التركيب (انظر التوثيق أعلاه)
    setView(saved === "cards" ? "cards" : saved === "table" ? "table" : initial);
  }, [storageKey, initial]);
  const changeView = (v: ViewMode) => { setView(v); localStorage.setItem(storageKey, v); };
  return [view, changeView];
}
