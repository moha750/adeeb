"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * فسحةٌ واحدة تخدم قياسين: تسامحُ «أفي آخر الصفحة؟» (حشوُ الحاوية وكسورُ البكسل لا تُبطل
 * الحكم)، وهامشُ الحقل عن حافّة الشاشة العليا بعد النزول (فلا يلتصق بها).
 */
const BOTTOM_SLACK = 40;

/**
 * حاوية التمرير التي يعيش فيها الشريط — أقربُ أبٍ يفيض محتواه (اللوحة: `.ash-content`)،
 * وإلّا فالوثيقة نفسها (سائر الصفحات). لا يُفترَض أحدهما: المكوّن يخدم السياقين.
 */
function scrollBoxOf(node: HTMLElement): Element {
  for (let p = node.parentElement; p; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight) return p;
  }
  return document.scrollingElement ?? document.documentElement;
}

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
   * **ما كنتَ تكتبه يبقى مرئيًّا** — فظهورُ الشريط في لحظة الكتابة كان يغطّي الحقلَ الذي
   * أوجده. والحكم على **موضع الحقل من المحتوى** لا على موضعك من التمرير:
   *
   * ١) **الحقلُ في آخر الصفحة** (في مدى الشاشة الأخيرة — أيْ في آخر قسمٍ أو كرت) ⇐ يُنزَل إلى
   *    **آخرها** فيستقرّ الشريط في موضعه ويرتفع حقلُك فوقه كاملًا لا بالكاد. والشرطُ مقيسٌ لا
   *    مقدَّر: يُنزَل إلى الآخر **ما دام الحقلُ سيبقى مرئيًّا هناك** — فلا يُنزَل نزولًا يُخرج
   *    الحقلَ من أعلى الشاشة (كرتٌ أخيرٌ طويلٌ تكتب في رأسه).
   *
   * ٢) **وإلّا** ⇐ يُرفع الحقلُ بقدر الحاجة وحدها (`nearest`) — فلا تُخطَف الصفحةُ إلى آخرها
   *    من تحت يد من يعدّل في رأسها. و`scroll-padding` يضمن ألّا يقف تحت الشريط.
   *
   * وبلا حقلٍ مركَّز (تغييرٌ بنقرةٍ لا بكتابة: مرساةُ لون · مبدّل) يُحكم بموضعك: من كان ملاصقًا
   * للقاع يُردّ إليه، إذ الشريطُ بظهوره أزاح القاعَ عنه بقدره.
   */
  useEffect(() => {
    if (!el) return;
    const box = scrollBoxOf(el);
    const end = box.scrollHeight - box.clientHeight;
    const toEnd = () => box.scrollTo({ top: box.scrollHeight, behavior: "smooth" });

    const focused = document.activeElement;
    if (!(focused instanceof HTMLElement) || focused === document.body) {
      const added = el.offsetHeight + (Number.parseFloat(getComputedStyle(el).marginBottom) || 0);
      if (end - box.scrollTop <= added + BOTTOM_SLACK) toEnd();
      return;
    }

    // موضع أعلى الحقل من **المحتوى** لا من الشاشة (فالحاوية قد تكون اللوحة لا النافذة)
    const boxTop = box === document.scrollingElement || box === document.documentElement
      ? 0
      : box.getBoundingClientRect().top;
    const fieldTop = focused.getBoundingClientRect().top - boxTop + box.scrollTop;

    // في آخر شاشةٍ من المحتوى؟ ⇐ النزول إلى الآخر يُبقيه ظاهرًا (وفوقه فسحةٌ لا يلتصق بالحافّة)
    if (fieldTop >= end + BOTTOM_SLACK) toEnd();
    else focused.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [el]);

  if (!open) return null;
  return (
    <div ref={setEl} className={cn("asave", className)} role="status" aria-live="polite">
      {/* بلا علامةٍ لونيّة: ظهورُ الشريط نفسُه هو الإعلان، والنصّ يقوله صريحًا — فالنقطة
          كانت زينةً تزيد عن حاجتها (قرار المالك ٢٠٢٦-٠٨-٠٤). */}
      <span className="asave-msg">{message}</span>
      <span className="asave-acts">{children}</span>
    </div>
  );
}
