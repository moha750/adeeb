"use client";

import type { ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { charsetGuard, type FieldCharset } from "../lib/charset";
import { FieldMark } from "./FieldMark";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  /** أيقونة هويّة بجانب التسمية — **إلزاميّة** (مقدّسة: لا حقل بلا أيقونة). */
  icon: ReactNode;
  /** أيقونة داخل الحقل (leading) — **إلزاميّة** (مقدّسة كأيقونة الـlabel)؛ خاملة رماديّة، وتضيء بنغمة الحقل عند الاستخدام. */
  innerIcon: ReactNode;
  /** نصّ تلميحيّ داخل الحقل (placeholder) — **إلزاميّ** (مقدّس). */
  placeholder: string;
  /**
   * طقم المحارف المقبول — يمنع الممنوع عند الكتابة واللصق، ويستلزم `dir="ltr"` تلقائيًّا (يُنقَض بتمرير `dir`).
   * `latin` = لا حروف عربيّة · `digits` = أرقام فقط. يُترك فارغًا للنصّ العربيّ الحرّ.
   */
  charset?: FieldCharset;
  error?: string;
  success?: boolean;
  helper?: string;
  /** وسم «اختياري» هادئ في آخر صفّ التسمية (رماديّ خافت). يُلغي وسم الإلزام. */
  optional?: boolean;
}

/**
 * حقل نصّ متعدّد الأسطر — نظام الحقل المعتمَد: تسمية ثابتة أعلى + أيقونة هويّة + حالات 600.
 * عميليّ (`use client`) لأنّ حارس `charset` يعترض الإدخال.
 */
export function Textarea({
  label, icon, innerIcon, placeholder, charset, error, success, helper, optional, required, className, dir, onBeforeInput, onChange, ...props
}: TextareaProps) {
  const msg = error ?? helper;
  const guard = charsetGuard<HTMLTextAreaElement>(charset, onBeforeInput, onChange);
  return (
    <label className={cn("fld", error ? "err" : undefined, success && !error ? "ok" : undefined, className)}>
      <span className="fld-lbl">
        <span className="fld-lic" aria-hidden="true">{icon}</span>
        {label}
        <FieldMark optional={optional} required={required} />
      </span>
      <div className="fld-wrap">
        <span className="fld-iic" aria-hidden="true">{innerIcon}</span>
        <textarea
          className="fld-in fld-area"
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
}
