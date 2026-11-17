"use client";

import { useRef, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { useCharsetGuard, type FieldCharset } from "../lib/charset";
import { CharsetWhisper, KeyboardGlyph } from "./CharsetWhisper";
import { FieldMark } from "./FieldMark";
import { FieldCount, overMessage, useFieldCount, type FieldCountRule } from "./FieldCount";

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
  /** عدّادُ الطول تحت الحقل، في سطر الوصف بطرفه الآخر (`FieldCount`). */
  count?: FieldCountRule;
}

/**
 * حقل نصّ متعدّد الأسطر — نظام الحقل المعتمَد: تسمية ثابتة أعلى + أيقونة هويّة + حالات 600.
 * عميليّ (`use client`) لأنّ حارس `charset` يعترض الإدخال.
 */
export function Textarea({
  label, icon, innerIcon, placeholder, charset, error, success, helper, optional, count, required, className, dir, onBeforeInput, onChange, onInput, ...props
}: TextareaProps) {
  const { guard, whisper, leaving, hush } = useCharsetGuard<HTMLTextAreaElement>(charset, onBeforeInput, onChange);
  const wrapRef = useRef<HTMLDivElement>(null);
  const counted = useFieldCount<HTMLTextAreaElement>(count, props.value, props.defaultValue);
  /** ما زاد على الحدّ خطأٌ برسالته الواحدة (`FieldCount`) */
  const err = error ?? (counted.over ? overMessage(counted.over) : undefined);
  const msg = err ?? helper;
  return (
    <label className={cn("fld", err ? "err" : undefined, success && !err ? "ok" : undefined, className)}>
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
          aria-invalid={err ? true : undefined}
          /* سقفٌ واسعٌ للّصق وحده، كتعليقات الخبر: الكاتبُ لا يُقطع عند الحدّ، ولا يُلصق كتابٌ كامل */
          maxLength={count?.max != null ? count.max * 4 : undefined}
          {...props}
          {...guard}
          onInput={counted.onInput ? (e) => { counted.onInput?.(e); onInput?.(e); } : onInput}
        />
      </div>
      <CharsetWhisper text={whisper} anchorRef={wrapRef} leaving={leaving} onHush={hush} />
      {count ? (
        <span className="fld-under">{msg ? <span className="fld-help">{msg}</span> : null}<FieldCount rule={count} text={counted.text} /></span>
      ) : msg ? <span className="fld-help">{msg}</span> : null}
    </label>
  );
}
