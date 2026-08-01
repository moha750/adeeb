import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/cn";

type Variant =
  | "primary" | "ghost" | "danger" | "success" | "warning" | "neutral"
  | "ghost-danger" | "ghost-success" | "ghost-warning"
  | "inverse" | "inverse-ghost";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** يعرض مؤشّر تحميل ويعطّل الزرّ. */
  loading?: boolean;
}

/**
 * زر العلامة — بُني خطوة‑خطوة مع المستخدم:
 * تدرّج كحليّ · زوايا 16px · ظلّ ناعم · (تكبير خفيف + كنس ضوئيّ عند المرور) · أيقونة قبل النصّ.
 * الأنماط: primary · ghost · danger · success · warning · neutral · ghost-danger/success/warning · inverse · inverse-ghost. الأحجام: sm · md · lg.
 * تُعرَّف الأنماط في globals.css تحت البادئة `.abtn`.
 */
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn("abtn", `abtn-${variant}`, `abtn-${size}`, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className="abtn-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
