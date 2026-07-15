import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

type Variant = "default" | "elevated";
type Tone = "brand" | "success" | "warning" | "danger";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  /** نغمة الحالة: سطح Aurora + حدّ + ظلّ + قرص الرأس بلون الحالة (النصّ يبقى محايدًا). */
  tone?: Tone;
  /** يضيف حركة المرور (تكبير + حدّ ملوّن). البطاقة تبقى <div> — لِفَّها برابط عند الحاجة. */
  interactive?: boolean;
  /** تخطيط أفقيّ: صورة جانبية + جسم. */
  horizontal?: boolean;
}

/**
 * بطاقة العلامة القابلة للتركيب — بُنيت خطوة‑خطوة: حدّ + ظلّ ناعم ·
 * مرور (تكبير + حدّ ملوّن) عبر `interactive`. رَكِّبها بـ CardMedia/Header/Body/Footer.
 */
export function Card({ variant = "default", tone, interactive, horizontal, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "acard",
        variant !== "default" && `acard-${variant}`,
        tone && `acard-tone-${tone}`,
        interactive && "acard-interactive",
        horizontal && "acard-horizontal",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** صورة/غطاء البطاقة — مرّر `image` (رابط) أو محتوى. تظهر خلفية كحلية عند غيابها. */
export function CardMedia({
  image,
  alt,
  className,
  children,
}: {
  image?: string;
  alt?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn("acard-media", className)}
      style={image ? { backgroundImage: `url(${image})` } : undefined}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
    >
      {children}
    </div>
  );
}

/** جسم البطاقة (المحتوى الرئيسيّ بمسافة داخلية). */
export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("acard-body", className)}>{children}</div>;
}

/** تذييل البطاقة (فاصل علويّ + توزيع طرفيّ للإجراءات/المعلومات). */
export function CardFooter({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("acard-footer", className)}>{children}</div>;
}

/** رأس البطاقة: أيقونة في قرص + عنوان + عنوان فرعيّ (بطاقة ميزة). */
export function CardHeader({
  icon,
  title,
  subtitle,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("acard-header", className)}>
      {icon ? <span className="acard-chip">{icon}</span> : null}
      <div>
        <h3 className="acard-htitle">{title}</h3>
        {subtitle ? <span className="acard-hsub">{subtitle}</span> : null}
      </div>
    </div>
  );
}
