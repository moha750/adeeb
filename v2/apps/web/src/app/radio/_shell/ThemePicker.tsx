"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { cn } from "@adeeb/design-system";
import { applyTheme, currentChoice, setChoice, subscribeTheme, type ThemeChoice } from "./theme";

const CHOICES: ReadonlyArray<{ value: ThemeChoice; label: string }> = [
  { value: "light", label: "نهاري" },
  { value: "dark", label: "داكن" },
  { value: "system", label: "حسب الجهاز" },
];

/**
 * **محدِّدُ الوضع** — نهاريٌّ أو داكنٌ أو حسب الجهاز (أمرُ المالك ٢٠٢٦-١٠-٠٩). في
 * الشريط الجانبيّ على الحاسوب، وفوق التذييل على الجوّال (‏`StationSide`
 * و`StationFoot`)، ويطوي الاستعلامُ أحدَهما.
 *
 * ══ ولمَ ثلاثٌ لا مفتاح ══
 * المفتاحُ يعرف حالين، فمن ضغطه مرّةً ثبت على أحدهما ولا طريقَ له إلى «اتبع
 * جهازي» إلّا بمسح المتصفّح. والخانةُ الثالثةُ هي ذلك الطريق.
 *
 * ══ ولا وميض ══
 * الخانةُ المضيئة من الورقة على وسم `html` (‏`data-radio-theme-choice`) لا من
 * حالة React: الخادمُ لا يعرف اختيارَ الزائر، فلو أُضيئت من الحالة لقفزت بعد
 * الترطيب. و`aria-checked` يلحق بعد الترطيب للقارئ الصوتيّ.
 */
export function ThemePicker({ className }: { className?: string }) {
  const choice = useSyncExternalStore(subscribeTheme, currentChoice, () => null);

  return (
    <div role="radiogroup" aria-label="الوضع" className={cn("stc-theme", className)}>
      {CHOICES.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={choice === value}
          data-choice={value}
          className="stc-theme-o"
          onClick={() => setChoice(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/**
 * يكتب الوسمَ حين يُدخَل القسمُ بتنقّلٍ داخليّ: سكربتُ الإقلاع لا يجري إلّا في
 * التحميل الأوّل. و`useLayoutEffect` لا `useEffect` كي يُكتب قبل أوّل رسمٍ للمحطّة.
 */
export function ThemeSync() {
  useLayoutEffect(() => {
    applyTheme();
  }, []);
  return null;
}
