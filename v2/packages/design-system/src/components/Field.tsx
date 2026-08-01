"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { charsetGuard, type FieldCharset } from "../lib/charset";
import { FieldMark } from "./FieldMark";

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  /** تسمية ثابتة أعلى الحقل. */
  label: string;
  /** أيقونة هويّة بجانب التسمية — **إلزاميّة** (مقدّسة: لا حقل بلا أيقونة). فولاذيّة، وتتلوّن بالدلالة في حالتَي الخطأ/النجاح. */
  icon: ReactNode;
  /** أيقونة داخل الحقل (leading) — **إلزاميّة** (مقدّسة كأيقونة الـlabel)؛ خاملة رماديّة، وتضيء بنغمة الحقل عند الاستخدام. */
  innerIcon: ReactNode;
  /** نصّ تلميحيّ داخل الحقل (placeholder) — **إلزاميّ** (مقدّس). */
  placeholder: string;
  /**
   * طقم المحارف المقبول — يمنع الممنوع عند الكتابة واللصق، ويستلزم `dir="ltr"` تلقائيًّا (يُنقَض بتمرير `dir`).
   * `latin` = لا حروف عربيّة (بريد · معرّف · رابط) · `digits` = أرقام فقط (جوّال · رقم أكاديميّ).
   * يُترك فارغًا للحقول العربيّة (اسم · كلّية) ولكلمة المرور — فهي تقبل كلّ محرف.
   */
  charset?: FieldCharset;
  /** رسالة خطأ — تُفعّل حالة الخطأ (لون الدلالة 600 + حلقة). */
  error?: string;
  /** حالة نجاح (لون الدلالة 600 + حلقة). */
  success?: boolean;
  /** نصّ مساعدة أسفل الحقل. */
  helper?: string;
  /** وسم «اختياري» هادئ في آخر صفّ التسمية (رماديّ خافت). يُلغي وسم الإلزام. */
  optional?: boolean;
}

/**
 * حقل إدخال العلامة — نظام الحقل المعتمَد على لوح الهوية: تسمية ثابتة أعلى + أيقونة هويّة بجانبها ·
 * سطح مسطّح · تركيز فولاذيّ · استدارة 16 · حالات الخطأ/النجاح بلون الدلالة 600.
 * الغلاف `<label>` يلفّ الحقل (لا حاجة لـ id) فتبقى التسمية قابلة للنقر بلا `useId`.
 * المكوّن عميليّ (`use client`) لأنّ حارس `charset` يعترض الإدخال — وكلّ مستهلكيه عميليّون أصلًا.
 */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, icon, innerIcon, placeholder, charset, error, success, helper, optional, required, className, dir, onBeforeInput, onChange, ...props },
  ref,
) {
  const msg = error ?? helper;
  const guard = charsetGuard<HTMLInputElement>(charset, onBeforeInput, onChange);
  return (
    <label className={cn("fld", error ? "err" : undefined, success && !error ? "ok" : undefined, className)}>
      <span className="fld-lbl">
        <span className="fld-lic" aria-hidden="true">{icon}</span>
        {label}
        <FieldMark optional={optional} required={required} />
      </span>
      <div className="fld-wrap">
        <span className="fld-iic" aria-hidden="true">{innerIcon}</span>
        <input
          ref={ref}
          className="fld-in"
          placeholder={placeholder}
          dir={dir ?? (charset ? "ltr" : undefined)}
          required={required}
          aria-invalid={error ? true : undefined}
          {...props}
          {...guard}
        />
      </div>
      {msg ? <span className="fld-help">{msg}</span> : null}
    </label>
  );
});
