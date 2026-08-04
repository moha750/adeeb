"use client";

import { useRef, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { useCharsetGuard, type FieldCharset } from "../lib/charset";
import { CharsetWhisper, KeyboardGlyph } from "./CharsetWhisper";
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
  const { guard, whisper, leaving, hush } = useCharsetGuard<HTMLTextAreaElement>(charset, onBeforeInput, onChange);
  const wrapRef = useRef<HTMLDivElement>(null);
  return (
    <label className={cn("fld", error ? "err" : undefined, success && !error ? "ok" : undefined, className)}>
      <span className="fld-lbl">
        <span className="fld-lic" aria-hidden="true">{icon}</span>
        {label}
        <FieldMark optional={optional} required={required} />
      </span>
      <div ref={wrapRef} className={cn("fld-wrap", whisper ? "fld-warn" : undefined)}>
        <span className="fld-iic" aria-hidden="true">{whisper ? <KeyboardGlyph /> : innerIcon}</span>
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
      <CharsetWhisper text={whisper} anchorRef={wrapRef} leaving={leaving} onHush={hush} />
      {msg ? <span className="fld-help">{msg}</span> : null}
    </label>
  );
}
