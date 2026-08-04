"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type CSSProperties, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { useCharsetGuard } from "../lib/charset";
import { CharsetWhisper } from "./CharsetWhisper";
import { FieldMark } from "./FieldMark";
import { color } from "../../tokens";

export interface ColorFieldProps {
  /** تسمية ثابتة أعلى الحقل. */
  label: string;
  /** أيقونة هويّة بجانب التسمية — مقدّسة كسائر الحقول. */
  icon: ReactNode;
  /** القيمة `#rrggbb`. */
  value: string;
  /** لا يُستدعى إلّا بقيمةٍ صحيحة — الكتابةُ الناقصة تبقى في الحقل ولا تُبثّ. */
  onValueChange: (hex: string) => void;
  /** مراسي ألوانٍ تحت البئر. الافتراض ألوان الهوية؛ `[]` يُخفي الصفّ. */
  presets?: string[];
  helper?: string;
  required?: boolean;
  optional?: boolean;
  disabled?: boolean;
  className?: string;
}

/** مراسي الهوية — الكحليّ والفولاذيّ ودرجاتُهما، والحدّان الأبيض والأسود. */
const BRAND_PRESETS = [
  color.navy[700],
  color.navy[900],
  color.steel[500],
  color.steel[700],
  color.semantic.success,
  color.semantic.danger,
  color.semantic.warning,
  "#000000",
  "#ffffff",
];

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** `#abc` → `#aabbcc`، وكلُّ شيءٍ إلى حروفٍ صغيرة — فالمقارنة بالمرساة تصحّ. */
function normalize(hex: string): string {
  const h = hex.trim().toLowerCase();
  if (h.length === 4) return "#" + h.slice(1).split("").map((c) => c + c).join("");
  return h;
}

/**
 * **حقل اللون** — تشريحُ الحقل المقدّس نفسه (تسمية بأيقونتها · بئر · مساعدة)، إلّا أنّ
 * **المرسى اللونيّ يحلّ محلّ الأيقونة الأماميّة**: هو قيمةُ الحقل معروضةً لا رمزًا لها.
 * فالعين تقرأ اللون قبل أن تقرأ رقمه.
 *
 * **ثلاثةُ أبوابٍ للقيمة الواحدة:** المرسى يفتح لوحةَ النظام (فيها المنتقي والقطّارة)،
 * والحقلُ يقبل `#rrggbb` مكتوبًا أو ملصوقًا، والمراسي تحته تُعطي ألوان الهوية بنقرة.
 * ولا يُبَثّ إلّا الصحيح: كتابةُ `#27` نصفُ لونٍ لا يُلوَّن به شيء، فتبقى في الحقل ولا تخرج.
 *
 * **ولمَ المنتقي الأصليّ مخفيٌّ خلف المرسى؟** لوحةُ اختيار اللون سلطةُ نظامِ التشغيل — لا
 * تُبنى ولا تُنسَخ؛ فيُترَك `input[type=color]` يفتحها ويُلبَس وجهَ الهوية.
 */
export function ColorField({
  label,
  icon,
  value,
  onValueChange,
  presets = BRAND_PRESETS,
  helper,
  required,
  optional,
  disabled,
  className,
}: ColorFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  // القيمةُ قد تتغيّر من خارج الحقل (مرساة · إعادة ضبط) — فيتبعها المكتوب
  useEffect(() => setDraft(value), [value]);

  const commit = (raw: string) => {
    setDraft(raw);
    if (HEX.test(raw.trim())) onValueChange(normalize(raw));
  };
  const { guard, whisper, leaving, hush } = useCharsetGuard<HTMLInputElement>("latin", undefined, (e: ChangeEvent<HTMLInputElement>) =>
    commit(e.target.value),
  );
  const wrapRef = useRef<HTMLDivElement>(null);
  const current = normalize(value);

  return (
    <div className={cn("fld acf", className)}>
      <label className="fld-lbl" htmlFor={id}>
        <span className="fld-lic" aria-hidden="true">{icon}</span>
        {label}
        <FieldMark optional={optional} required={required} />
      </label>

      <div ref={wrapRef} className={cn("fld-wrap", whisper ? "fld-warn" : undefined)}>
        <label className="acf-sw" style={{ "--acf-c": current } as CSSProperties}>
          <input
            type="color"
            className="acf-native"
            value={current}
            disabled={disabled}
            onChange={(e) => onValueChange(e.target.value.toLowerCase())}
            aria-label={`منتقي ${label}`}
          />
        </label>
        <input
          id={id}
          className="fld-in"
          value={draft}
          dir="ltr"
          placeholder="#274060"
          disabled={disabled}
          required={required}
          onBlur={() => setDraft(value)}
          {...guard}
        />
      </div>
      <CharsetWhisper text={whisper} anchorRef={wrapRef} leaving={leaving} onHush={hush} />

      {presets.length ? (
        <div className="acf-presets">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              className="acf-chip"
              style={{ "--acf-c": p } as CSSProperties}
              disabled={disabled}
              aria-pressed={normalize(p) === current}
              aria-label={`لون ${p}`}
              onClick={() => onValueChange(normalize(p))}
            />
          ))}
        </div>
      ) : null}

      {helper ? <span className="fld-help">{helper}</span> : null}
    </div>
  );
}
