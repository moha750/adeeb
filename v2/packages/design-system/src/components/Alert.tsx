import type { ReactNode } from "react";
import { cn } from "../lib/cn";

type Tone = "neutral" | "info" | "success" | "warning" | "danger";

/* أيقونات النغمة — SVG نظيف متّسق مع الأشقّاء (توست/نافذة)، بدلالة Phosphor:
   Info · CheckCircle · Warning (مثلّث) · WarningCircle. تُلوَّن بنغمتها عبر currentColor. */
const InfoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.6v.02" />
  </svg>
);
const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="9" /><path d="M8.2 12.2l2.6 2.7 5-5.4" />
  </svg>
);
const WarningIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 3.7L21.2 19.4H2.8L12 3.7z" /><path d="M12 10v4M12 17.1v.02" />
  </svg>
);
const WarningCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="9" /><path d="M12 7.5v5M12 16.2v.02" />
  </svg>
);
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

const ICONS: Record<Tone, ReactNode> = {
  neutral: <InfoIcon />,
  info: <InfoIcon />,
  success: <CheckCircleIcon />,
  warning: <WarningIcon />,
  danger: <WarningCircleIcon />,
};

export interface AlertProps {
  /** نصّ الرسالة. */
  children: ReactNode;
  tone?: Tone;
  title?: ReactNode;
  /** أيقونة مخصّصة (تحلّ محلّ أيقونة النغمة). */
  icon?: ReactNode;
  /** يعرض زرّ الإغلاق × ويستدعي هذه الدالة. */
  onClose?: () => void;
  /** أزرار/روابط إجراءات أسفل الرسالة. */
  actions?: ReactNode;
  /** تخطيط مضغوط بسطر واحد (بلا عنوان). */
  compact?: boolean;
  className?: string;
}

/**
 * تنبيه العلامة — بطاقة هوية هادئة (أخٌ للكروت المنغّمة والنافذة):
 * سطح Aurora ناعم + حدّ النغمة الموحّد + ظلّ موسوم + أيقونة في مربّع Aurora برمز ملوّن بالنغمة
 * + عنوان كحليّ محايد + رسالة محايدة. النغمة في الكروم لا النصّ (وصوليّة).
 * النغمات: neutral · info · success · warning · danger. يدعم title/onClose/actions/compact/icon.
 * الإجراءات تُمرَّر كمكوّنات <Button variant="ghost | ghost-danger | …" size="sm">.
 */
export function Alert({ children, tone = "info", title, icon, onClose, actions, compact, className }: AlertProps) {
  return (
    <div role="alert" className={cn("aalert", `aalert-tone-${tone}`, compact && "aalert-compact", className)}>
      <div className="aalert-main">
        <span className="aalert-ic">{icon ?? ICONS[tone]}</span>
        <div className="aalert-bd">
          {title && !compact ? <div className="aalert-title">{title}</div> : null}
          <div className="aalert-msg">{children}</div>
        </div>
        {onClose ? (
          <button type="button" className="aalert-close" aria-label="إغلاق" onClick={onClose}>
            <CloseIcon />
          </button>
        ) : null}
      </div>
      {actions ? <div className="aalert-actions">{actions}</div> : null}
    </div>
  );
}
