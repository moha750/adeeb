import type { ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "../lib/cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  /** أيقونة هويّة بجانب التسمية — **إلزاميّة** (مقدّسة: لا حقل بلا أيقونة). */
  icon: ReactNode;
  /** أيقونة داخل الحقل (leading) — **إلزاميّة** (مقدّسة كأيقونة الـlabel)؛ خاملة رماديّة، وتضيء بنغمة الحقل عند الاستخدام. */
  innerIcon: ReactNode;
  /** نصّ تلميحيّ داخل الحقل (placeholder) — **إلزاميّ** (مقدّس). */
  placeholder: string;
  error?: string;
  success?: boolean;
  helper?: string;
}

/** حقل نصّ متعدّد الأسطر — نظام الحقل المعتمَد: تسمية ثابتة أعلى + أيقونة هويّة + حالات 600. */
export function Textarea({ label, icon, innerIcon, placeholder, error, success, helper, className, ...props }: TextareaProps) {
  const msg = error ?? helper;
  return (
    <label className={cn("fld", error ? "err" : undefined, success && !error ? "ok" : undefined, className)}>
      <span className="fld-lbl">
        <span className="fld-lic" aria-hidden="true">{icon}</span>
        {label}
      </span>
      <div className="fld-wrap">
        <span className="fld-iic" aria-hidden="true">{innerIcon}</span>
        <textarea className="fld-in fld-area" placeholder={placeholder} aria-invalid={error ? true : undefined} {...props} />
      </div>
      {msg ? <span className="fld-help">{msg}</span> : null}
    </label>
  );
}
