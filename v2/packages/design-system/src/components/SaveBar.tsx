"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "../lib/cn";

export interface SaveBarProps {
  /** هل ثمّة تغييرٌ لم يُحفَظ؟ — الشريط لا وجود له في DOM حين لا يكون. */
  open: boolean;
  /** نصّ الإعلان. الافتراض يكفي أكثر الشاشات. */
  message?: string;
  /** الأزرار — من المكتبة، ويملك المستدعي حالتها (`loading`/`disabled`، ق٧). */
  children: ReactNode;
  className?: string;
}

/**
 * **شريط الحفظ اللاصق** — يظهر حين يوجد تغييرٌ لم يُحفَظ، ويلازم أسفل الشاشة أينما مرّرت.
 *
 * **لِمَ لا زرٌّ في ذيل الصفحة؟** ذاك يصلح للنموذج الذي يُملأ من أوّله إلى آخره (نافذة تعديل
 * العضو مثلًا: يقع الزرّ حيث انتهى بصرُك). أمّا **شاشة الإعدادات الطويلة** فيدخلها صاحبُها
 * ليمسّ حقلًا واحدًا ويخرج — فيصير الزرّ بعيدًا عن موضع عمله، **وصامتًا**: من غيّر ثمّ انتقل
 * إلى صفحةٍ أخرى خرج وتعديلُه معه بلا كلمة. والشريط يحلّ العلّتين: قريبٌ دائمًا، ووجودُه
 * نفسُه هو التنبيه.
 *
 * **وظهورُه مشروط عمدًا:** الشاشة الساكنة لا يزاحمها شيء — فلا شريطَ حتى يتغيّر شيء.
 *
 * **`sticky` لا `fixed`:** اللوحة تُمرّر في حاويتها (`.ash-content`) لا في النافذة، ولها شريطٌ
 * جانبيّ — فـ`fixed` كان سيلزمه معرفةُ عرض الشريط ليتجنّبه. و`sticky` يلتصق بحاوية التمرير
 * نفسها فيصيب عرضَ المحتوى بلا حساب.
 *
 * ويُعلَن `role="status"` مؤدَّبًا (`polite`) — فقارئ الشاشة يسمع «لديك تغييرات» بلا مقاطعة.
 */
export function SaveBar({ open, message = "لديك تغييراتٌ لم تُحفَظ", children, className }: SaveBarProps) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);

  /**
   * **الشريط يقيس نفسه ويُعلن ارتفاعه** (`--asave-h`) — لأنّ الطبقة العائمة تحجب ما تحتها،
   * وهذا الرقم هو ما يُحجَز به مكانُها في التمرير (انظر `.asave` وقواعد `scroll-padding`).
   * ولا رقمَ مقدَّرٌ محفور: الشريط ينطوي سطرين في الشاشة الضيّقة فيتضاعف ارتفاعه، و`ResizeObserver`
   * يتبعه. ويُمحى الرمز بانصرافه فلا تبقى الصفحة تحجز مكانًا لشيءٍ ذهب.
   */
  useEffect(() => {
    if (!el) return;
    const root = document.documentElement;
    const apply = () => root.style.setProperty("--asave-h", `${el.offsetHeight}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--asave-h");
    };
  }, [el]);

  /**
   * **ما كنتَ تكتبه يبقى مرئيًّا:** ظهورُ الشريط في لحظة الكتابة كان يغطّي الحقل نفسَه الذي
   * أوجده — فيُرفع الحقلُ المركَّز فوقه أوّلَ ما يظهر. و`nearest` لا يحرّك الصفحة إلّا بقدر
   * الحاجة (فلا تقفز على من كان حقلُه ظاهرًا أصلًا)، و`scroll-padding` يضمن ألّا يقف تحته.
   */
  useEffect(() => {
    if (!el) return;
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && focused !== document.body) {
      focused.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [el]);

  if (!open) return null;
  return (
    <div ref={setEl} className={cn("asave", className)} role="status" aria-live="polite">
      <span className="asave-msg">
        <i className="asave-dot" aria-hidden />
        {message}
      </span>
      <span className="asave-acts">{children}</span>
    </div>
  );
}
