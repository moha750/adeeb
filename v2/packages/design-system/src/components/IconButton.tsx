import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/cn";

type Size = "sm" | "md" | "lg";
type Tone = "neutral" | "danger";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** نغمة المرور: محايدة تتلوّن بالأساس، أو خطرٌ يتلوّن بالأحمر. */
  tone?: Tone;
  size?: Size;
}

/**
 * الزرّ الأيقونيّ — مربّعٌ مضغوط للأدوات الكثيفة (أشرطة الأدوات · بطاقات · صفوف الخيارات).
 * ساكنٌ محايد على السطح (حدّ البطاقة + نصّ خافت)، يتلوّن بالنغمة عند المرور. استدارة sm.
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
