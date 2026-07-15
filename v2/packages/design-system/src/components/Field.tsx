import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn";

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  /** تسمية ثابتة أعلى الحقل. */
  label: string;
  /** أيقونة هويّة بجانب التسمية — **إلزاميّة** (مقدّسة: لا حقل بلا أيقونة). فولاذيّة، وتتلوّن بالدلالة في حالتَي الخطأ/النجاح. */
  icon: ReactNode;
  /** أيقونة داخل الحقل (leading) — **إلزاميّة** (مقدّسة كأيقونة الـlabel)؛ خاملة رماديّة، وتضيء بنغمة الحقل عند الاستخدام. */
  innerIcon: ReactNode;
  /** نصّ تلميحيّ داخل الحقل (placeholder) — **إلزاميّ** (مقدّس). */
  placeholder: string;
  /** رسالة خطأ — تُفعّل حالة الخطأ (لون الدلالة 600 + حلقة). */
  error?: string;
  /** حالة نجاح (لون الدلالة 600 + حلقة). */
  success?: boolean;
  /** نصّ مساعدة أسفل الحقل. */
  helper?: string;
}

/**
 * حقل إدخال العلامة — نظام الحقل المعتمَد على لوح الهوية: تسمية ثابتة أعلى + أيقونة هويّة بجانبها ·
 * سطح مسطّح · تركيز فولاذيّ · استدارة 16 · حالات الخطأ/النجاح بلون الدلالة 600.
 * الغلاف `<label>` يلفّ الحقل (لا حاجة لـ id) فيبقى المكوّن خادميًّا وقابلًا للنقر على التسمية.
 */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, icon, innerIcon, placeholder, error, success, helper, className, ...props },
  ref,
) {
  const msg = error ?? helper;
  return (
    <label className={cn("fld", error ? "err" : undefined, success && !error ? "ok" : undefined, className)}>
      <span className="fld-lbl">
        <span className="fld-lic" aria-hidden="true">{icon}</span>
        {label}
      </span>
      <div className="fld-wrap">
        <span className="fld-iic" aria-hidden="true">{innerIcon}</span>
        <input ref={ref} className="fld-in" placeholder={placeholder} aria-invalid={error ? true : undefined} {...props} />
      </div>
      {msg ? <span className="fld-help">{msg}</span> : null}
    </label>
  );
});
