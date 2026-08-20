"use client";

import { forwardRef, useRef, useState, type CSSProperties, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { useCharsetGuard, type FieldCharset } from "../lib/charset";
import { CharsetWhisper, KeyboardGlyph } from "./CharsetWhisper";
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
   * طقم المحارف المقبول — يمنع الممنوع عند الكتابة واللصق **ويهمس بسببه**، ويستلزم `dir="ltr"` تلقائيًّا (يُنقَض بتمرير `dir`).
   * `latin` = لا حروف عربيّة (بريد · معرّف · رابط) · `digits` = أرقام فقط (جوّال · رقم أكاديميّ).
   * يُترك فارغًا للحقول العربيّة (اسم · كلّية). و`type="password"` يستلزم `latin` تلقائيًّا (يُنقَض بتمرير طقم آخر).
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
  /**
   * لصيقة ثابتة قبل القيمة (`+966` نموذجًا) — **نصٌّ يُقرأ لا يُحرَّر**: لا يدخل القيمة ولا يُرسَل،
   * وإنّما يقول للكاتب أين يقف رقمه وبأيّ بلدٍ يُقرأ. ومكانُها محجوزٌ بعرضها فلا تركبها القيمة.
   */
  prefix?: string;
}

/* عين الكشف — بخطّ أيقونات النظام نفسه (stroke 1.7، لا تعبئة) */
const Eye = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M2.5 12S6.6 5.8 12 5.8 21.5 12 21.5 12 17.4 18.2 12 18.2 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.9" />
  </svg>
);
const EyeOff = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M2.5 12S6.6 5.8 12 5.8c1.6 0 3 .35 4.2.9M21.5 12s-1.6 2.4-4.3 4.1M4.7 16.4A15.6 15.6 0 0 1 2.5 12" />
    <path d="M9.9 9.9a2.9 2.9 0 0 0 4.2 4.2" />
    <path d="M4 20 20 4" />
  </svg>
);

/**
 * حقل إدخال العلامة — نظام الحقل المعتمَد على لوح الهوية: تسمية ثابتة أعلى + أيقونة هويّة بجانبها ·
 * سطح مسطّح · تركيز فولاذيّ · استدارة 16 · حالات الخطأ/النجاح بلون الدلالة 600.
 * الغلاف `<label>` يلفّ الحقل (لا حاجة لـ id) فتبقى التسمية قابلة للنقر بلا `useId`.
 * المكوّن عميليّ (`use client`) لأنّ حارس `charset` يعترض الإدخال — وكلّ مستهلكيه عميليّون أصلًا.
 */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, icon, innerIcon, placeholder, charset, error, success, helper, optional, prefix, required, className, dir, type, onBeforeInput, onChange, ...props },
  ref,
) {
  const msg = error ?? helper;
  const [shown, setShown] = useState(false);
  /** عين الكشف لكلّ حقل كلمة مرور **بلا استثناء** — تُشتقّ من النوع وحده، فلا خاصّية تُطفئها ولا كشفَ خارج الحقل. */
  const hasEye = type === "password";
  /** كلمة المرور **لا تقبل العربيّة** (قرار المالك): الطقم يُشتقّ من النوع كما تُشتقّ العين، فلا يُكتب في كلّ نموذج — ويستلزم `dir="ltr"` معه. */
  const cs = charset ?? (hasEye ? "latin" : undefined);
  const { guard, whisper, leaving, hush } = useCharsetGuard<HTMLInputElement>(cs, onBeforeInput, onChange);
  const wrapRef = useRef<HTMLDivElement>(null);
  return (
    <label className={cn("fld", error ? "err" : undefined, success && !error ? "ok" : undefined, className)}>
      <span className="fld-lbl">
        <span className="fld-lic" aria-hidden="true">{icon}</span>
        {label}
        <FieldMark optional={optional} required={required} />
      </span>
      <div
        ref={wrapRef}
        className={cn("fld-wrap", whisper ? "fld-warn" : undefined)}
        /* مكانُ اللصيقة يُحجَز بعرضها لا برقمٍ يُخمَّن: `ch` عرضُ الصفر في خطّ الحقل نفسه، فيتّسع المحجوز بها. */
        style={prefix ? ({ "--fld-pre-w": `${prefix.length}ch` } as CSSProperties) : undefined}
      >
        {/* أثناء الهمسة تُبدَّل الأيقونة الداخليّة بلوحة مفاتيح: الرسم يقول ما تقوله الهمسة، فيُفهم بلا قراءة */}
        <span className="fld-iic" aria-hidden="true">{whisper ? <KeyboardGlyph /> : innerIcon}</span>
        {/* بلا `aria-hidden`: الغلاف `<label>` فيلتحق نصُّها باسم الحقل المنطوق — وهو المراد (ق٣: «رقم الجوّال +966») */}
        {prefix ? <span className="fld-pre">{prefix}</span> : null}
        <input
          ref={ref}
          className="fld-in"
          type={hasEye && shown ? "text" : type}
          placeholder={placeholder}
          dir={dir ?? (cs ? "ltr" : undefined)}
          required={required}
          aria-invalid={error ? true : undefined}
          {...props}
          {...guard}
        />
        {hasEye ? (
          <button
            type="button"
            className="fld-eye"
            disabled={props.disabled}
            onClick={() => setShown((s) => !s)}
            aria-label={shown ? "إخفاء كلمة المرور" : "عرض كلمة المرور"}
            aria-pressed={shown}
          >
            {shown ? <EyeOff /> : <Eye />}
          </button>
        ) : null}
      </div>
      <CharsetWhisper text={whisper} anchorRef={wrapRef} leaving={leaving} onHush={hush} />
      {msg ? <span className="fld-help">{msg}</span> : null}
    </label>
  );
});
