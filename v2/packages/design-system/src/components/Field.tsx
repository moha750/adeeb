"use client";

import { forwardRef, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type InputEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { useCharsetGuard, type FieldCharset } from "../lib/charset";
import { CharsetWhisper, KeyboardGlyph } from "./CharsetWhisper";
import { FieldMark } from "./FieldMark";
import { FieldCount, overMessage, useFieldCount, type FieldCountRule } from "./FieldCount";
import { AnchoredPopover } from "./AnchoredPopover";
import { DatePanel } from "./DatePanel";

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
  /**
   * **عدّادُ الطول تحت الحقل**، في سطر الوصف نفسه بطرفه الآخر كما في المواقع المألوفة (`FieldCount`): `{ max }` أو `{ min }`.
   * لا يضع `minLength`/`maxLength` على الحقل (كيلا يتدخّل تحقّقُ المتصفّح)؛ الحدُّ يبقى حيث يقرّره الحارس.
   */
  count?: FieldCountRule;
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

/** **قيمةُ التاريخ بلغة الهويّة** (٢٠٢٦-١١-٢٠): المتصفّحُ يرسم «يوم/شهر/سنة --:--» فارغًا و«2026/11/23 11:25 ص» ممتلئًا. القيمةُ
 * `YYYY-MM-DDTHH:mm` بلا منطقة، فتُقرأ كما هي (`UTC` في الصياغة نفسِها) فلا تنزاح في خادمٍ ولا جهاز. */
const DT_DAY = new Intl.DateTimeFormat("ar-SA-u-nu-latn-ca-gregory", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const DT_TIME = new Intl.DateTimeFormat("ar-SA-u-nu-latn", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" });
function dateLikeText(type: string | undefined, v: string): string | null {
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/);
  const t = v.match(/^(\d{2}):(\d{2})/);
  if (type === "time" && t) return DT_TIME.format(new Date(Date.UTC(2000, 0, 1, +t[1], +t[2])));
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0));
  return type === "datetime-local" && m[4] ? `${DT_DAY.format(d)}، ${DT_TIME.format(d)}` : DT_DAY.format(d);
}
const DT_EMPTY: Record<string, string> = { date: "اختر اليوم", time: "اختر الساعة", "datetime-local": "اختر اليوم والساعة", month: "اختر الشهر" };

