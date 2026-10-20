"use client";

/**
 * **جسمُ السؤال** بكلّ أنواعه. يكتب أصنافًا ببادئة الهيئة (`spt`)، وهيئتُها في `components.css`.
 *
 * - الخياراتُ أزرارٌ بمفاتيح أبجديّة (أ ب ج د)، والمنسدلةُ خياراتٌ مثلها: سبعةُ خياراتٍ تُرى دفعةً
 *   أسرعُ من قائمةٍ تُفتح. وتُعرض قائمةً عموديّةً كالاختيار: الشبكةُ تكسر الأسماء الطويلة سطرين
 *   فتختلف الخانات طولًا (ق محمد ٢٠٢٦-١٠-١٤)، فلا شبكةَ إلّا لـ«نعم/لا».
 * - النجومُ رسمٌ يمتلئ، والمقياسُ **عدّادٌ** يمتلئ حتّى الرقم المختار لا رقمٌ وحيدٌ يُضاء.
 */

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { CharsetWhisper, cn, type FieldCharset } from "@adeeb/design-system";
// الحارسُ خطّافٌ عميليّ، فيُستورد من مدخله لا من فهرس المكتبة: الفهرسُ تقرؤه مكوّناتٌ خادميّة فيكسرها `useEffect`
import { useCharsetGuard } from "@adeeb/design-system/charset";
import { Check } from "@/app/_components/glyphs";
import type { PublicQuestion } from "./SurveyRespond";
import { PHONE_LEN } from "@/lib/fieldFormats";
import { ABJAD, type AnswerValue } from "./logic";

const StarShape = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path d="M12 2.6l2.83 5.74 6.33.92-4.58 4.46 1.08 6.3L12 17.04l-5.66 2.98 1.08-6.3L2.84 9.26l6.33-.92L12 2.6z" />
  </svg>
);

/**
 * **حقولُ الكتابة: الحلّ الوسط** (المالك ٢٠٢٦-١٠-٢٠): بئرُ الهويّة بشفقه وحدّه وحلقته، أرحب وبلا أيقونة،
 * والنصُّ الطويلُ ينمو بما يُكتب فيه (هيئتُها في `.spt-in`/`.spt-ta`). ويحرسها **طقمُ المحارف نفسُه** الذي يحرس حقل الهويّة
 * (`useCharsetGuard` وهمستُه): البريدُ والرابطُ لا يقبلان العربيّة، والجوّالُ أرقامٌ فقط، ويُقال السببُ
 * لحظةَ الكتابة لا عند الإرسال.
 */
const OWN: Record<string, { type: string; placeholder: string; charset?: FieldCharset; mode?: "email" | "tel" | "url" | "numeric" }> = {
  short_text: { type: "text", placeholder: "اكتب إجابتك هنا" },
  number: { type: "number", placeholder: "0", mode: "numeric" },
  email: { type: "email", placeholder: "name@example.com", charset: "latin", mode: "email" },
  phone: { type: "tel", placeholder: "05xxxxxxxx", charset: "digits", mode: "tel" },
  url: { type: "url", placeholder: "https://", charset: "latin", mode: "url" },
  date: { type: "date", placeholder: "" },
  time: { type: "time", placeholder: "" },
  datetime: { type: "datetime-local", placeholder: "" },
};

function OwnInput({ className, q, value, invalid, labelledBy, onChange }: { className: string; q: PublicQuestion; value: AnswerValue | undefined; invalid: boolean; labelledBy: string; onChange: (v: AnswerValue | undefined) => void }) {
  const o = OWN[q.type] ?? OWN.short_text;
  const wrap = useRef<HTMLDivElement>(null);
  const { guard, whisper, leaving, hush } = useCharsetGuard<HTMLInputElement>(o.charset, undefined, (e) =>
    onChange(q.type === "number" ? (e.target.value === "" ? undefined : Number(e.target.value)) : e.target.value),
  );
  const ltr = !!o.charset || ["number", "date", "time", "datetime"].includes(q.type);
  return (
    <div ref={wrap}>
      <input
        className={className}
        type={o.type}
        inputMode={o.mode}
        dir={ltr ? "ltr" : undefined}
        placeholder={o.placeholder}
        maxLength={q.type === "phone" ? PHONE_LEN : undefined}
        aria-labelledby={labelledBy}
        aria-invalid={invalid || undefined}
        value={typeof value === "string" || typeof value === "number" ? String(value) : ""}
        {...guard}
      />
      <CharsetWhisper text={whisper} anchorRef={wrap} leaving={leaving} onHush={hush} />
    </div>
  );
}

