import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/cn";

type Size = "sm" | "md" | "lg";
type Tone = "neutral" | "danger";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** النغمة: محايدةٌ رماديّةٌ تتلوّن بالأساس عند المرور، أو خطرٌ **أحمرُ ساكنًا** يشتدّ عند المرور. */
  tone?: Tone;
  size?: Size;
}

/**
 * الزرّ الأيقونيّ — مربّعٌ مضغوط للأدوات الكثيفة (أشرطة الأدوات · بطاقات · صفوف الخيارات).
 * المحايدُ ساكنٌ على السطح (حدّ البطاقة + نصّ خافت) يتلوّن بالأساس عند المرور. وذو النغمة
 * **يلبسها ساكنًا** (٢٠٢٦-٠٩-٠٧) ويشتدّ عند المرور: على الجوّال لا مرورَ يكشف الخطر. استدارة sm.
 * أحجام: sm · md · lg (md = ٣٠px، الافتراضيّ). أيقونةٌ واحدة طفلًا، ويلزمه `aria-label`.
 * تُعرَّف الأنماط في components.css تحت البادئة `.aibtn`.
 */
export function IconButton({
  tone = "neutral",
  size = "md",
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      className={cn("aibtn", `aibtn-${size}`, tone !== "neutral" && `aibtn-${tone}`, className)}
      {...props}
    >
      {children}
    </button>
  );
}