/**
 * حقل إدخال العلامة — نظام الحقل المعتمَد على لوح الهوية: تسمية ثابتة أعلى + أيقونة هويّة بجانبها ·
 * سطح مسطّح · تركيز فولاذيّ · استدارة 16 · حالات الخطأ/النجاح بلون الدلالة 600.
 * الغلاف `<label>` يلفّ الحقل (لا حاجة لـ id) فتبقى التسمية قابلة للنقر بلا `useId`.
 * المكوّن عميليّ (`use client`) لأنّ حارس `charset` يعترض الإدخال — وكلّ مستهلكيه عميليّون أصلًا.
 */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, icon, innerIcon, placeholder, charset, error, success, helper, optional, prefix, count, required, className, dir, type, onBeforeInput, onChange, onInput, ...props },
  ref,
) {
  const [shown, setShown] = useState(false);
  /** عين الكشف لكلّ حقل كلمة مرور **بلا استثناء** — تُشتقّ من النوع وحده، فلا خاصّية تُطفئها ولا كشفَ خارج الحقل. */
  const hasEye = type === "password";
  /** كلمة المرور **لا تقبل العربيّة** (قرار المالك): الطقم يُشتقّ من النوع كما تُشتقّ العين، فلا يُكتب في كلّ نموذج — ويستلزم `dir="ltr"` معه. */
  const cs = charset ?? (hasEye ? "latin" : undefined);
  const { guard, whisper, leaving, hush } = useCharsetGuard<HTMLInputElement>(cs, onBeforeInput, onChange);
  const wrapRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLLabelElement>(null);
  const inRef = useRef<HTMLInputElement | null>(null);
  const [dpOpen, setDpOpen] = useState(false);
  /** اسمُ اللوح المنبثق تسميةُ حقله («آخر موعد للتسجيل»)، فيعرف القارئُ الآليّ أيَّ تاريخٍ يختار */
  const lblId = useId();
  const counted = useFieldCount<HTMLInputElement>(count, props.value, props.defaultValue);
  /** **التاريخُ الفارغ بلون التلميح** (`data-empty`): المتصفّح يرسم «يوم/شهر/سنة» نصًّا، فلا يعرفه `:placeholder-shown` */
  // والأسبوعُ (`week`) ليس منها: ترقيمٌ أوروبيّ لا حقلَ منه عندنا، فيبقى حقلًا عاديًّا للمتصفّح
  const dateLike = type === "date" || type === "time" || type === "datetime-local" || type === "month";
  /**
   * **القيمةُ الحقيقيّةُ ما في الحقل الأصليّ** لا ما في الخصائص (المراجعة ٢٠٢٦-١١-٢٠): `register()` بقيمه الأولى و`reset()` و`setValue()`
   * وإعادةُ النموذج تكتب في الحقل بلا حدث، والمتصفّحُ يمسح ما لا يقبله (ثوانٍ، أو `…Z`)؛ فكانت الجملةُ تقول «اختر اليوم» والمُرسَلُ قيمة،
   * أو تقول قيمةً والمُرسَلُ فارغ. فتُقرأ القيمةُ منه بعد كلّ رسم، وعند الإدخال، وبعد إعادة النموذج، وحين يُفتح اللوح.
   */
  const [live, setLive] = useState(() => String(props.value ?? props.defaultValue ?? ""));
  const readLive = () => { const el = inRef.current; if (el && dateLike) setLive(el.value); };
  useLayoutEffect(() => { const el = inRef.current; if (el && dateLike && el.value !== live) setLive(el.value); });
  useEffect(() => {
    const form = dateLike ? inRef.current?.form : null;
    if (!form) return;
    const onReset = () => setTimeout(readLive, 0);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  });
  const empty = dateLike && !live;
  const handleInput = (e: InputEvent<HTMLInputElement>) => {
    counted.onInput?.(e);
    if (dateLike) setLive(e.currentTarget.value);
    onInput?.(e);
  };
  const dtValue = dateLike ? live : "";
  /** تقويمُ الهويّة بدل تقويم المتصفّح، في الحاسوب واللمس معًا (`DatePanel`) */
  const openOwn = (e: { preventDefault: () => void }) => {
    if (!dateLike || props.disabled || props.readOnly) return;
    e.preventDefault();
    readLive();
    setDpOpen(true);
  };
  /** يُغلق اللوح، ويردّ التركيزَ إلى الحقل إن أُغلق بالمفاتيح أو بالاختيار (لا بالنقر خارجه، فذاك ذهب إلى حيث نقر) */
  const closeOwn = (refocus: boolean) => {
    setDpOpen(false);
    if (refocus) requestAnimationFrame(() => inRef.current?.focus({ preventScroll: true }));
  };
  /** القيمةُ تُكتب في الحقل الأصليّ ويُطلَق حدثُه، فيسمعها `onChange` كما لو اختارها المتصفّح */
  const pick = (v: string) => {
    const el = inRef.current;
    if (!el) return;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const riyadhToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const dtShown = dateLike ? (empty ? (placeholder || DT_EMPTY[type!] || "") : dateLikeText(type, dtValue) ?? dtValue) : "";
  /** ما زاد على الحدّ خطأٌ برسالته الواحدة («زاد ٥ أحرف»)، إلّا أن يقول النموذجُ خطأً غيرَه (`FieldCount`) */
  const err = error ?? (counted.over ? overMessage(counted.over) : undefined);
  const msg = err ?? helper;
  return (
    <label ref={rootRef} className={cn("fld", err ? "err" : undefined, success && !err ? "ok" : undefined, className)}
      // البئرُ كلُّه يفتح التقويم (التسميةُ والقيمة)، لا ما تحته من وصف
      onMouseDownCapture={dateLike ? (e) => { if (e.button === 0 && !(e.target as HTMLElement).closest(".fld-help, .fld-under, .adp-pop")) openOwn(e); } : undefined}
      onClickCapture={dateLike ? (e) => { if (!(e.target as HTMLElement).closest(".adp-pop")) e.preventDefault(); } : undefined}
      onKeyDownCapture={dateLike ? (e) => { if ((e.key === "Enter" || e.key === " ") && !(e.target as HTMLElement).closest(".adp-pop")) openOwn(e); } : undefined}>
      <span className="fld-lbl" id={lblId}>
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
          ref={(el) => {
            inRef.current = el;
            if (typeof ref === "function") ref(el);
            else if (ref) ref.current = el;
          }}
          className="fld-in"
          type={hasEye && shown ? "text" : type}
          placeholder={placeholder}
          dir={dir ?? (cs ? "ltr" : undefined)}
          required={required}
          aria-invalid={err ? true : undefined}
          /* سقفٌ واسعٌ للّصق وحده، كتعليقات الخبر: الكاتبُ لا يُقطع عند الحدّ، ولا يُلصق كتابٌ كامل */
          maxLength={count?.max != null ? count.max * 4 : undefined}
          {...props}
          {...guard}
          data-empty={empty ? "" : undefined}
          aria-haspopup={dateLike ? "dialog" : undefined}
          aria-expanded={dateLike ? dpOpen : undefined}
          onInput={counted.onInput || dateLike ? handleInput : onInput}
        />
        {/* قراءةُ التاريخ بالهويّة فوق الحقل الأصليّ، والنقرُ يمرّ إليه فيفتح تقويمَ الهويّة */}
        {dateLike ? <span className="fld-dt" aria-hidden="true" data-empty={empty ? "" : undefined} suppressHydrationWarning>{dtShown}</span> : null}
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
      {dateLike && dpOpen ? (
        <AnchoredPopover open anchorRef={rootRef} onDismiss={(r) => closeOwn(r !== "pointer")} align="start" className="adp-pop" role="dialog" ariaLabelledby={lblId}>
          <DatePanel type={type!} value={dtValue} min={typeof props.min === "string" ? props.min : undefined} max={typeof props.max === "string" ? props.max : undefined}
            today={riyadhToday()} onPick={pick} onDone={(kb) => closeOwn(kb)} />
        </AnchoredPopover>
      ) : null}
      {count ? (
        <span className="fld-under">{msg ? <span className="fld-help">{msg}</span> : null}<FieldCount rule={count} text={counted.text} /></span>
      ) : msg ? <span className="fld-help">{msg}</span> : null}
    </label>
  );
});