function GrowText({ className, value, onChange, labelledBy, invalid }: { className: string; value: string; onChange: (v: string) => void; labelledBy: string; invalid: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return <textarea ref={ref} className={className} rows={3} placeholder="اكتب ما تريد قوله" value={value} aria-labelledby={labelledBy} aria-invalid={invalid || undefined} onChange={(e) => onChange(e.target.value)} />;
}

export function Answer({ p, q, value, error, onChange, labelledBy }: {
  /** بادئةُ الأصناف — هيئةُ الصفحة. */
  p: "spt";
  q: PublicQuestion;
  value: AnswerValue | undefined;
  /** خطأُ السؤال — يلوّن حدَّ الحقل، ونصُّه يُقال تحت السؤال. */
  error?: string | null;
  onChange: (v: AnswerValue | undefined) => void;
  labelledBy: string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  if (q.type === "rating_stars") {
    const max = q.scale?.max ?? 5;
    const v = typeof value === "number" ? value : 0;
    const shown = hover ?? v;
    return (
      <div className={`${p}-stars`} role="radiogroup" aria-labelledby={labelledBy} onMouseLeave={() => setHover(null)}>
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={v === n}
            aria-label={`${n} من ${max}`}
            className={cn(`${p}-star`, n <= shown && "on", n === v && "pick")}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n)}
          >
            <StarShape />
          </button>
        ))}
      </div>
    );
  }

  if (q.type === "linear_scale") {
    const min = q.scale?.min ?? 1;
    const max = q.scale?.max ?? 10;
    const v = typeof value === "number" ? value : null;
    const shown = hover ?? v;
    const n = max - min + 1;
    return (
      <div className={`${p}-meter-wrap`}>
        <div
          className={`${p}-meter`}
          role="radiogroup"
          aria-labelledby={labelledBy}
          style={{ "--m-n": n } as CSSProperties}
          onMouseLeave={() => setHover(null)}
        >
          {Array.from({ length: n }, (_, i) => min + i).map((k, i) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={v === k}
              className={cn(`${p}-mt`, shown !== null && k <= shown && "fill", v === k && "pick")}
              style={{ "--m-i": i } as CSSProperties}
              onMouseEnter={() => setHover(k)}
              onClick={() => onChange(k)}
            >
              <span>{k}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (q.type === "single_choice" || q.type === "yes_no" || q.type === "dropdown" || q.type === "multiple_choice") {
    const multi = q.type === "multiple_choice";
    const opts = q.type === "yes_no"
      ? [{ key: "yes", label: "نعم", v: true as AnswerValue }, { key: "no", label: "لا", v: false as AnswerValue }]
      : q.choices.map((c) => ({ key: c.id, label: c.label, v: c.id as AnswerValue }));
    const sel = Array.isArray(value) ? value : [];
    return (
      <div className={cn(`${p}-opts`, q.type === "yes_no" && "grid")} role={multi ? "group" : "radiogroup"} aria-labelledby={labelledBy}>
        {opts.map((o, i) => {
          const on = multi ? sel.includes(o.key) : value === o.v;
          return (
            <button
              key={o.key}
              type="button"
              role={multi ? "checkbox" : "radio"}
              aria-checked={on}
              className={cn(`${p}-opt`, on && "on")}
              style={{ "--o-i": i } as CSSProperties}
              onClick={() => (multi ? onChange(on ? sel.filter((x) => x !== o.key) : [...sel, o.key]) : onChange(o.v))}
            >
              <span className={`${p}-key`} aria-hidden>{on ? <Check /> : ABJAD[i] ?? i + 1}</span>
              <span className={`${p}-ol`}>{o.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (q.type === "long_text") {
    return <GrowText className={`${p}-ta`} value={typeof value === "string" ? value : ""} onChange={(v) => onChange(v)} labelledBy={labelledBy} invalid={!!error} />;
  }
  return <OwnInput className={`${p}-in`} q={q} value={value} invalid={!!error} labelledBy={labelledBy} onChange={onChange} />;
}
