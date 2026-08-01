import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

type Variant = "default" | "elevated";
type Tone = "brand" | "neutral" | "success" | "warning" | "danger";

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

/**
 * شريط بطاقة الشخص — سطح Aurora منغَّم (يتبع نغمة الكرت عبر `--card-grad`) بباترن الهوية،
 * وخانة `actions` عائمة في طرفه (قائمة النقاط). يُركَّب مع أفتارٍ يحمل `.acard-av` (محتضَن)
 * داخل بطاقة `.acard-profile` — النظير الرأسيّ لـ`CardHeader` في نمط المحتوى.
 */
export function CardBanner({ actions, className }: { actions?: ReactNode; className?: string }) {
  return <div className={cn("acard-banner", className)}>{actions}</div>;
}

/** جسم البطاقة (المحتوى الرئيسيّ بمسافة داخلية). */
export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("acard-body", className)}>{children}</div>;
}

/** تذييل البطاقة (فاصل علويّ + توزيع طرفيّ للإجراءات/المعلومات). */
export function CardFooter({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("acard-footer", className)}>{children}</div>;
}

/**
 * رأس البطاقة — سلّم شدّةٍ في نظام الكروت:
 * - `chip` (افتراضيّ): أيقونة في قرصٍ بتدرّج + عنوان، على سطح الكرت (بطاقة ميزة).
 * - `soft`: **شريطٌ منسّمٌ خفيف** (تدرّج هوية باهت + شعرة سفليّة) بنصٍّ داكن — مميّزٌ وهادئ (كرت البيانات/المخطّط).
 * - `solid`: **شريطٌ ممتلئٌ** بتدرّج الهوية بنصٍّ أبيض وقرصٍ زجاجيّ — قويّ (كرت الإبراز/البطل).
 * وخانة `actions` تُدفَع لطرف الرأس (مبدّل/شارة/زرّ) — يشترك فيها كلّ الكروت.
 */
export function CardHeader({
  icon,
  title,
  subtitle,
  actions,
  variant = "chip",
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  variant?: "chip" | "soft" | "solid";
  className?: string;
}) {
  return (
    <div className={cn("acard-header", variant !== "chip" && `acard-header-${variant}`, className)}>
      {icon ? <span className="acard-chip">{icon}</span> : null}
      <div className="acard-htexts">
        <h3 className="acard-htitle">{title}</h3>
        {subtitle ? <span className="acard-hsub">{subtitle}</span> : null}
      </div>
      {actions ? <div className="acard-hactions">{actions}</div> : null}
    </div>
  );
}
