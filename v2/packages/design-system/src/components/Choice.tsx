import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

const CheckMark = () => (
  <svg className="ach-chk" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12l5 5L20 7" />
  </svg>
);

type Base = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  /** يعرضه كبطاقة قابلة للاختيار تُبرز عند التحديد. */
  card?: boolean;
};

function text(label?: ReactNode, description?: ReactNode) {
  if (description) {
    return (
      <span className="ach-txt">
        <b>{label}</b>
        <small>{description}</small>
      </span>
    );
  }
  return label ? <span className="ach-lbl">{label}</span> : null;
}

/** مربّع اختيار — تحديد متدرّج، رسم+ارتداد. يدعم الوصف والبطاقة. */
export function Checkbox({ label, description, icon, card, className, disabled, ...props }: Base) {
  const control = <span className="ach-box"><CheckMark /></span>;
  if (card) {
    return (
      <label className={cn("ach ach--block", disabled && "is-disabled", className)}>
        <input type="checkbox" disabled={disabled} {...props} />
        <span className="ach-card">
          {icon ? <span className="ach-cic">{icon}</span> : null}
          {text(label, description)}
          {control}
        </span>
      </label>
    );
  }
  return (
    <label className={cn("ach", disabled && "is-disabled", className)}>
      <input type="checkbox" disabled={disabled} {...props} />
      {control}
      {text(label, description)}
    </label>
  );
}

/** زرّ راديو — بنفس الهوية. مرّر `name` لتجميع الخيارات. */
export function Radio({ label, description, icon, card, className, disabled, ...props }: Base) {
  const control = <span className="ach-radio"><span className="ach-dot" /></span>;
  if (card) {
    return (
      <label className={cn("ach ach--block", disabled && "is-disabled", className)}>
        <input type="radio" disabled={disabled} {...props} />
        <span className="ach-card">
          {icon ? <span className="ach-cic">{icon}</span> : null}
          {text(label, description)}
          {control}
        </span>
      </label>
    );
  }
  return (
    <label className={cn("ach", disabled && "is-disabled", className)}>
      <input type="radio" disabled={disabled} {...props} />
      {control}
      {text(label, description)}
    </label>
  );
}

type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: ReactNode;
  description?: ReactNode;
  /** تخطيط صفّ الإعدادات: التسمية بادئة والمفتاح في الطرف. */
  row?: boolean;
};

/** مفتاح تبديل — تشغيل بتدرّج الهوية. `row` لتخطيط الإعدادات. */
export function Switch({ label, description, row, className, disabled, ...props }: SwitchProps) {
  const control = <span className="ach-sw"><span className="ach-kn" /></span>;
  const input = <input type="checkbox" role="switch" disabled={disabled} {...props} />;
  if (row) {
    return (
      <label className={cn("ach ach--block ach-rowbetween", disabled && "is-disabled", className)}>
        {input}
        {text(label, description)}
        {control}
      </label>
    );
  }
  return (
    <label className={cn("ach", disabled && "is-disabled", className)}>
      {input}
      {control}
      {text(label, description)}
    </label>
  );
}
