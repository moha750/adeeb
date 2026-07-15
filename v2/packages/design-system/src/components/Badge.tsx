import type { ReactNode } from "react";
import { cn } from "../lib/cn";

type Tone = "neutral" | "info" | "success" | "warning" | "danger";
type Variant = "soft" | "solid" | "outline" | "glass";
type Size = "sm" | "md" | "lg";

export interface BadgeProps {
  children: ReactNode;
  /** النغمة الدلالية. */
  tone?: Tone;
  /** النمط: ناعم (افتراضي) · صلب · مفرّغ. */
  variant?: Variant;
  size?: Size;
  /** نقطة حالة بادئة. */
  dot?: boolean;
  /** نقطة نابضة (للحيّ/الجديد). */
  live?: boolean;
  /** أيقونة بادئة. */
  icon?: ReactNode;
  /** يعرض زرّ إزالة × (للوسوم). */
  onRemove?: () => void;
  className?: string;
}

const RemoveIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

/**
 * شارة العلامة — بُنيت خطوة‑خطوة: ناعم + نقطة · حبّة متوسط · ألوان دلالية حيّة.
 * المؤشّرات: dot · live · icon · onRemove. الأنماط: soft · solid · outline.
 */
export function Badge({
  children,
  tone = "neutral",
  variant = "soft",
  size = "md",
  dot,
  live,
  icon,
  onRemove,
  className,
}: BadgeProps) {
  return (
    <span className={cn("abadge", `abadge-${tone}`, `abadge-${variant}`, `abadge-${size}`, className)}>
      {live ? (
        <span className="abadge-live"><i /></span>
      ) : dot ? (
        <span className="abadge-dot" />
      ) : icon ? (
        <span className="abadge-ic">{icon}</span>
      ) : null}
      {children}
      {onRemove ? (
        <button type="button" className="abadge-rm" aria-label="إزالة" onClick={onRemove}>
          <RemoveIcon />
        </button>
      ) : null}
    </span>
  );
}

/** شارة عدّ دائرية (إشعارات/أرقام) — أرقام لاتينية (Eras). */
export function CountBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return <span className={cn("acount", `acount-${tone}`, className)}>{children}</span>;
}
